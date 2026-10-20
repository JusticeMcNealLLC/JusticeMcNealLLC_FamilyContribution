// Supabase Edge Function: get-payment-method
// Returns the payment method the member's monthly contribution charges, plus any manually
// entered bank account still waiting on microdeposit verification.

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

function describe(pm: Stripe.PaymentMethod | null) {
  if (!pm) return null
  if (pm.type === 'card' && pm.card) {
    return { type: 'card', brand: pm.card.brand, last4: pm.card.last4 }
  }
  if (pm.type === 'us_bank_account' && pm.us_bank_account) {
    return { type: 'bank', bank_name: pm.us_bank_account.bank_name, last4: pm.us_bank_account.last4 }
  }
  return { type: pm.type }
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

    const { data: customerRow } = await supabase
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (!customerRow?.stripe_customer_id) {
      return new Response(JSON.stringify({ current: null, pending: null }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }
    const customerId = customerRow.stripe_customer_id

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing', 'past_due'])
      .maybeSingle()

    let pm: Stripe.PaymentMethod | null = null
    if (subscription?.stripe_subscription_id) {
      const sub = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id, {
        expand: ['default_payment_method'],
      })
      pm = sub.default_payment_method as Stripe.PaymentMethod | null
    }
    if (!pm) {
      const customer = await stripe.customers.retrieve(customerId, {
        expand: ['invoice_settings.default_payment_method'],
      }) as Stripe.Customer
      pm = (customer.invoice_settings?.default_payment_method as Stripe.PaymentMethod | null) ?? null
    }

    const setupIntents = await stripe.setupIntents.list({
      customer: customerId,
      limit: 10,
      expand: ['data.payment_method'],
    })
    const waiting = setupIntents.data.find((si) =>
      si.status === 'requires_action' &&
      si.metadata?.jm_type === 'contribution_pm_update' &&
      si.next_action?.type === 'verify_with_microdeposits'
    )
    const pending = waiting
      ? {
          ...describe(waiting.payment_method as Stripe.PaymentMethod),
          verification_url: (waiting.next_action as any)?.verify_with_microdeposits?.hosted_verification_url || null,
        }
      : null

    return new Response(JSON.stringify({ current: describe(pm), pending }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('get-payment-method error:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
