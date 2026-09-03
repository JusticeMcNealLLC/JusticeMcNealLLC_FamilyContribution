// Supabase Edge Function: request-event-party-payoff
// §13.10 — Early payoff: charge remaining, cancel future schedule

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno&no-check'
import { preparePartyPayoffInstallment } from '../_shared/event-party-payoff.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') as string

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
    const inviteToken = String(body.invite_token || '').trim()
    const planIdBody = String(body.plan_id || '').trim()
    const partyIdBody = String(body.party_id || '').trim()

    let party: Record<string, unknown> | null = null
    let authUserId: string | null = null

    if (inviteToken) {
      const { data, error } = await supabase
        .from('event_parties')
        .select('id, event_id, payer_user_id, invite_token, status')
        .eq('invite_token', inviteToken)
        .maybeSingle()
      if (error) throw new Error(error.message)
      if (!data?.id) throw new Error('invalid_token')
      party = data
    } else {
      const authHeader = req.headers.get('Authorization') || ''
      if (!authHeader) throw new Error('Authorization or invite_token required')
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      })
      const { data: userData, error: userErr } = await userClient.auth.getUser()
      if (userErr || !userData?.user) throw new Error('Not signed in')
      authUserId = userData.user.id

      let q = supabase
        .from('event_parties')
        .select('id, event_id, payer_user_id, invite_token, status')
        .eq('payer_user_id', authUserId)
      if (partyIdBody) q = q.eq('id', partyIdBody)
      else if (planIdBody) {
        const { data: planRow } = await supabase
          .from('event_payment_plans')
          .select('party_id')
          .eq('id', planIdBody)
          .maybeSingle()
        if (!planRow?.party_id) throw new Error('Payment plan not found')
        q = q.eq('id', planRow.party_id)
      } else {
        throw new Error('party_id or plan_id required when using JWT')
      }
      const { data, error } = await q.maybeSingle()
      if (error) throw new Error(error.message)
      if (!data?.id) throw new Error('Not authorized for this party')
      party = data
    }

    const { data: plan, error: planLookupErr } = await supabase
      .from('event_payment_plans')
      .select('id')
      .eq('party_id', party!.id)
      .maybeSingle()
    if (planLookupErr) throw new Error(planLookupErr.message)
    if (!plan?.id) throw new Error('Payment plan not found')
    if (planIdBody && planIdBody !== plan.id) throw new Error('plan_id does not match party')

    const prep = await preparePartyPayoffInstallment(supabase, { planId: plan.id })

    const meta: Record<string, string> = {
      jm_type: 'event_party_plan',
      payment_type: 'event_rsvp',
      kind: 'payoff',
      jm_payoff: '1',
      event_id: prep.event_id,
      party_id: prep.party_id,
      plan_id: prep.plan_id,
      installment_id: prep.installment_id,
      method: prep.method,
    }

    const pmTypes = prep.method === 'card' ? ['card'] : ['us_bank_account']
    const origin = req.headers.get('origin') || 'https://justicemcneal.com'
    const slug = prep.event_slug || ''
    const successUrl = slug
      ? `${origin}/events/?e=${encodeURIComponent(slug)}&paid=payoff`
      : `${origin}/portal/events.html?paid=payoff&event=${prep.event_id}`
    const cancelUrl = slug
      ? `${origin}/events/?e=${encodeURIComponent(slug)}&canceled=payoff`
      : `${origin}/portal/events.html?canceled=payoff&event=${prep.event_id}`

    // Prefer off-session charge when Customer + PM are on file
    if (prep.stripe_customer_id && prep.stripe_payment_method_id) {
      try {
        const pi = await stripe.paymentIntents.create({
          amount: prep.remaining_cents,
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
            status: pi.status === 'succeeded' ? 'processing' : (
              pi.status === 'processing' ? 'processing' : 'pending'
            ),
            updated_at: new Date().toISOString(),
          })
          .eq('id', prep.installment_id)

        if (pi.status === 'succeeded' || pi.status === 'processing') {
          return json({
            status: pi.status,
            installment_id: prep.installment_id,
            payment_intent_id: pi.id,
            remaining_cents: prep.remaining_cents,
          })
        }
        // requires_action / other → Checkout fallback
      } catch (offErr) {
        console.error('Off-session payoff failed, falling back to Checkout:', offErr)
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
              name: 'Event payment payoff',
              description: 'Pay remaining balance',
            },
            unit_amount: prep.remaining_cents,
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
    if (prep.method === 'ach' || prep.method === 'card') {
      sessionParams.payment_intent_data = {
        setup_future_usage: 'off_session',
        metadata: meta,
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams as any)

    return json({
      checkout_url: session.url,
      installment_id: prep.installment_id,
      remaining_cents: prep.remaining_cents,
    })
  } catch (error) {
    console.error('request-event-party-payoff error:', error)
    return json({ error: (error as Error).message || 'Payoff failed' }, 400)
  }
})
