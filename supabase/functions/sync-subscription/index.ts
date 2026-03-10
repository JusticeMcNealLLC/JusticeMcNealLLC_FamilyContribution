// Supabase Edge Function: sync-subscription
// Fetches live subscription data from Stripe and backfills the DB row.
// Called by the admin "Sync from Stripe" button.

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

    // Verify the caller is an admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing auth header')
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !user) throw new Error('Unauthorized')

    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (callerProfile?.role !== 'admin') throw new Error('Admin only')

    const { userId } = await req.json()
    if (!userId) throw new Error('userId is required')

    // Get the stripe_subscription_id from the DB
    const { data: sub, error: subErr } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', userId)
      .maybeSingle()

    if (subErr) throw subErr
    if (!sub?.stripe_subscription_id) {
      throw new Error('No Stripe subscription ID found for this user.')
    }

    // Fetch live data from Stripe
    const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id)

    const periodEnd = stripeSub.current_period_end
      ? new Date(stripeSub.current_period_end * 1000).toISOString()
      : null

    const amountCents = stripeSub.items?.data?.[0]?.price?.unit_amount ?? null

    // Update the DB row
    const { error: updateErr } = await supabase
      .from('subscriptions')
      .update({
        status: stripeSub.status,
        current_period_end: periodEnd,
        cancel_at_period_end: stripeSub.cancel_at_period_end,
        ...(amountCents !== null ? { current_amount_cents: amountCents } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)

    if (updateErr) throw updateErr

    return new Response(
      JSON.stringify({
        success: true,
        current_period_end: periodEnd,
        status: stripeSub.status,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (err) {
    console.error('sync-subscription error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
