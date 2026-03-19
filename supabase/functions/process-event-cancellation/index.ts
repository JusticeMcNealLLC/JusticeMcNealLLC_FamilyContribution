// Supabase Edge Function: process-event-cancellation
// Processes event cancellation, rescheduling grace refunds, and partial refunds
// Handles: event_cancelled, min_not_met, reschedule_grace, manual, admin_override

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno&no-check'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Auth required — must be host/admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Authorization required')

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) throw new Error('Unauthorized')

    const body = await req.json()
    const {
      event_id,
      reason,                          // event_cancelled | min_not_met | reschedule_grace | manual | admin_override
      cancellation_note = '',
      non_refundable_expenses_cents = 0,
      single_user_refund = false,       // true for individual grace refunds
      user_id: target_user_id,          // for single_user_refund
    } = body

    if (!event_id) throw new Error('event_id is required')
    if (!reason) throw new Error('reason is required')

    // Load event
    const { data: event, error: eventErr } = await supabase
      .from('events')
      .select('*')
      .eq('id', event_id)
      .single()
    if (eventErr || !event) throw new Error('Event not found')

    // Verify host or admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.role === 'admin'
    const isCreator = event.created_by === user.id

    const { data: hostCheck } = await supabase
      .from('event_hosts')
      .select('id')
      .eq('event_id', event_id)
      .eq('user_id', user.id)
      .maybeSingle()

    const isHost = isCreator || !!hostCheck || isAdmin
    if (!isHost) throw new Error('Only hosts or admins can process cancellations')

    // ─── Single User Refund (Grace Window) ─────────────────
    if (single_user_refund && target_user_id) {
      // Verify grace window is active
      if (!event.grace_window_end || new Date(event.grace_window_end) <= new Date()) {
        throw new Error('The 72-hour grace window has expired')
      }

      // Find the user's paid RSVP
      const { data: rsvp } = await supabase
        .from('event_rsvps')
        .select('*')
        .eq('event_id', event_id)
        .eq('user_id', target_user_id)
        .eq('paid', true)
        .maybeSingle()

      if (!rsvp) throw new Error('No paid RSVP found for this user')
      if (rsvp.refunded) throw new Error('This RSVP has already been refunded')
      if (!rsvp.stripe_payment_intent_id) throw new Error('No payment intent found for refund')

      // Full refund via Stripe
      const refund = await stripe.refunds.create({
        payment_intent: rsvp.stripe_payment_intent_id,
        reason: 'requested_by_customer',
      })

      // Record refund
      await supabase.from('event_refunds').insert({
        event_id,
        user_id: target_user_id,
        original_amount_cents: rsvp.amount_paid_cents || event.rsvp_cost_cents,
        refund_amount_cents: rsvp.amount_paid_cents || event.rsvp_cost_cents,
        deduction_cents: 0,
        reason: 'reschedule_grace',
        stripe_refund_id: refund.id,
        stripe_payment_intent_id: rsvp.stripe_payment_intent_id,
        status: 'processed',
        notes: 'Grace window refund after event rescheduling',
      })

      // Mark RSVP as refunded and status = not_going
      await supabase
        .from('event_rsvps')
        .update({
          refunded: true,
          status: 'not_going',
          grace_refund_eligible: false,
        })
        .eq('id', rsvp.id)

      return new Response(
        JSON.stringify({ success: true, message: 'Full refund processed. You will receive it within 5-10 business days.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ─── Full Event Cancellation ───────────────────────────
    // Get all paid RSVPs that haven't been refunded
    const { data: paidRsvps } = await supabase
      .from('event_rsvps')
      .select('*')
      .eq('event_id', event_id)
      .eq('paid', true)
      .eq('refunded', false)

    const rsvpsToRefund = paidRsvps || []
    const totalPaidAttendees = rsvpsToRefund.length

    // Calculate per-person deduction if non-refundable expenses
    let perPersonDeduction = 0
    if (non_refundable_expenses_cents > 0 && totalPaidAttendees > 0) {
      perPersonDeduction = Math.floor(non_refundable_expenses_cents / totalPaidAttendees)
    }

    // Process refunds for each paid attendee
    const refundResults: any[] = []
    let totalRefunded = 0
    let totalFailed = 0

    for (const rsvp of rsvpsToRefund) {
      const originalAmount = rsvp.amount_paid_cents || event.rsvp_cost_cents || 0
      const refundAmount = Math.max(0, originalAmount - perPersonDeduction)

      if (refundAmount <= 0 || !rsvp.stripe_payment_intent_id) {
        // No refund needed or no payment intent
        refundResults.push({ user_id: rsvp.user_id, status: 'skipped', reason: 'no_refund_needed' })
        continue
      }

      try {
        // Issue Stripe refund (partial if deductions)
        const refundParams: any = {
          payment_intent: rsvp.stripe_payment_intent_id,
          reason: 'requested_by_customer',
        }
        // Only set amount if partial refund
        if (perPersonDeduction > 0) {
          refundParams.amount = refundAmount
        }

        const stripeRefund = await stripe.refunds.create(refundParams)

        // Record in event_refunds
        await supabase.from('event_refunds').insert({
          event_id,
          user_id: rsvp.user_id,
          guest_email: rsvp.guest_email || null,
          original_amount_cents: originalAmount,
          refund_amount_cents: refundAmount,
          deduction_cents: perPersonDeduction,
          reason,
          stripe_refund_id: stripeRefund.id,
          stripe_payment_intent_id: rsvp.stripe_payment_intent_id,
          status: 'processed',
          notes: cancellation_note || null,
        })

        // Mark RSVP as refunded
        await supabase
          .from('event_rsvps')
          .update({ refunded: true, status: 'not_going' })
          .eq('id', rsvp.id)

        totalRefunded++
        refundResults.push({ user_id: rsvp.user_id, status: 'processed', amount: refundAmount })
      } catch (refundErr: any) {
        console.error(`Refund failed for user ${rsvp.user_id}:`, refundErr)
        totalFailed++

        // Record failed refund
        await supabase.from('event_refunds').insert({
          event_id,
          user_id: rsvp.user_id,
          original_amount_cents: originalAmount,
          refund_amount_cents: refundAmount,
          deduction_cents: perPersonDeduction,
          reason,
          stripe_payment_intent_id: rsvp.stripe_payment_intent_id,
          status: 'failed',
          notes: `Refund failed: ${refundErr.message}`,
        })

        refundResults.push({ user_id: rsvp.user_id, status: 'failed', error: refundErr.message })
      }
    }

    // Update event status to cancelled
    const updateData: any = {
      status: 'cancelled',
      cancellation_note: cancellation_note || 'Event cancelled',
    }
    if (non_refundable_expenses_cents > 0) {
      updateData.non_refundable_expenses_cents = non_refundable_expenses_cents
    }

    await supabase.from('events').update(updateData).eq('id', event_id)

    // Remove waitlisted users
    await supabase.from('event_waitlist').update({ status: 'removed' }).eq('event_id', event_id).in('status', ['waiting', 'offered'])

    // Build response message
    let message = 'Event cancelled.'
    if (totalRefunded > 0 || totalFailed > 0) {
      message = `Event cancelled. ${totalRefunded} refund${totalRefunded !== 1 ? 's' : ''} processed`
      if (perPersonDeduction > 0) {
        message += ` (${(perPersonDeduction / 100).toFixed(2)} deducted per person for non-refundable expenses)`
      }
      if (totalFailed > 0) {
        message += `. ${totalFailed} refund${totalFailed !== 1 ? 's' : ''} failed — please process manually.`
      } else {
        message += '.'
      }
    }

    return new Response(
      JSON.stringify({ success: true, message, refund_results: refundResults }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    console.error('process-event-cancellation error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
