// Supabase Edge Function: stripe-webhook
// Handles all incoming Stripe webhook events

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno&no-check'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') as string

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return new Response('No signature', { status: 400 })
  }

  try {
    const body = await req.text()
    
    // Verify webhook signature (use async version for Deno)
    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Processing webhook event:', event.type)

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(supabase, event.data.object)
        break

      case 'customer.subscription.created':
        await handleSubscriptionCreated(supabase, event.data.object)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(supabase, event.data.object)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(supabase, event.data.object)
        break

      case 'invoice.paid':
        await handleInvoicePaid(supabase, event.data.object)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(supabase, event.data.object)
        break

      case 'customer.updated':
        // Could track card updates here if needed
        console.log('Customer updated:', event.data.object.id)
        break

      default:
        console.log('Unhandled event type:', event.type)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400 }
    )
  }
})

// Handler: Checkout session completed
async function handleCheckoutCompleted(supabase: any, session: Stripe.Checkout.Session) {
  console.log('Checkout completed:', session.id)
  
  // The subscription.created event will handle the actual subscription creation
  // This is just for logging/confirmation
}

// Handler: Subscription created
async function handleSubscriptionCreated(supabase: any, subscription: Stripe.Subscription) {
  console.log('Subscription created:', subscription.id)

  // Get user ID from customer
  const userId = await getUserIdFromCustomer(supabase, subscription.customer as string)
  if (!userId) {
    console.error('Could not find user for customer:', subscription.customer)
    return
  }

  // Get the current price amount
  const priceAmount = subscription.items.data[0]?.price?.unit_amount || 0

  // Safely handle dates
  const periodEnd = subscription.current_period_end 
    ? new Date(subscription.current_period_end * 1000).toISOString() 
    : null

  // Upsert subscription record
  const { error } = await supabase.from('subscriptions').upsert({
    user_id: userId,
    stripe_subscription_id: subscription.id,
    status: subscription.status,
    current_amount_cents: priceAmount,
    currency: subscription.currency || 'usd',
    current_period_end: periodEnd,
    cancel_at_period_end: subscription.cancel_at_period_end || false,
  }, {
    onConflict: 'user_id',
  })

  if (error) {
    console.error('Error upserting subscription:', error)
  }
}

// Handler: Subscription updated
async function handleSubscriptionUpdated(supabase: any, subscription: Stripe.Subscription) {
  console.log('Subscription updated:', subscription.id)
  console.log('current_period_end raw:', subscription.current_period_end)

  // Get user ID from customer
  const userId = await getUserIdFromCustomer(supabase, subscription.customer as string)
  if (!userId) {
    console.error('Could not find user for customer:', subscription.customer)
    return
  }

  // Get the current price amount
  const priceAmount = subscription.items.data[0]?.price?.unit_amount || 0

  // Safely handle dates
  const periodEnd = subscription.current_period_end 
    ? new Date(subscription.current_period_end * 1000).toISOString() 
    : null

  console.log('periodEnd converted:', periodEnd)

  // Use upsert to handle both new and existing subscriptions
  const { error } = await supabase
    .from('subscriptions')
    .upsert({
      user_id: userId,
      stripe_subscription_id: subscription.id,
      status: subscription.status,
      current_amount_cents: priceAmount,
      current_period_end: periodEnd,
      cancel_at_period_end: subscription.cancel_at_period_end || false,
      currency: subscription.currency || 'usd',
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
    })

  if (error) {
    console.error('Error upserting subscription:', error)
  } else {
    console.log('Subscription upserted successfully for user:', userId)
  }
}

// Handler: Subscription deleted (canceled)
async function handleSubscriptionDeleted(supabase: any, subscription: Stripe.Subscription) {
  console.log('Subscription deleted:', subscription.id)

  // Get user ID from customer
  const userId = await getUserIdFromCustomer(supabase, subscription.customer as string)
  if (!userId) {
    console.error('Could not find user for customer:', subscription.customer)
    return
  }

  // Update subscription status to canceled
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (error) {
    console.error('Error updating subscription:', error)
  }
}

// Handler: Invoice paid
async function handleInvoicePaid(supabase: any, invoice: Stripe.Invoice) {
  console.log('Invoice paid:', invoice.id)

  // Get user ID from customer
  const userId = await getUserIdFromCustomer(supabase, invoice.customer as string)
  if (!userId) {
    console.error('Could not find user for customer:', invoice.customer)
    return
  }

  // Insert invoice record
  const { error } = await supabase.from('invoices').upsert({
    user_id: userId,
    stripe_invoice_id: invoice.id,
    amount_paid_cents: invoice.amount_paid,
    status: invoice.status,
    hosted_invoice_url: invoice.hosted_invoice_url,
    invoice_pdf: invoice.invoice_pdf,
    created_at: new Date(invoice.created * 1000).toISOString(),
  }, {
    onConflict: 'stripe_invoice_id',
  })

  if (error) {
    console.error('Error inserting invoice:', error)
  }
}

// Handler: Invoice payment failed
async function handleInvoicePaymentFailed(supabase: any, invoice: Stripe.Invoice) {
  console.log('Invoice payment failed:', invoice.id)

  // Get user ID from customer
  const userId = await getUserIdFromCustomer(supabase, invoice.customer as string)
  if (!userId) {
    console.error('Could not find user for customer:', invoice.customer)
    return
  }

  // Update subscription status to past_due
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (error) {
    console.error('Error updating subscription to past_due:', error)
  }

  // Optionally: Insert failed invoice record
  await supabase.from('invoices').upsert({
    user_id: userId,
    stripe_invoice_id: invoice.id,
    amount_paid_cents: 0,
    status: 'failed',
    hosted_invoice_url: invoice.hosted_invoice_url,
    created_at: new Date(invoice.created * 1000).toISOString(),
  }, {
    onConflict: 'stripe_invoice_id',
  })
}

// Helper: Get Supabase user ID from Stripe customer ID
async function getUserIdFromCustomer(supabase: any, stripeCustomerId: string): Promise<string | null> {
  // First try to find in stripe_customers table
  const { data, error } = await supabase
    .from('stripe_customers')
    .select('user_id')
    .eq('stripe_customer_id', stripeCustomerId)
    .single()

  if (data?.user_id) {
    return data.user_id
  }

  // Fallback: Check customer metadata from Stripe
  try {
    const customer = await stripe.customers.retrieve(stripeCustomerId)
    if (customer && !customer.deleted && customer.metadata?.supabase_user_id) {
      const userId = customer.metadata.supabase_user_id
      
      // Save to stripe_customers table for future lookups
      await supabase.from('stripe_customers').upsert({
        user_id: userId,
        stripe_customer_id: stripeCustomerId,
      }, {
        onConflict: 'stripe_customer_id',
      })
      
      console.log('Found user from customer metadata and saved mapping:', userId)
      return userId
    }
  } catch (err) {
    console.error('Error fetching customer from Stripe:', err)
  }

  return null
}
