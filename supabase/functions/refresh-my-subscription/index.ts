// Supabase Edge Function: refresh-my-subscription
// Fetches live subscription data from Stripe for the authenticated member.

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
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing auth header')

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !user) throw new Error('Unauthorized')

    const { data: sub, error: subErr } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (subErr) throw subErr
    if (!sub?.stripe_subscription_id) {
      throw new Error('No Stripe subscription found')
    }

    const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id)

    const periodEnd = stripeSub.current_period_end
      ? new Date(stripeSub.current_period_end * 1000).toISOString()
      : null

    const amountCents = stripeSub.items?.data?.[0]?.price?.unit_amount ?? null

    const { error: updateErr } = await supabase
      .from('subscriptions')
      .update({
        status: stripeSub.status,
        current_period_end: periodEnd,
        cancel_at_period_end: stripeSub.cancel_at_period_end,
        ...(amountCents !== null ? { current_amount_cents: amountCents } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)

    if (updateErr) throw updateErr

    return new Response(
      JSON.stringify({
        success: true,
        status: stripeSub.status,
        current_period_end: periodEnd,
        cancel_at_period_end: stripeSub.cancel_at_period_end,
        current_amount_cents: amountCents,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    )
  } catch (err) {
    console.error('refresh-my-subscription error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
    )
  }
})
