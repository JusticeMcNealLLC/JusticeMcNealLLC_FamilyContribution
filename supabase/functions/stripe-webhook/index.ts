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

      case 'account.updated':
        await handleConnectAccountUpdated(supabase, event.data.object)
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
  console.log('Checkout completed:', session.id, 'mode:', session.mode)

  // For subscription checkouts, the subscription.created event handles things
  if (session.mode === 'subscription') {
    console.log('Subscription checkout — handled by subscription.created event')
    return
  }

  // Handle one-time payment (extra deposit)
  if (session.mode === 'payment') {
    const paymentType = session.metadata?.payment_type
    console.log('One-time payment checkout, type:', paymentType)

    // ── Event RSVP Payment ─────────────────────────────────
    if (paymentType === 'event_rsvp') {
      await handleEventRsvpPayment(supabase, session)
      return
    }

    // ── Event Raffle Entry Payment ──────────────────────────
    if (paymentType === 'event_raffle_entry') {
      await handleEventRafflePayment(supabase, session)
      return
    }

    // ── Competition Entry Fee Payment ───────────────────────
    if (paymentType === 'event_competition_entry') {
      await handleCompetitionEntryPayment(supabase, session)
      return
    }

    // ── Prize Pool Contribution Payment ─────────────────────
    if (paymentType === 'event_prize_pool') {
      await handlePrizePoolPayment(supabase, session)
      return
    }

    // ── Extra Deposit ───────────────────────────────────────
    if (paymentType !== 'extra_deposit') {
      console.log('Unknown one-time payment type, skipping')
      return
    }

    // Get user ID from metadata or customer
    let userId = session.metadata?.supabase_user_id
    if (!userId && session.customer) {
      userId = await getUserIdFromCustomer(supabase, session.customer as string)
    }
    if (!userId) {
      console.error('Could not identify user for extra deposit session:', session.id)
      return
    }

    // Retrieve fee data and receipt URL from the payment intent → charge → balance_transaction
    const amountPaid = session.amount_total || 0
    let stripeFee = 0
    let netAmount = amountPaid
    let receiptUrl: string | null = null

    try {
      if (session.payment_intent) {
        const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent as string, {
          expand: ['latest_charge.balance_transaction'],
        })
        const charge = paymentIntent.latest_charge as Stripe.Charge
        if (charge && typeof charge === 'object') {
          // Grab the receipt URL from the charge
          receiptUrl = charge.receipt_url || null
          const bt = charge.balance_transaction as Stripe.BalanceTransaction
          if (bt && typeof bt === 'object') {
            stripeFee = bt.fee || 0
            netAmount = bt.net || (amountPaid - stripeFee)
            console.log(`Extra deposit ${session.id}: gross=${amountPaid}, fee=${stripeFee}, net=${netAmount}`)
          }
        }
      }
    } catch (feeErr) {
      console.error('Error retrieving extra deposit fee data (non-fatal):', feeErr)
      netAmount = amountPaid
    }

    // Store as an invoice record using the payment_intent ID as the unique key
    const stripeInvoiceId = (session.payment_intent as string) || `ed_${session.id}`

    const { error } = await supabase.from('invoices').upsert({
      user_id: userId,
      stripe_invoice_id: stripeInvoiceId,
      amount_paid_cents: amountPaid,
      stripe_fee_cents: stripeFee,
      net_amount_cents: netAmount,
      status: 'paid',
      hosted_invoice_url: receiptUrl,
      invoice_pdf: null,
      payment_type: 'extra_deposit',
      created_at: new Date().toISOString(),
    }, {
      onConflict: 'stripe_invoice_id',
    })

    if (error) {
      console.error('Error inserting extra deposit invoice:', error)
    } else {
      console.log('Extra deposit recorded for user:', userId, 'amount:', amountPaid)
    }
  }
}

// Handler: Event RSVP payment completed
async function handleEventRsvpPayment(supabase: any, session: Stripe.Checkout.Session) {
  const eventId = session.metadata?.event_id
  if (!eventId) {
    console.error('Missing event_id metadata for RSVP payment:', session.id)
    return
  }

  const amountPaid = session.amount_total || 0
  const paymentIntentId = session.payment_intent as string || null
  const isGuest = !session.metadata?.supabase_user_id

  if (isGuest) {
    // ── Guest RSVP ────────────────────────────────────────
    const guestName = session.metadata?.guest_name
    const guestEmail = session.metadata?.guest_email
    const guestToken = session.metadata?.guest_token

    if (!guestName || !guestEmail || !guestToken) {
      console.error('Missing guest metadata for RSVP payment:', session.id)
      return
    }

    console.log(`Guest RSVP payment: email=${guestEmail}, event=${eventId}, amount=${amountPaid}`)

    const { error } = await supabase.from('event_guest_rsvps').upsert({
      event_id: eventId,
      guest_name: guestName,
      guest_email: guestEmail,
      guest_token: guestToken,
      status: 'going',
      paid: true,
      stripe_payment_intent_id: paymentIntentId,
      amount_paid_cents: amountPaid,
      accepted_no_refund_policy: true,
      accepted_no_refund_at: new Date().toISOString(),
    }, {
      onConflict: 'event_id,guest_email',
    })

    if (error) {
      console.error('Error upserting guest RSVP:', error)
    } else {
      console.log('Guest RSVP confirmed (paid) for:', guestEmail)
    }

    // Check for bundled raffle
    const { data: event } = await supabase
      .from('events')
      .select('pricing_mode, raffle_enabled')
      .eq('id', eventId)
      .single()

    if (event?.raffle_enabled && event.pricing_mode === 'paid') {
      const { error: raffleErr } = await supabase.from('event_raffle_entries').insert({
        event_id: eventId,
        guest_token: guestToken,
        paid: true,
        stripe_payment_intent_id: paymentIntentId,
        amount_paid_cents: 0,
      })

      if (raffleErr) {
        console.error('Error creating bundled guest raffle entry:', raffleErr)
      } else {
        console.log('Bundled raffle entry created for guest:', guestEmail)
      }
    }
  } else {
    // ── Member RSVP ───────────────────────────────────────
    const userId = session.metadata!.supabase_user_id

    console.log(`Event RSVP payment: user=${userId}, event=${eventId}, amount=${amountPaid}`)

    const { error } = await supabase.from('event_rsvps').upsert({
      event_id: eventId,
      user_id: userId,
      status: 'going',
      paid: true,
      stripe_payment_intent_id: paymentIntentId,
      amount_paid_cents: amountPaid,
      accepted_no_refund_policy: true,
      accepted_no_refund_at: new Date().toISOString(),
      // LLC invest-eligible acknowledgment
      ...(session.metadata?.invest_eligible_acknowledged === 'true' ? {
        invest_eligible_acknowledged: true,
        invest_eligible_acknowledged_at: new Date().toISOString(),
      } : {}),
    }, {
      onConflict: 'event_id,user_id',
    })

    if (error) {
      console.error('Error upserting event RSVP:', error)
    } else {
      console.log('Event RSVP confirmed (paid) for user:', userId)
    }

    // Lock cost breakdown after first payment (LLC events)
    const { data: eventFull } = await supabase
      .from('events')
      .select('event_type, cost_breakdown_locked, pricing_mode, raffle_enabled')
      .eq('id', eventId)
      .single()

    if (eventFull?.event_type === 'llc' && !eventFull.cost_breakdown_locked) {
      await supabase
        .from('events')
        .update({ cost_breakdown_locked: true })
        .eq('id', eventId)
      console.log('Cost breakdown locked after first payment for event:', eventId)
    }

    // Handle waitlist claim: mark waitlist entry as completed
    if (session.metadata?.from_waitlist === 'true') {
      await supabase
        .from('event_waitlist')
        .update({ status: 'claimed' })
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .in('status', ['offered', 'claimed'])
      console.log('Waitlist spot claimed for user:', userId)
    }

    // Check if event has bundled raffle (pricing_mode = 'paid' + raffle_enabled)
    const event = eventFull

    if (event?.raffle_enabled && event.pricing_mode === 'paid') {
      const { error: raffleErr } = await supabase.from('event_raffle_entries').upsert({
        event_id: eventId,
        user_id: userId,
        paid: true,
        stripe_payment_intent_id: paymentIntentId,
        amount_paid_cents: 0,
      }, {
        onConflict: 'event_id,user_id',
      })

      if (raffleErr) {
        console.error('Error creating bundled raffle entry:', raffleErr)
      } else {
        console.log('Bundled raffle entry created for user:', userId)
      }
    }
  }
}

// Handler: Event raffle entry payment completed
async function handleEventRafflePayment(supabase: any, session: Stripe.Checkout.Session) {
  const eventId = session.metadata?.event_id
  if (!eventId) {
    console.error('Missing event_id metadata for raffle payment:', session.id)
    return
  }

  const amountPaid = session.amount_total || 0
  const paymentIntentId = session.payment_intent as string || null
  const isGuest = !session.metadata?.supabase_user_id

  if (isGuest) {
    const guestToken = session.metadata?.guest_token
    const guestEmail = session.metadata?.guest_email

    if (!guestToken) {
      console.error('Missing guest_token for raffle payment:', session.id)
      return
    }

    console.log(`Guest raffle entry payment: email=${guestEmail}, event=${eventId}, amount=${amountPaid}`)

    const { error } = await supabase.from('event_raffle_entries').insert({
      event_id: eventId,
      guest_token: guestToken,
      paid: true,
      stripe_payment_intent_id: paymentIntentId,
      amount_paid_cents: amountPaid,
    })

    if (error) {
      console.error('Error inserting guest raffle entry:', error)
    } else {
      console.log('Guest raffle entry confirmed (paid) for:', guestEmail)
    }
  } else {
    const userId = session.metadata!.supabase_user_id

    console.log(`Event raffle entry payment: user=${userId}, event=${eventId}, amount=${amountPaid}`)

    const { error } = await supabase.from('event_raffle_entries').upsert({
      event_id: eventId,
      user_id: userId,
      paid: true,
      stripe_payment_intent_id: paymentIntentId,
      amount_paid_cents: amountPaid,
    }, {
      onConflict: 'event_id,user_id',
    })

    if (error) {
      console.error('Error upserting raffle entry:', error)
    } else {
      console.log('Raffle entry confirmed (paid) for user:', userId)
    }
  }
}

// Handler: Competition entry fee payment completed
async function handleCompetitionEntryPayment(supabase: any, session: Stripe.Checkout.Session) {
  const eventId = session.metadata?.event_id
  const userId = session.metadata?.supabase_user_id

  if (!eventId || !userId) {
    console.error('Missing metadata for competition entry payment:', session.id)
    return
  }

  const amountPaid = session.amount_total || 0
  const paymentIntentId = session.payment_intent as string || null

  console.log(`Competition entry payment: user=${userId}, event=${eventId}, amount=${amountPaid}`)

  // Register user as competitor (insert entry record)
  const { error: entryErr } = await supabase
    .from('competition_entries')
    .upsert({
      event_id: eventId,
      user_id: userId,
      title: 'Registered',
      entry_type: 'text',
      submitted_at: new Date().toISOString(),
    }, {
      onConflict: 'event_id,user_id',
    })

  if (entryErr) {
    console.error('Error creating competition entry:', entryErr)
  } else {
    console.log('Competition entry created for user:', userId)
  }

  // Add entry fee to prize pool contributions
  if (amountPaid > 0) {
    const { error: poolErr } = await supabase
      .from('prize_pool_contributions')
      .insert({
        event_id: eventId,
        contributor_id: userId,
        amount_cents: amountPaid,
        stripe_payment_intent_id: paymentIntentId,
      })

    if (poolErr) {
      console.error('Error recording entry fee as prize pool contribution:', poolErr)
    } else {
      console.log('Entry fee added to prize pool:', amountPaid)
    }
  }
}

// Handler: Prize pool contribution payment completed
async function handlePrizePoolPayment(supabase: any, session: Stripe.Checkout.Session) {
  const eventId = session.metadata?.event_id
  const userId = session.metadata?.supabase_user_id

  if (!eventId || !userId) {
    console.error('Missing metadata for prize pool payment:', session.id)
    return
  }

  const amountPaid = session.amount_total || 0
  const paymentIntentId = session.payment_intent as string || null

  console.log(`Prize pool contribution: user=${userId}, event=${eventId}, amount=${amountPaid}`)

  const { error } = await supabase
    .from('prize_pool_contributions')
    .insert({
      event_id: eventId,
      contributor_id: userId,
      amount_cents: amountPaid,
      stripe_payment_intent_id: paymentIntentId,
    })

  if (error) {
    console.error('Error recording prize pool contribution:', error)
  } else {
    console.log('Prize pool contribution recorded for user:', userId, 'amount:', amountPaid)
  }
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

  // Retrieve fee data from the charge's balance transaction
  let stripeFee = 0
  let netAmount = invoice.amount_paid || 0
  try {
    if (invoice.charge) {
      const charge = await stripe.charges.retrieve(invoice.charge as string, {
        expand: ['balance_transaction'],
      })
      const bt = charge.balance_transaction as Stripe.BalanceTransaction
      if (bt && typeof bt === 'object') {
        stripeFee = bt.fee || 0
        netAmount = bt.net || (invoice.amount_paid - stripeFee)
        console.log(`Invoice ${invoice.id}: gross=${invoice.amount_paid}, fee=${stripeFee}, net=${netAmount}`)
      }
    }
  } catch (feeErr) {
    console.error('Error retrieving fee data (non-fatal):', feeErr)
    // Fall back to gross amount if fee lookup fails
    netAmount = invoice.amount_paid || 0
  }

  // Insert invoice record
  const paidAt = invoice.status_transitions?.paid_at
    ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
    : new Date().toISOString()
  const periodStart = invoice.lines?.data?.[0]?.period?.start
    ? new Date(invoice.lines.data[0].period.start * 1000).toISOString()
    : null

  const { error } = await supabase.from('invoices').upsert({
    user_id: userId,
    stripe_invoice_id: invoice.id,
    amount_paid_cents: invoice.amount_paid,
    stripe_fee_cents: stripeFee,
    net_amount_cents: netAmount,
    status: invoice.status,
    hosted_invoice_url: invoice.hosted_invoice_url,
    invoice_pdf: invoice.invoice_pdf,
    created_at: new Date(invoice.created * 1000).toISOString(),
    paid_at: paidAt,
    period_start: periodStart,
  }, {
    onConflict: 'stripe_invoice_id',
  })

  if (error) {
    console.error('Error inserting invoice:', error)
  }

  // Also refresh the subscription's current_period_end from Stripe
  // The invoice.paid event is the most reliable signal that a new billing cycle started
  if (invoice.subscription) {
    try {
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
      const periodEnd = subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null

      console.log('Updating subscription period_end after invoice paid:', periodEnd)

      const { error: subError } = await supabase
        .from('subscriptions')
        .update({
          current_period_end: periodEnd,
          status: subscription.status,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)

      if (subError) {
        console.error('Error updating subscription period_end:', subError)
      }
    } catch (err) {
      console.error('Error fetching subscription for period update:', err)
    }
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

// Handler: Stripe Connect account.updated
// Fires when a Connect account's onboarding status changes
async function handleConnectAccountUpdated(supabase: any, account: any) {
  console.log('Connect account updated:', account.id, 'charges_enabled:', account.charges_enabled, 'payouts_enabled:', account.payouts_enabled)

  const connectAccountId = account.id
  if (!connectAccountId) return

  // Find the member by their Connect account ID
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, connect_onboarding_complete')
    .eq('stripe_connect_account_id', connectAccountId)
    .single()

  if (error || !profile) {
    console.error('Could not find profile for Connect account:', connectAccountId, error)
    return
  }

  // Mark onboarding complete when Stripe says the account can receive transfers
  const isComplete = account.charges_enabled || account.payouts_enabled || false

  if (isComplete && !profile.connect_onboarding_complete) {
    console.log('Marking Connect onboarding complete for user:', profile.id)

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        connect_onboarding_complete: true,
        payout_enrolled: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id)

    if (updateError) {
      console.error('Error updating profile Connect status:', updateError)
    }
  } else if (!isComplete && profile.connect_onboarding_complete) {
    // Account was disabled (e.g., compliance issue)
    console.log('Connect account disabled for user:', profile.id)

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        connect_onboarding_complete: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id)

    if (updateError) {
      console.error('Error updating profile Connect status:', updateError)
    }
  }
}
