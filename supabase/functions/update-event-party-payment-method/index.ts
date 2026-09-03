// Supabase Edge Function: update-event-party-payment-method
// §13.10 — Checkout setup mode to collect a new card or ACH PaymentMethod

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno&no-check'
import { resolveEventPartyByInviteOrJwt } from '../_shared/event-party-token.ts'

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

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body = await req.json().catch(() => ({}))
    const party = await resolveEventPartyByInviteOrJwt(req, body)

    const { data: plan, error: planErr } = await supabase
      .from('event_payment_plans')
      .select('id, status, stripe_customer_id, method, remaining_cents')
      .eq('party_id', party.id)
      .maybeSingle()
    if (planErr) throw new Error(planErr.message)
    if (!plan?.id) throw new Error('Payment plan not found')

    const status = String(plan.status || '')
    if (status === 'cancelled' || status === 'completed') {
      throw new Error('Payment method cannot be updated for this plan')
    }

    const meta: Record<string, string> = {
      jm_type: 'event_party_plan',
      payment_type: 'event_rsvp',
      kind: 'pm_update',
      event_id: party.event_id,
      party_id: party.id,
      plan_id: plan.id,
    }

    const origin = req.headers.get('origin') || 'https://justicemcneal.com'
    const successUrl = `${origin}/events/payments/?t=${encodeURIComponent(party.invite_token)}&updated=pm`
    const cancelUrl = `${origin}/events/payments/?t=${encodeURIComponent(party.invite_token)}&canceled=pm`

    // Prefer both methods so payer can switch card ↔ ACH
    const sessionParams: Record<string, unknown> = {
      mode: 'setup',
      payment_method_types: ['card', 'us_bank_account'],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: meta,
      setup_intent_data: {
        metadata: meta,
      },
    }

    if (plan.stripe_customer_id) {
      sessionParams.customer = String(plan.stripe_customer_id)
    } else {
      // Create a Customer so the new PM can be reused off-session
      const customer = await stripe.customers.create({
        metadata: {
          jm_type: 'event_party_plan',
          party_id: party.id,
          plan_id: plan.id,
          event_id: party.event_id,
        },
      })
      sessionParams.customer = customer.id
      await supabase
        .from('event_payment_plans')
        .update({
          stripe_customer_id: customer.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', plan.id)
    }

    // ACH Financial Connections when bank is offered
    sessionParams.payment_method_options = {
      us_bank_account: {
        financial_connections: { permissions: ['payment_method'] },
      },
    }

    const session = await stripe.checkout.sessions.create(sessionParams as any)

    return json({
      checkout_url: session.url,
      plan_id: plan.id,
    })
  } catch (error) {
    console.error('update-event-party-payment-method error:', error)
    return json({ error: (error as Error).message || 'Update payment method failed' }, 400)
  }
})
