// Supabase Edge Function: create-bank-setup-session
// Checkout setup mode to link a bank account (ACH) for the member's monthly contribution.
// The stripe-webhook makes it the subscription's default once the account is verified.

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
    if (!authHeader) throw new Error('No authorization header')

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) throw new Error('Invalid token')

    // manual: skip bank login and verify with microdeposits (for banks Financial Connections can't read)
    const body = await req.json().catch(() => ({}))
    const manual = body?.manual === true

    const { data: customerRow } = await supabase
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (!customerRow?.stripe_customer_id) throw new Error('No billing account found')

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing', 'past_due'])
      .maybeSingle()
    if (!subscription?.stripe_subscription_id) {
      throw new Error('You need an active monthly contribution before linking a bank account.')
    }

    const meta = {
      jm_type: 'contribution_pm_update',
      supabase_user_id: user.id,
      subscription_id: subscription.stripe_subscription_id,
    }

    const origin = req.headers.get('origin') || 'https://justicemcneal.com'
    const session = await stripe.checkout.sessions.create({
      mode: 'setup',
      customer: customerRow.stripe_customer_id,
      payment_method_types: ['us_bank_account'],
      payment_method_options: {
        us_bank_account: {
          verification_method: manual ? 'microdeposits' : 'automatic',
          ...(manual ? {} : { financial_connections: { permissions: ['payment_method'] } }),
        },
      },
      success_url: `${origin}/pages/portal/settings.html?bank=submitted`,
      cancel_url: `${origin}/pages/portal/settings.html?bank=canceled`,
      metadata: meta,
      setup_intent_data: { metadata: meta },
    } as any)

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('create-bank-setup-session error:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
