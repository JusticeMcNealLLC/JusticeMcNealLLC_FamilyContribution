// Supabase Edge Function: stripe-webhook
// Handles all incoming Stripe webhook events

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno&no-check'
import { upsertEventSmsRecipient, trySendEventRsvpConfirmation } from '../_shared/sms.ts'
import { ensurePartyAndSeat, normalizeIncludedItems, parseSeatOptionsMetadata } from '../_shared/included-items.ts'
import {
  acksPayload,
  hasRequiredDisclaimers,
  normalizeDisclaimers,
  parseAcksMetadata,
} from '../_shared/disclaimers.ts'
import { normalizeSeatRole } from '../_shared/event-pricing.ts'
import { completePaidRsvpAfterCheckout } from '../_shared/paid-rsvp-prep.ts'
import {
  applyCheckoutSessionExpired,
  applyInstallmentFailed,
  applyInstallmentProcessing,
  applyInstallmentSucceeded,
} from '../_shared/payment-schedule-webhook.ts'
import { notifyPartyPaymentFailed } from '../_shared/event-payment-sms.ts'
import {
  claimStripeWebhookEvent,
  extractWebhookMetaHints,
  finalizeStripeWebhookEvent,
} from '../_shared/stripe-webhook-events.ts'

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

  let claimedEventId: string | null = null
  let supabase: ReturnType<typeof createClient> | null = null

  try {
    const body = await req.text()

    // Verify webhook signature (use async version for Deno)
    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)

    supabase = createClient(supabaseUrl, supabaseServiceKey)

    const hints = extractWebhookMetaHints(event.type, event.data?.object)
    const claim = await claimStripeWebhookEvent(supabase, {
      stripeEventId: event.id,
      eventType: event.type,
      jmType: hints.jmType,
    })

    if (claim.duplicate) {
      console.log('Duplicate Stripe event skipped:', event.id, event.type)
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    claimedEventId = claim.stripe_event_id
    console.log('Processing webhook event:', event.type, event.id)

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(supabase, event.data.object)
        break

      case 'checkout.session.expired':
        await handleCheckoutExpired(supabase, event.data.object)
        break

      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(supabase, event.data.object)
        break

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(supabase, event.data.object)
        break

      case 'payment_intent.processing':
        await handlePaymentIntentProcessing(supabase, event.data.object)
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

    await finalizeStripeWebhookEvent(supabase, {
      stripeEventId: claimedEventId,
      status: 'processed',
      planId: hints.planId,
      installmentId: hints.installmentId,
      jmType: hints.jmType,
    })

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Webhook error:', error)
    if (supabase && claimedEventId) {
      await finalizeStripeWebhookEvent(supabase, {
        stripeEventId: claimedEventId,
        status: 'error',
        errorMessage: (error as Error).message || String(error),
      })
    }
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 400 },
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

  // §13.10 — Update payment method (setup Checkout)
  if (session.mode === 'setup') {
    if (
      session.metadata?.jm_type === 'event_party_plan'
      && session.metadata?.kind === 'pm_update'
    ) {
      await handleEventPmUpdateCheckout(supabase, session)
    }
    return
  }

  // Handle one-time payment (extra deposit)
  if (session.mode === 'payment') {
    const paymentType = session.metadata?.payment_type
    console.log('One-time payment checkout, type:', paymentType)

    // ── Event RSVP Payment ─────────────────────────────────
    if (paymentType === 'event_rsvp') {
      // Early payoff / failed-installment retry — rollup only, do not re-run RSVP upsert
      if (session.metadata?.kind === 'payoff' || session.metadata?.jm_payoff === '1') {
        await handleEventPayoffCheckout(supabase, session)
        return
      }
      if (session.metadata?.kind === 'retry') {
        await handleEventRetryCheckout(supabase, session)
        return
      }
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

// Resolve PaymentMethod id from Checkout Session (expand PI when needed) — §13.10 ACH
async function resolveCheckoutPaymentMethodId(
  session: Stripe.Checkout.Session,
): Promise<string | null> {
  const direct = (session as any).payment_method
  if (typeof direct === 'string' && direct) return direct
  if (direct && typeof direct === 'object' && direct.id) return String(direct.id)

  const piRef = session.payment_intent
  if (!piRef) return null

  try {
    if (typeof piRef === 'object' && piRef !== null) {
      const pm = (piRef as Stripe.PaymentIntent).payment_method
      if (typeof pm === 'string' && pm) return pm
      if (pm && typeof pm === 'object' && (pm as Stripe.PaymentMethod).id) {
        return String((pm as Stripe.PaymentMethod).id)
      }
    }

    const piId = typeof piRef === 'string' ? piRef : (piRef as Stripe.PaymentIntent).id
    if (!piId) return null
    const pi = await stripe.paymentIntents.retrieve(piId)
    const pm = pi.payment_method
    if (typeof pm === 'string' && pm) return pm
    if (pm && typeof pm === 'object' && (pm as Stripe.PaymentMethod).id) {
      return String((pm as Stripe.PaymentMethod).id)
    }
  } catch (err) {
    console.error('Failed to resolve PaymentMethod from checkout session:', err)
  }
  return null
}

// Resolve event-party installment from PI metadata / DB / Checkout session
async function resolvePartyInstallmentFromPi(
  supabase: any,
  pi: Stripe.PaymentIntent,
): Promise<{
  installmentId: string | null
  planId: string | null
  customerId: string | null
  paymentMethodId: string | null
}> {
  const meta = pi.metadata || {}
  let installmentId = meta.installment_id ? String(meta.installment_id).trim() : ''
  let planId = meta.plan_id ? String(meta.plan_id).trim() : ''
  let customerId =
    typeof pi.customer === 'string'
      ? pi.customer
      : pi.customer && typeof pi.customer === 'object'
        ? (pi.customer as Stripe.Customer).id
        : null
  let paymentMethodId =
    typeof pi.payment_method === 'string'
      ? pi.payment_method
      : pi.payment_method && typeof pi.payment_method === 'object'
        ? (pi.payment_method as Stripe.PaymentMethod).id
        : null

  if (!installmentId) {
    const { data: byPi } = await supabase
      .from('event_payment_installments')
      .select('id, plan_id')
      .eq('stripe_payment_intent_id', pi.id)
      .maybeSingle()
    if (byPi?.id) {
      installmentId = String(byPi.id)
      if (!planId && byPi.plan_id) planId = String(byPi.plan_id)
    }
  }

  if (!installmentId || !planId) {
    try {
      const sessions = await stripe.checkout.sessions.list({ payment_intent: pi.id, limit: 1 })
      const session = sessions.data?.[0]
      if (session?.metadata?.jm_type === 'event_party_plan') {
        if (!planId && session.metadata.plan_id) planId = String(session.metadata.plan_id).trim()
        if (!installmentId && session.metadata.installment_id) {
          installmentId = String(session.metadata.installment_id).trim()
        }
        if (!customerId && session.customer) {
          customerId = typeof session.customer === 'string'
            ? session.customer
            : (session.customer as Stripe.Customer).id
        }
        if (!paymentMethodId) {
          paymentMethodId = await resolveCheckoutPaymentMethodId(session)
        }
      }
    } catch (err) {
      console.error('resolvePartyInstallmentFromPi: session lookup failed', err)
    }
  }

  if (!installmentId && planId) {
    const { data: first } = await supabase
      .from('event_payment_installments')
      .select('id')
      .eq('plan_id', planId)
      .eq('sequence', 1)
      .maybeSingle()
    if (first?.id) installmentId = String(first.id)
  }

  // Only treat as party-plan if we have installment or explicit jm_type
  if (!installmentId && meta.jm_type !== 'event_party_plan' && meta.payment_type !== 'event_rsvp') {
    return { installmentId: null, planId: null, customerId, paymentMethodId }
  }

  return {
    installmentId: installmentId || null,
    planId: planId || null,
    customerId,
    paymentMethodId,
  }
}

async function handleCheckoutExpired(supabase: any, session: Stripe.Checkout.Session) {
  if (session.metadata?.jm_type !== 'event_party_plan') return
  const planId = session.metadata?.plan_id ? String(session.metadata.plan_id).trim() : ''
  const installmentId = session.metadata?.installment_id
    ? String(session.metadata.installment_id).trim()
    : ''
  if (!planId) return
  console.log('Checkout expired for party plan:', planId)
  await applyCheckoutSessionExpired(supabase, { planId, installmentId })
}

async function handleEventPayoffCheckout(supabase: any, session: Stripe.Checkout.Session) {
  const installmentId = session.metadata?.installment_id
    ? String(session.metadata.installment_id).trim()
    : ''
  if (!installmentId) {
    console.error('Payoff checkout missing installment_id:', session.id)
    return
  }
  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent && typeof session.payment_intent === 'object'
        ? (session.payment_intent as Stripe.PaymentIntent).id
        : null
  if (!paymentIntentId) {
    console.error('Payoff checkout missing payment_intent:', session.id)
    return
  }
  const customerId =
    typeof session.customer === 'string'
      ? session.customer
      : session.customer && typeof session.customer === 'object'
        ? (session.customer as Stripe.Customer).id
        : null
  const paymentMethodId = await resolveCheckoutPaymentMethodId(session)
  const amountPaid = session.amount_total || 0

  console.log('Payoff checkout completed:', session.id, installmentId)
  await applyInstallmentSucceeded(supabase, {
    installmentId,
    paymentIntentId,
    amountCents: amountPaid,
    customerId,
    paymentMethodId,
  })
}

async function handleEventRetryCheckout(supabase: any, session: Stripe.Checkout.Session) {
  const installmentId = session.metadata?.installment_id
    ? String(session.metadata.installment_id).trim()
    : ''
  if (!installmentId) {
    console.error('Retry checkout missing installment_id:', session.id)
    return
  }
  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent && typeof session.payment_intent === 'object'
        ? (session.payment_intent as Stripe.PaymentIntent).id
        : null
  if (!paymentIntentId) {
    console.error('Retry checkout missing payment_intent:', session.id)
    return
  }
  const customerId =
    typeof session.customer === 'string'
      ? session.customer
      : session.customer && typeof session.customer === 'object'
        ? (session.customer as Stripe.Customer).id
        : null
  const paymentMethodId = await resolveCheckoutPaymentMethodId(session)
  const amountPaid = session.amount_total || 0

  console.log('Retry checkout completed:', session.id, installmentId)
  await applyInstallmentSucceeded(supabase, {
    installmentId,
    paymentIntentId,
    amountCents: amountPaid,
    customerId,
    paymentMethodId,
  })
}

async function resolveSetupSessionPaymentMethodId(
  session: Stripe.Checkout.Session,
): Promise<string | null> {
  const siRef = session.setup_intent
  if (!siRef) return null
  try {
    if (typeof siRef === 'object' && siRef !== null) {
      const pm = (siRef as Stripe.SetupIntent).payment_method
      if (typeof pm === 'string' && pm) return pm
      if (pm && typeof pm === 'object' && (pm as Stripe.PaymentMethod).id) {
        return String((pm as Stripe.PaymentMethod).id)
      }
    }
    const siId = typeof siRef === 'string' ? siRef : (siRef as Stripe.SetupIntent).id
    if (!siId) return null
    const si = await stripe.setupIntents.retrieve(siId)
    const pm = si.payment_method
    if (typeof pm === 'string' && pm) return pm
    if (pm && typeof pm === 'object' && (pm as Stripe.PaymentMethod).id) {
      return String((pm as Stripe.PaymentMethod).id)
    }
  } catch (err) {
    console.error('Failed to resolve PaymentMethod from setup session:', err)
  }
  return null
}

async function handleEventPmUpdateCheckout(supabase: any, session: Stripe.Checkout.Session) {
  const planId = session.metadata?.plan_id ? String(session.metadata.plan_id).trim() : ''
  if (!planId) {
    console.error('PM update checkout missing plan_id:', session.id)
    return
  }
  const customerId =
    typeof session.customer === 'string'
      ? session.customer
      : session.customer && typeof session.customer === 'object'
        ? (session.customer as Stripe.Customer).id
        : null
  const paymentMethodId = await resolveSetupSessionPaymentMethodId(session)
  if (!paymentMethodId) {
    console.error('PM update checkout missing payment_method:', session.id)
    return
  }

  if (customerId) {
    try {
      await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId })
    } catch (attachErr: any) {
      // Already attached is fine
      if (attachErr?.code !== 'resource_already_exists') {
        console.error('PM attach on update (non-fatal):', attachErr?.message || attachErr)
      }
    }
    try {
      await stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: paymentMethodId },
      })
    } catch (custErr) {
      console.error('Customer default PM update (non-fatal):', custErr)
    }
  }

  const nowIso = new Date().toISOString()
  const update: Record<string, unknown> = {
    stripe_payment_method_id: paymentMethodId,
    updated_at: nowIso,
  }
  if (customerId) update.stripe_customer_id = customerId

  // Leave past_due as-is — payer still needs Retry for the failed installment
  const { error } = await supabase
    .from('event_payment_plans')
    .update(update)
    .eq('id', planId)
  if (error) {
    console.error('PM update plan persist failed:', error.message)
    return
  }
  console.log('PM update persisted for plan:', planId, paymentMethodId)
}

// §13.10 — PI succeeded: PM persist + installment/plan rollup (idempotent)
async function handlePaymentIntentSucceeded(supabase: any, pi: Stripe.PaymentIntent) {
  const resolved = await resolvePartyInstallmentFromPi(supabase, pi)
  if (!resolved.installmentId) {
    // Legacy non-party PIs — ignore
    return
  }

  const amountCents = typeof pi.amount_received === 'number' && pi.amount_received > 0
    ? pi.amount_received
    : (typeof pi.amount === 'number' ? pi.amount : null)

  console.log('Party plan PI.succeeded:', pi.id, 'installment', resolved.installmentId)
  await applyInstallmentSucceeded(supabase, {
    installmentId: resolved.installmentId,
    paymentIntentId: pi.id,
    amountCents,
    customerId: resolved.customerId,
    paymentMethodId: resolved.paymentMethodId,
  })
}

async function handlePaymentIntentFailed(supabase: any, pi: Stripe.PaymentIntent) {
  const resolved = await resolvePartyInstallmentFromPi(supabase, pi)
  if (!resolved.installmentId) return

  const failureMessage = pi.last_payment_error?.message || null
  console.log('Party plan PI.payment_failed:', pi.id, failureMessage)
  const result = await applyInstallmentFailed(supabase, {
    installmentId: resolved.installmentId,
    paymentIntentId: pi.id,
    failureMessage,
    markPlanPastDue: true,
  })
  if (result.applied && result.planId) {
    await notifyPartyPaymentFailed(supabase, {
      planId: result.planId,
      installmentId: resolved.installmentId,
    })
  }
}

async function handlePaymentIntentProcessing(supabase: any, pi: Stripe.PaymentIntent) {
  const resolved = await resolvePartyInstallmentFromPi(supabase, pi)
  if (!resolved.installmentId) return

  console.log('Party plan PI.processing:', pi.id)
  await applyInstallmentProcessing(supabase, {
    installmentId: resolved.installmentId,
    paymentIntentId: pi.id,
  })
}

// Handler: Event RSVP payment completed
async function handleEventRsvpPayment(supabase: any, session: Stripe.Checkout.Session) {
  const eventId = session.metadata?.event_id
  if (!eventId) {
    console.error('Missing event_id metadata for RSVP payment:', session.id)
    return
  }

  const amountPaid = session.amount_total || 0
  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent && typeof session.payment_intent === 'object'
        ? (session.payment_intent as Stripe.PaymentIntent).id
        : null
  const isGuest = !session.metadata?.supabase_user_id
  const customerId =
    typeof session.customer === 'string'
      ? session.customer
      : session.customer && typeof session.customer === 'object'
        ? (session.customer as Stripe.Customer).id
        : null
  const paymentMethodId = await resolveCheckoutPaymentMethodId(session)

  const prepCompletion = await completePaidRsvpAfterCheckout(supabase, {
    session,
    eventId,
    amountPaid,
    paymentIntentId,
    isGuest,
    customerId,
    paymentMethodId,
  })

  if (prepCompletion.usedPrepPath) {
    if (isGuest) {
      const guestName = session.metadata?.guest_name
      const guestEmail = session.metadata?.guest_email?.trim().toLowerCase()
      const guestToken = session.metadata?.guest_token
      const guestRsvpId = prepCompletion.guestRsvpId

      if (!prepCompletion.alreadyComplete && guestRsvpId) {
        const guestPhone = session.metadata?.guest_phone
        const smsOptIn = session.metadata?.sms_opt_in === 'true'
        if (guestPhone && smsOptIn) {
          const smsUpsert = await upsertEventSmsRecipient(supabase, {
            event_id: eventId,
            phone_raw: guestPhone,
            sms_opt_in: true,
            sms_consent_text_version: session.metadata?.sms_consent_text_version || 'event_sms_v1',
            display_name: guestName,
            email: guestEmail,
            guest_rsvp_id: guestRsvpId,
            consent_source: 'guest_rsvp',
          })
          await trySendEventRsvpConfirmation(supabase, { event_id: eventId, upsert_result: smsUpsert })
        }
      }

      const { data: event } = await supabase
        .from('events')
        .select('pricing_mode, raffle_enabled')
        .eq('id', eventId)
        .single()

      if (event?.raffle_enabled && event.pricing_mode === 'paid' && guestToken && !prepCompletion.alreadyComplete) {
        const { error: raffleErr } = await supabase.from('event_raffle_entries').insert({
          event_id: eventId,
          guest_token: guestToken,
          paid: true,
          stripe_payment_intent_id: paymentIntentId,
          amount_paid_cents: 0,
        })
        if (raffleErr) {
          console.error('Error creating bundled guest raffle entry:', raffleErr)
        }
      }
    } else {
      const userId = session.metadata!.supabase_user_id
      const { data: eventFull } = await supabase
        .from('events')
        .select('event_type, cost_breakdown_locked, pricing_mode, raffle_enabled')
        .eq('id', eventId)
        .single()

      if (eventFull?.event_type === 'llc' && !eventFull.cost_breakdown_locked) {
        await supabase.from('events').update({ cost_breakdown_locked: true }).eq('id', eventId)
        console.log('Cost breakdown locked after first payment for event:', eventId)
      }

      if (session.metadata?.from_waitlist === 'true') {
        await supabase
          .from('event_waitlist')
          .update({ status: 'claimed' })
          .eq('event_id', eventId)
          .eq('user_id', userId)
          .in('status', ['offered', 'claimed'])
        console.log('Waitlist spot claimed for user:', userId)
      }

      if (!prepCompletion.alreadyComplete && eventFull?.raffle_enabled && eventFull.pricing_mode === 'paid') {
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
        }
      }
    }
    return
  }

  if (isGuest) {
    // ── Guest RSVP ────────────────────────────────────────
    const guestName = session.metadata?.guest_name
    const guestEmail = session.metadata?.guest_email?.trim().toLowerCase()
    const guestToken = session.metadata?.guest_token

    if (!guestName || !guestEmail || !guestToken) {
      console.error('Missing guest metadata for RSVP payment:', session.id)
      return
    }

    console.log(`Guest RSVP payment: email=${guestEmail}, event=${eventId}, amount=${amountPaid}`)

    const { data: guestRsvpRow, error } = await supabase.from('event_guest_rsvps').upsert({
      event_id: eventId,
      guest_name: guestName,
      guest_email: guestEmail,
      guest_phone: session.metadata?.guest_phone || null,
      guest_token: guestToken,
      status: 'going',
      paid: true,
      stripe_payment_intent_id: paymentIntentId,
      amount_paid_cents: amountPaid,
      accepted_no_refund_policy: true,
      accepted_no_refund_at: new Date().toISOString(),
    }, {
      onConflict: 'event_id,guest_email',
    }).select('id').single()

    if (error) {
      console.error('Error upserting guest RSVP:', error)
    } else {
      console.log('Guest RSVP confirmed (paid) for:', guestEmail)

      const guestPhone = session.metadata?.guest_phone
      const smsOptIn = session.metadata?.sms_opt_in === 'true'
      if (guestPhone && smsOptIn && guestRsvpRow?.id) {
        const smsUpsert = await upsertEventSmsRecipient(supabase, {
          event_id: eventId,
          phone_raw: guestPhone,
          sms_opt_in: true,
          sms_consent_text_version: session.metadata?.sms_consent_text_version || 'event_sms_v1',
          display_name: guestName,
          email: guestEmail,
          guest_rsvp_id: guestRsvpRow.id,
          consent_source: 'guest_rsvp',
        })
        await trySendEventRsvpConfirmation(supabase, { event_id: eventId, upsert_result: smsUpsert })
      }

      try {
        const { data: eventForOpts } = await supabase
          .from('events')
          .select('included_items, disclaimers')
          .eq('id', eventId)
          .single()
        const catalog = normalizeIncludedItems(eventForOpts?.included_items)
        const discCatalog = normalizeDisclaimers(eventForOpts?.disclaimers)
        const seatRole = normalizeSeatRole(session.metadata?.seat_role)
        if (guestRsvpRow?.id) {
          const seatOptions = parseSeatOptionsMetadata(session.metadata?.seat_options)
          const ackIds = parseAcksMetadata(session.metadata?.disclaimer_acks)
          const disclaimerAcks = acksPayload(discCatalog, ackIds)
          const amenityVoteOptionId = session.metadata?.amenity_vote_option_id
            ? String(session.metadata.amenity_vote_option_id).trim()
            : null
          await ensurePartyAndSeat({
            supabase,
            eventId,
            catalog,
            seatOptions,
            displayName: guestName,
            partyStatus: 'active',
            seatRole,
            phone: session.metadata?.guest_phone || null,
            disclaimerAcks: disclaimerAcks.length ? disclaimerAcks : undefined,
            amenityVoteOptionId,
            amenityVoteStatus: amenityVoteOptionId ? 'counted' : undefined,
            payer: { kind: 'guest', guestRsvpId: guestRsvpRow.id },
          })
        }
      } catch (partyErr) {
        console.error('Guest party/seat attach failed:', partyErr)
      }
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

    const { data: memberRsvpRow, error } = await supabase.from('event_rsvps').upsert({
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
    }).select('id').single()

    if (error) {
      console.error('Error upserting event RSVP:', error)
    } else {
      console.log('Event RSVP confirmed (paid) for user:', userId)

      try {
        const { data: eventForOpts } = await supabase
          .from('events')
          .select('included_items, disclaimers')
          .eq('id', eventId)
          .single()
        const catalog = normalizeIncludedItems(eventForOpts?.included_items)
        const discCatalog = normalizeDisclaimers(eventForOpts?.disclaimers)
        const seatRole = normalizeSeatRole(session.metadata?.seat_role)
        if (memberRsvpRow?.id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, phone')
            .eq('id', userId)
            .maybeSingle()
          const displayName = (
            [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')
            || 'Member'
          ).trim()
          const seatOptions = parseSeatOptionsMetadata(session.metadata?.seat_options)
          const ackIds = parseAcksMetadata(session.metadata?.disclaimer_acks)
          const disclaimerAcks = acksPayload(discCatalog, ackIds)
          const amenityVoteOptionId = session.metadata?.amenity_vote_option_id
            ? String(session.metadata.amenity_vote_option_id).trim()
            : null
          await ensurePartyAndSeat({
            supabase,
            eventId,
            catalog,
            seatOptions,
            displayName,
            partyStatus: 'active',
            seatRole,
            phone: profile?.phone || null,
            disclaimerAcks: disclaimerAcks.length ? disclaimerAcks : undefined,
            amenityVoteOptionId,
            amenityVoteStatus: amenityVoteOptionId ? 'counted' : undefined,
            payer: { kind: 'member', userId, rsvpId: memberRsvpRow.id },
          })
        }
      } catch (partyErr) {
        console.error('Member party/seat attach failed:', partyErr)
      }
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
