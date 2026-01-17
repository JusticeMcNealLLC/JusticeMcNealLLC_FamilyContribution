// Supabase Edge Function: create-billing-portal
// Creates a Stripe Billing Portal session for managing payment methods and cancellation

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

    // Get request body (optional flow_type)
    let flowType = null
    try {
      const body = await req.json()
      flowType = body.flow_type
    } catch {
      // No body, that's fine
    }

    // Get user's Stripe customer ID
    const { data: customerData, error: custError } = await supabase
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    if (custError || !customerData) {
      throw new Error('No billing account found')
    }

    // Create portal session config
    const portalConfig: Stripe.BillingPortal.SessionCreateParams = {
      customer: customerData.stripe_customer_id,
      return_url: `${req.headers.get('origin')}/portal/settings.html`,
    }

    // Add flow data if specified
    if (flowType === 'payment_method_update') {
      portalConfig.flow_data = {
        type: 'payment_method_update',
      }
    } else if (flowType === 'subscription_cancel') {
      // Get user's subscription to get the subscription ID
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('stripe_subscription_id')
        .eq('user_id', user.id)
        .single()

      if (subscription) {
        portalConfig.flow_data = {
          type: 'subscription_cancel',
          subscription_cancel: {
            subscription: subscription.stripe_subscription_id,
          },
        }
      }
    }

    // Create Billing Portal session
    const session = await stripe.billingPortal.sessions.create(portalConfig)

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
