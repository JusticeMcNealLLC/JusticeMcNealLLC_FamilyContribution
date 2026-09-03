// Supabase Edge Function: retry-event-party-payment
// §13.10 — Retry latest failed installment via Checkout / off-session PI

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno&no-check'
import { resolveEventPartyByInviteOrJwt } from '../_shared/event-party-token.ts'
import { preparePartyRetryInstallment } from '../_shared/event-party-retry.ts'

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

    const { data: planRow, error: planLookupErr } = await supabase
      .from('event_payment_plans')
      .select('id')
      .eq('party_id', party.id)
      .maybeSingle()
    if (planLookupErr) throw new Error(planLookupErr.message)
    if (!planRow?.id) throw new Error('Payment plan not found')
    if (body.plan_id && String(body.plan_id).trim() !== planRow.id) {
      throw new Error('plan_id does not match party')
    }

    const prep = await preparePartyRetryInstallment(supabase, { planId: planRow.id })

    const meta: Record<string, string> = {
      jm_type: 'event_party_plan',
      payment_type: 'event_rsvp',
      kind: 'retry',
      event_id: prep.event_id,
      party_id: prep.party_id,
      plan_id: prep.plan_id,
      installment_id: prep.installment_id,
      method: prep.method,
    }

    const pmTypes = prep.method === 'card' ? ['card'] : ['us_bank_account']
    const origin = req.headers.get('origin') || 'https://justicemcneal.com'
    const successUrl = `${origin}/events/payments/?t=${encodeURIComponent(party.invite_token)}&paid=retry`
    const cancelUrl = `${origin}/events/payments/?t=${encodeURIComponent(party.invite_token)}&canceled=retry`

    if (prep.stripe_customer_id && prep.stripe_payment_method_id) {
      try {
        const pi = await stripe.paymentIntents.create({
          amount: prep.amount_cents,
          currency: 'usd',
          customer: prep.stripe_customer_id,
          payment_method: prep.stripe_payment_method_id,
          payment_method_types: pmTypes,
          confirm: true,
          off_session: true,
          metadata: meta,
        })

        await supabase
          .from('event_payment_installments')
          .update({
            stripe_payment_intent_id: pi.id,
            status: pi.status === 'succeeded' || pi.status === 'processing'
              ? 'processing'
              : 'pending',
            updated_at: new Date().toISOString(),
          })
          .eq('id', prep.installment_id)

        if (pi.status === 'succeeded' || pi.status === 'processing') {
          return json({
            status: pi.status,
            installment_id: prep.installment_id,
            payment_intent_id: pi.id,
            amount_cents: prep.amount_cents,
          })
        }
      } catch (offErr) {
        console.error('Off-session retry failed, falling back to Checkout:', offErr)
      }
    }

    const sessionParams: Record<string, unknown> = {
      payment_method_types: pmTypes,
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Event payment retry',
              description: 'Retry failed installment',
            },
            unit_amount: prep.amount_cents,
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: meta,
    }
    if (prep.stripe_customer_id) {
      sessionParams.customer = prep.stripe_customer_id
    }
    sessionParams.payment_intent_data = {
      setup_future_usage: 'off_session',
      metadata: meta,
    }

    const session = await stripe.checkout.sessions.create(sessionParams as any)

    return json({
      checkout_url: session.url,
      installment_id: prep.installment_id,
      amount_cents: prep.amount_cents,
    })
  } catch (error) {
    console.error('retry-event-party-payment error:', error)
    return json({ error: (error as Error).message || 'Retry failed' }, 400)
  }
})
