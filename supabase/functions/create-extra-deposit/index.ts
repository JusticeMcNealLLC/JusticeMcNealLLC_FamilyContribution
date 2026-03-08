// Supabase Edge Function: create-extra-deposit
// Creates a Stripe Checkout Session for a one-time extra deposit

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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify the JWT and get user
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (userError || !user) {
      throw new Error('Invalid token')
    }

    // Get request body
    const { amount_dollars } = await req.json()

    // Validate amount ($5 – $500 for one-time deposits)
    if (!amount_dollars || amount_dollars < 5 || amount_dollars > 500) {
      throw new Error('Amount must be between $5 and $500')
    }

    if (amount_dollars !== Math.floor(amount_dollars)) {
      throw new Error('Amount must be a whole dollar amount')
    }

    const amountCents = amount_dollars * 100

    // Require an active subscription — extra deposits are for members only
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('id, status')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing', 'past_due'])
      .maybeSingle()

    if (!existingSubscription) {
      throw new Error('You need an active subscription before making extra deposits. Please set up your monthly contribution first.')
    }

    // Get or create Stripe customer
    let stripeCustomerId: string

    const { data: existingCustomer } = await supabase
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    if (existingCustomer) {
      stripeCustomerId = existingCustomer.stripe_customer_id
    } else {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      })

      stripeCustomerId = customer.id

      // Save to database
      await supabase.from('stripe_customers').insert({
        user_id: user.id,
        stripe_customer_id: stripeCustomerId,
      })
    }

    // Create one-time Checkout Session (mode: 'payment')
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Extra Deposit — Justice McNeal LLC',
              description: `One-time contribution of $${amount_dollars}`,
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/portal/index.html?extra_deposit=true`,
      cancel_url: `${req.headers.get('origin')}/portal/extra-deposit.html?canceled=true`,
      metadata: {
        supabase_user_id: user.id,
        payment_type: 'extra_deposit',
        amount_dollars: String(amount_dollars),
      },
    })

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
