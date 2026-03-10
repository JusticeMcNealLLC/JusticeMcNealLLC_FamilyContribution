// Supabase Edge Function: send-payout
// Admin-only: creates a Stripe Transfer to a member's Connect account
// and records the payout in the payouts ledger.

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
    // Authenticate
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No authorization header')

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) throw new Error('Invalid token')

    // Verify admin role
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!adminProfile || adminProfile.role !== 'admin') {
      throw new Error('Admin access required')
    }

    // Check global payouts toggle + reserve setting
    const { data: appSettings } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', ['payouts_enabled', 'payout_reserve_cents'])

    const settingsMap: Record<string, any> = {}
    for (const s of appSettings || []) settingsMap[s.key] = s.value

    if (settingsMap.payouts_enabled !== true) {
      throw new Error('Payouts are currently disabled')
    }

    const reserveCents: number = typeof settingsMap.payout_reserve_cents === 'number'
      ? settingsMap.payout_reserve_cents
      : 20000 // default $200

    // Parse request body
    const { user_id, amount_cents, payout_type, reason } = await req.json()

    if (!user_id) throw new Error('user_id is required')
    if (!amount_cents || amount_cents < 100) throw new Error('amount_cents must be at least 100 ($1.00)')
    if (!payout_type) throw new Error('payout_type is required')

    // Get recipient profile
    const { data: recipient } = await supabase
      .from('profiles')
      .select('stripe_connect_account_id, connect_onboarding_complete, first_name, last_name, payout_enrolled')
      .eq('id', user_id)
      .single()

    if (!recipient) throw new Error('Recipient not found')
    if (!recipient.stripe_connect_account_id) throw new Error('Recipient has not linked a bank account')
    if (!recipient.connect_onboarding_complete) throw new Error('Recipient has not completed Connect onboarding')

    // Check enrollment for this payout type
    const { data: enrollment } = await supabase
      .from('payout_enrollments')
      .select('enrolled')
      .eq('user_id', user_id)
      .eq('payout_type', payout_type)
      .single()

    if (enrollment && !enrollment.enrolled) {
      throw new Error(`Recipient has opted out of ${payout_type} payouts`)
    }

    // Check platform Stripe balance against reserve threshold
    const balance = await stripe.balance.retrieve()
    const availableCents = balance.available.find((b: any) => b.currency === 'usd')?.amount ?? 0
    const afterPayout = availableCents - amount_cents

    if (afterPayout < reserveCents) {
      const availStr = `$${(availableCents / 100).toFixed(2)}`
      const reserveStr = `$${(reserveCents / 100).toFixed(2)}`
      const payoutStr = `$${(amount_cents / 100).toFixed(2)}`
      throw new Error(
        `Insufficient platform balance. Available: ${availStr}, payout: ${payoutStr}, ` +
        `minimum reserve: ${reserveStr}. Add funds to your Stripe balance before sending this payout.`
      )
    }

    // Insert pending payout record
    const { data: payout, error: insertError } = await supabase
      .from('payouts')
      .insert({
        user_id,
        amount_cents,
        payout_type,
        reason: reason || null,
        status: 'processing',
        created_by: user.id,
      })
      .select()
      .single()

    if (insertError) throw insertError

    // Create Stripe Transfer
    try {
      const transfer = await stripe.transfers.create({
        amount: amount_cents,
        currency: 'usd',
        destination: recipient.stripe_connect_account_id,
        description: `${payout_type}: ${reason || 'Family payout'}`,
        metadata: {
          payout_id: payout.id,
          supabase_user_id: user_id,
          payout_type,
        },
      })

      // Update payout with transfer ID and mark completed
      await supabase
        .from('payouts')
        .update({
          stripe_transfer_id: transfer.id,
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', payout.id)

      return new Response(
        JSON.stringify({
          success: true,
          payout_id: payout.id,
          transfer_id: transfer.id,
          amount_cents,
          recipient: `${recipient.first_name} ${recipient.last_name}`,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    } catch (stripeError) {
      // Stripe transfer failed — mark payout as failed
      await supabase
        .from('payouts')
        .update({
          status: 'failed',
          error_message: stripeError.message,
        })
        .eq('id', payout.id)

      throw new Error(`Stripe transfer failed: ${stripeError.message}`)
    }
  } catch (error) {
    console.error('Send payout error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
