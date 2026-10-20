// Supabase Edge Function: create-bank-setup-session
// Links a bank account (ACH) for the member's monthly contribution: Checkout setup mode for
// instant bank login, or a confirmed SetupIntent for manually entered details (microdeposits).
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

    // manual: routing/account entered on our form, verified with microdeposits.
    // Checkout only allows automatic|instant, so manual entry confirms a SetupIntent directly.
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

    if (manual) {
      const routing = String(body.routing_number || '').replace(/\D/g, '')
      const account = String(body.account_number || '').replace(/\D/g, '')
      const holderName = String(body.account_holder_name || '').trim()
      const accountType = body.account_type === 'savings' ? 'savings' : 'checking'
      if (routing.length !== 9) throw new Error('Routing number must be 9 digits.')
      if (account.length < 4 || account.length > 17) throw new Error('Enter a valid account number.')
      if (!holderName) throw new Error('Enter the name on the bank account.')

      const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim()
      const setupIntent = await stripe.setupIntents.create({
        customer: customerRow.stripe_customer_id,
        payment_method_types: ['us_bank_account'],
        payment_method_data: {
          type: 'us_bank_account',
          us_bank_account: {
            routing_number: routing,
            account_number: account,
            account_holder_type: 'individual',
            account_type: accountType,
          },
          billing_details: { name: holderName, email: user.email },
        },
        payment_method_options: {
          us_bank_account: { verification_method: 'microdeposits' },
        },
        mandate_data: {
          customer_acceptance: {
            type: 'online',
            online: {
              ip_address: ip || '0.0.0.0',
              user_agent: req.headers.get('user-agent') || 'unknown',
            },
          },
        },
        usage: 'off_session',
        confirm: true,
        metadata: meta,
      } as any)

      return new Response(JSON.stringify({
        status: setupIntent.status,
        verification_url: (setupIntent.next_action as any)?.verify_with_microdeposits?.hosted_verification_url || null,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const origin = req.headers.get('origin') || 'https://justicemcneal.com'
    const session = await stripe.checkout.sessions.create({
      mode: 'setup',
      customer: customerRow.stripe_customer_id,
      payment_method_types: ['us_bank_account'],
      payment_method_options: {
        us_bank_account: {
          verification_method: 'automatic',
          financial_connections: { permissions: ['payment_method'] },
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
