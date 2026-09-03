// Supabase Edge Function: process-event-cancellation
// Status-only event cancellation (§13.10 line 442 — no in-app Stripe refunds)
// Handles: event_cancelled, min_not_met, manual, admin_override (status only)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const NO_IN_APP_REFUNDS =
  'In-app refunds are disabled. Process exceptions in Stripe Dashboard.'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Authorization required')

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) throw new Error('Unauthorized')

    const body = await req.json()
    const {
      event_id,
      reason,
      cancellation_note = '',
      single_user_refund = false,
    } = body

    if (!event_id) throw new Error('event_id is required')
    if (!reason) throw new Error('reason is required')

    // Grace / single-user refunds are permanently disabled in-app
    if (single_user_refund) {
      return new Response(
        JSON.stringify({ error: NO_IN_APP_REFUNDS }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const { data: event, error: eventErr } = await supabase
      .from('events')
      .select('*')
      .eq('id', event_id)
      .single()
    if (eventErr || !event) throw new Error('Event not found')

    const { data: hasEventPerm } = await supabase.rpc('user_has_permission', {
      uid: user.id,
      perm: 'events.manage_all',
    })

    const isCreator = event.created_by === user.id

    const { data: hostCheck } = await supabase
      .from('event_hosts')
      .select('id')
      .eq('event_id', event_id)
      .eq('user_id', user.id)
      .maybeSingle()

    const isHost = isCreator || !!hostCheck || !!hasEventPerm
    if (!isHost) {
      throw new Error('Only hosts or users with events.manage_all permission can process cancellations')
    }

    // Status-only cancel — no stripe.refunds.create
    const updateData: Record<string, unknown> = {
      status: 'cancelled',
      cancellation_note: cancellation_note || 'Event cancelled',
    }

    const { error: updErr } = await supabase
      .from('events')
      .update(updateData)
      .eq('id', event_id)
    if (updErr) throw new Error(updErr.message)

    await supabase
      .from('event_waitlist')
      .update({ status: 'removed' })
      .eq('event_id', event_id)
      .in('status', ['waiting', 'offered'])

    const message =
      'Event cancelled. Payments are not refunded in-app — manager-approved exceptions use Stripe Dashboard (out-of-band).'

    return new Response(
      JSON.stringify({ success: true, message, refunds: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err: any) {
    console.error('process-event-cancellation error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
