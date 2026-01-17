// Supabase Edge Function: create-checkout-session
// Creates a Stripe Checkout Session for new subscriptions

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@13.6.0?target=deno'

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

    // Validate amount
    if (!amount_dollars || amount_dollars < 30 || amount_dollars > 250) {
      throw new Error('Amount must be between $30 and $250')
    }

    if (amount_dollars !== Math.floor(amount_dollars)) {
      throw new Error('Amount must be a whole dollar amount')
    }

    const amountCents = amount_dollars * 100

    // Check if user already has an active subscription
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('id, status')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing', 'past_due'])
      .maybeSingle()

    if (existingSubscription) {
      throw new Error('You already have an active subscription. Use the Change Amount page to modify your contribution.')
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

    // Get or create price for this amount
    const priceId = await getOrCreatePrice(amountCents)

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.get('origin')}/portal/index.html?success=true`,
      cancel_url: `${req.headers.get('origin')}/portal/contribution.html?canceled=true`,
      metadata: {
        supabase_user_id: user.id,
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

// Helper: Get or create a Stripe Price for the given amount
async function getOrCreatePrice(amountCents: number): Promise<string> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const productId = Deno.env.get('STRIPE_PRODUCT_ID') as string

  // Check if we already have this price cached
  const { data: existingPrice } = await supabase
    .from('stripe_prices')
    .select('stripe_price_id')
    .eq('amount_cents', amountCents)
    .single()

  if (existingPrice) {
    return existingPrice.stripe_price_id
  }

  // Create new price in Stripe
  const price = await stripe.prices.create({
    unit_amount: amountCents,
    currency: 'usd',
    recurring: { interval: 'month' },
    product: productId,
    metadata: {
      amount_dollars: amountCents / 100,
    },
  })

  // Cache it in our database
  await supabase.from('stripe_prices').insert({
    amount_cents: amountCents,
    stripe_price_id: price.id,
  })

  return price.id
}
