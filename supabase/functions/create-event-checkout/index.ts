// Supabase Edge Function: create-event-checkout
// Creates a Stripe Checkout Session for event RSVP or raffle entry payments

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno&no-check'
import { normalizeIncludedItems } from '../_shared/included-items.ts'
import {
  normalizeDisclaimers,
  parseAckIds,
  validateAcks,
} from '../_shared/disclaimers.ts'
import { requirePhone, requireMemberPhone } from '../_shared/rsvp-contact.ts'
import { needsVote, validateVote } from '../_shared/amenity-voting.ts'
import {
  resolveCheckoutTotals,
  validateChoice as validatePaymentChoice,
} from '../_shared/payment-choice.ts'
import { preparePaidRsvpForCheckout } from '../_shared/paid-rsvp-prep.ts'
import {
  countCapacitySeats,
  normalizePartySeats,
  partyBaseTotalCents,
  validatePartySeats,
} from '../_shared/party-seats.ts'

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

    // Parse body
    const {
      event_id,
      type,
      guest_name,
      guest_email,
      guest_phone,
      sms_opt_in,
      sms_consent_text_version,
      guest_token,
      from_waitlist,
      invest_eligible_acknowledged,
      amount_cents,
      seat_options,
      seats: rawSeats,
      disclaimer_acks,
      phone,
      seat_role,
      amenity_vote_option_id,
      plan_kind,
      method,
    } = await req.json()
    // type: 'rsvp' | 'raffle_entry' | 'competition_entry' | 'prize_pool'
    // guest_name + guest_email: for non-member (public event) RSVP
    // guest_token: existing public guest RSVP token for guest raffle checkout
    // from_waitlist: true when claiming a waitlist spot
    // invest_eligible_acknowledged: true when user acknowledged Fidelity risk
    // amount_cents: custom amount for prize_pool contributions
    // seat_options: map of included item id → answer (RSVP type)
    // disclaimer_acks: id list or {id,acked_at}[] for required clauses

    if (!event_id) throw new Error('event_id is required')
    if (!type || !['rsvp', 'raffle_entry', 'competition_entry', 'prize_pool'].includes(type)) {
      throw new Error('type must be "rsvp", "raffle_entry", "competition_entry", or "prize_pool"')
    }

    // Auth is optional — members send JWT, guests send name+email
    let user: any = null
    const authHeader = req.headers.get('Authorization')
    if (authHeader && authHeader !== 'Bearer null') {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user: authUser } } = await supabase.auth.getUser(token)
      user = authUser
    }

    const isGuest = !user
    const guestEmailNormalized = isGuest && guest_email ? String(guest_email).trim().toLowerCase() : null
    const guestNameNormalized = isGuest && guest_name ? String(guest_name).trim() : null
    if (isGuest && (!guest_name || !guest_email)) {
      throw new Error('Guest RSVP requires guest_name and guest_email')
    }

    // Fetch the event
    const { data: event, error: evtErr } = await supabase
      .from('events')
      .select('*')
      .eq('id', event_id)
      .single()

    if (evtErr || !event) throw new Error('Event not found')

    // Validate event status
    if (!['open', 'confirmed', 'active'].includes(event.status)) {
      throw new Error('This event is not accepting RSVPs')
    }

    // Member-only check for guests
    if (isGuest && event.member_only) {
      throw new Error('This is a members-only event. Please sign in to RSVP.')
    }

    // Check RSVP deadline
    if (event.rsvp_deadline && new Date(event.rsvp_deadline) < new Date()) {
      throw new Error('RSVP deadline has passed')
    }

    let seatOptionsJson = ''
    let disclaimerAcksJson = ''
    let rsvpSeatRole: 'adult' | 'kid' = 'adult'
    let rsvpSeats: ReturnType<typeof normalizePartySeats> = []
    if (type === 'rsvp') {
      const catalog = normalizeIncludedItems(event.included_items)
      const discCatalog = normalizeDisclaimers(event.disclaimers)
      const ackErr = validateAcks(discCatalog, disclaimer_acks)
      if (ackErr) throw new Error(ackErr)
      const ackIds = parseAckIds(disclaimer_acks)
      if (ackIds.length) {
        disclaimerAcksJson = JSON.stringify(ackIds)
        if (disclaimerAcksJson.length > 450) {
          throw new Error('Disclaimer acknowledgments payload is too long.')
        }
      }

      let payerDisplayName = guestNameNormalized || 'Guest'
      if (!isGuest && user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', user.id)
          .maybeSingle()
        payerDisplayName = (
          [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')
          || user.email
          || 'Member'
        ).trim()
      }

      rsvpSeats = normalizePartySeats(rawSeats, {
        seatRole: seat_role,
        seatOptions: seat_options,
        displayName: payerDisplayName,
        phone: isGuest ? guest_phone : phone,
      })
      const seatsErr = validatePartySeats(event, rsvpSeats, catalog, { allowIncompleteGuests: true })
      if (seatsErr) throw new Error(seatsErr)
      rsvpSeatRole = rsvpSeats.find((s) => s.is_payer)?.role === 'kid' ? 'kid' : 'adult'

      const payerSeat = rsvpSeats.find((s) => s.is_payer) || rsvpSeats[0]
      if (payerSeat?.options && Object.keys(payerSeat.options).length) {
        seatOptionsJson = JSON.stringify(payerSeat.options)
        if (seatOptionsJson.length > 450) {
          throw new Error('Included option answers are too long. Shorten text answers and try again.')
        }
      }

      if (event.invest_eligible && !invest_eligible_acknowledged) {
        throw new Error('Investment risk acknowledgment is required before checkout.')
      }

      const voteRequired = needsVote(event)
      if (voteRequired) {
        const voteErr = validateVote(event.amenity_voting, amenity_vote_option_id)
        if (voteErr) throw new Error(voteErr)
      }

      if (isGuest) {
        requirePhone(guest_phone)
      } else if (user) {
        await requireMemberPhone(supabase, user.id, phone)
      }
    }

    let guestPhoneForMetadata: string | null = null
    if (type === 'rsvp' && isGuest) {
      guestPhoneForMetadata = requirePhone(guest_phone)
    }

    // Determine amount
    let amountCents = 0
    let productName = ''
    let productDescription = ''
    let guestRaffleToken: string | null = null

    if (type === 'rsvp') {
      if (event.pricing_mode === 'free') {
        throw new Error('This is a free event — no payment needed to RSVP')
      }

      // Check for existing RSVP (member or guest)
      if (!isGuest) {
        const { data: existingRsvp } = await supabase
          .from('event_rsvps')
          .select('id, paid')
          .eq('event_id', event_id)
          .eq('user_id', user.id)
          .maybeSingle()

        if (existingRsvp?.paid) {
          throw new Error('You have already paid for this RSVP')
        }
      } else {
        const { data: existingGuestRsvp } = await supabase
          .from('event_guest_rsvps')
          .select('id, paid')
          .eq('event_id', event_id)
          .ilike('guest_email', guestEmailNormalized!)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle()

        if (existingGuestRsvp?.paid) {
          throw new Error('This email already has a paid RSVP for this event')
        }
      }

      // Check capacity when party seats count toward cap
      if (event.max_participants) {
        const newCapSeats = countCapacitySeats(event, rsvpSeats)
        if (newCapSeats > 0) {
          const { count: memberCount } = await supabase
            .from('event_rsvps')
            .select('id', { count: 'exact', head: true })
            .eq('event_id', event_id)
            .eq('status', 'going')

          const { count: guestCount } = await supabase
            .from('event_guest_rsvps')
            .select('id', { count: 'exact', head: true })
            .eq('event_id', event_id)
            .eq('status', 'going')

          const totalGoing = (memberCount || 0) + (guestCount || 0)
          if (totalGoing + newCapSeats > event.max_participants) {
            throw new Error('This event is full')
          }
        }
      }

      // LLC event: enforce cost_breakdown_locked — if LLC and breakdown exists, it must be locked
      if (event.event_type === 'llc' && event.cost_breakdown && !event.cost_breakdown_locked) {
        throw new Error('Cost breakdown must be locked before accepting payments. Please contact the event host.')
      }

      const basePartyCents = partyBaseTotalCents(event, rsvpSeats)
      amountCents = basePartyCents
      if (amountCents <= 0) {
        throw new Error('This party is free — complete RSVP without checkout')
      }

      const payErr = validatePaymentChoice(event, amountCents, plan_kind, method)
      if (payErr) throw new Error(payErr)
      const payMethod = String(method || 'ach').trim() === 'card' ? 'card' : 'ach'
      const payPlanKind = String(plan_kind || 'full').trim() === 'monthly' ? 'monthly' : 'full'
      const checkoutTotals = resolveCheckoutTotals(event, amountCents, payMethod)
      amountCents = checkoutTotals.checkoutTotalCents

      const seatCount = rsvpSeats.length
      productName = seatCount > 1
        ? `RSVP — ${event.title} (${seatCount} people)`
        : `RSVP — ${event.title}${rsvpSeatRole === 'kid' ? ' (Child)' : ''}`
      productDescription = `Event RSVP for "${event.title}"`

      // LLC invest-eligible: add Fidelity risk disclosure
      if (event.invest_eligible) {
        productDescription += ' • Investment-eligible event. Funds may be allocated to LLC investment accounts. Past performance does not guarantee future results.'
      }

    } else if (type === 'raffle_entry') {
      if (!event.raffle_enabled) {
        throw new Error('This event does not have a raffle')
      }

      if (event.pricing_mode === 'paid') {
        throw new Error('Raffle entry is included with paid RSVP — no separate purchase needed')
      }

      // Check for existing raffle entry
      if (!isGuest) {
        const { data: raffleRsvp } = await supabase
          .from('event_rsvps')
          .select('id, status, paid')
          .eq('event_id', event_id)
          .eq('user_id', user.id)
          .maybeSingle()

        if (!(raffleRsvp?.status === 'going' || raffleRsvp?.paid)) {
          throw new Error('Please RSVP before entering the raffle')
        }

        const { data: existingEntry } = await supabase
          .from('event_raffle_entries')
          .select('id')
          .eq('event_id', event_id)
          .eq('user_id', user.id)
          .maybeSingle()

        if (existingEntry) {
          throw new Error('You already have a raffle entry for this event')
        }
      } else {
        // For guests, check by email via guest_rsvps → guest_token → raffle_entries
        const { data: guestRsvp } = await supabase
          .from('event_guest_rsvps')
          .select('guest_token')
          .eq('event_id', event_id)
          .ilike('guest_email', guestEmailNormalized!)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle()

        if (guestRsvp) {
          if (guest_token && guest_token !== guestRsvp.guest_token) {
            throw new Error('Please use the same ticket you RSVP\'d with to enter the raffle')
          }

          guestRaffleToken = guestRsvp.guest_token

          const { data: existingEntry } = await supabase
            .from('event_raffle_entries')
            .select('id')
            .eq('event_id', event_id)
            .eq('guest_token', guestRsvp.guest_token)
            .maybeSingle()

          if (existingEntry) {
            throw new Error('This email already has a raffle entry for this event')
          }
        } else {
          throw new Error('Please RSVP before entering the raffle')
        }
      }

      amountCents = event.raffle_entry_cost_cents || 0
      if (amountCents <= 0) throw new Error('Invalid raffle entry price configured')

      productName = `Raffle Entry — ${event.title}`
      productDescription = `Raffle/giveaway entry for "${event.title}"`

    } else if (type === 'competition_entry') {
      // ── Competition Entry Fee ─────────────────────────────
      if (event.event_type !== 'competition') {
        throw new Error('This event is not a competition')
      }

      if (!user) {
        throw new Error('Competition entry requires a member account')
      }

      // Check for existing competition entry (already registered)
      const { data: existingCompEntry } = await supabase
        .from('competition_entries')
        .select('id')
        .eq('event_id', event_id)
        .eq('user_id', user.id)
        .maybeSingle()

      if (existingCompEntry) {
        throw new Error('You are already registered for this competition')
      }

      const config = event.competition_config || {}
      amountCents = config.entry_fee_cents || 0
      if (amountCents <= 0) throw new Error('This competition has no entry fee')

      productName = `Competition Entry — ${event.title}`
      productDescription = `Competition entry fee for "${event.title}". Entry fee goes to the prize pool.`

    } else if (type === 'prize_pool') {
      // ── Prize Pool Contribution ───────────────────────────
      if (event.event_type !== 'competition') {
        throw new Error('Prize pool contributions are only for competition events')
      }

      if (!user) {
        throw new Error('Prize pool contributions require a member account')
      }

      amountCents = amount_cents || 0
      if (amountCents < 100) throw new Error('Minimum contribution is $1')
      if (amountCents > 1000000) throw new Error('Maximum contribution is $10,000')

      productName = `Prize Pool Contribution — ${event.title}`
      productDescription = `Community prize pool contribution for "${event.title}"`
    }

    // Build Stripe customer (member) or use guest email
    let customerConfig: Record<string, string> = {}
    let rsvpPayMethod: 'ach' | 'card' = 'card'

    if (!isGuest) {
      // Get or create Stripe customer for member
      let stripeCustomerId: string

      const { data: existingCustomer } = await supabase
        .from('stripe_customers')
        .select('stripe_customer_id')
        .eq('user_id', user.id)
        .single()

      if (existingCustomer) {
        stripeCustomerId = existingCustomer.stripe_customer_id
      } else {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { supabase_user_id: user.id },
        })
        stripeCustomerId = customer.id

        await supabase.from('stripe_customers').insert({
          user_id: user.id,
          stripe_customer_id: stripeCustomerId,
        })
      }

      customerConfig = { customer: stripeCustomerId }
    } else {
      // Default for guests: pre-fill email (ACH RSVP overrides below with a Customer)
      customerConfig = { customer_email: guestEmailNormalized! }
    }

    // Guest RSVPs need a token from prep (paid RSVP) or fresh for raffle; reuse unpaid guest token when present.
    let guestToken: string | null = null
    let prepResult: Awaited<ReturnType<typeof preparePaidRsvpForCheckout>> | null = null

    if (type === 'rsvp') {
      const payMethod = String(method || 'ach').trim() === 'card' ? 'card' as const : 'ach' as const
      rsvpPayMethod = payMethod
      const payPlanKind = String(plan_kind || 'full').trim() === 'monthly' ? 'monthly' as const : 'full' as const

      prepResult = await preparePaidRsvpForCheckout(supabase, {
        event,
        seats: rsvpSeats,
        seatRole: rsvpSeatRole,
        seatOptions: seat_options,
        disclaimerAcks: disclaimer_acks,
        amenityVoteOptionId: amenity_vote_option_id,
        planKind: payPlanKind,
        method: payMethod,
        payer: isGuest
          ? {
              kind: 'guest',
              guestName: guestNameNormalized!,
              guestEmail: guestEmailNormalized!,
              guestPhone: guestPhoneForMetadata,
            }
          : {
              kind: 'member',
              userId: user.id,
              email: user.email,
              phone: phone ? String(phone).trim() : null,
            },
      })
      if (isGuest) guestToken = prepResult.guest_token || null

      // §13.10 full pay — Checkout amount must match plan total_due (source of truth)
      if (payPlanKind === 'full' && prepResult.plan_id) {
        const { data: planRow } = await supabase
          .from('event_payment_plans')
          .select('total_due_cents')
          .eq('id', prepResult.plan_id)
          .maybeSingle()
        const planDue = Number(planRow?.total_due_cents)
        if (Number.isFinite(planDue) && planDue > 0) {
          amountCents = planDue
        }
      }

      // §13.10 monthly — charge first scheduled installment only
      if (payPlanKind === 'monthly' && prepResult.installment_id) {
        const { data: firstInst } = await supabase
          .from('event_payment_installments')
          .select('amount_cents')
          .eq('id', prepResult.installment_id)
          .maybeSingle()
        const firstAmt = Number(firstInst?.amount_cents)
        if (Number.isFinite(firstAmt) && firstAmt > 0) {
          amountCents = firstAmt
        }
      }

      // §13.10 — ACH/card RSVP always needs a Stripe Customer (guests included) so PM can attach
      if (isGuest && (payMethod === 'ach' || payMethod === 'card')) {
        const customer = await stripe.customers.create({
          email: guestEmailNormalized!,
          name: guestNameNormalized || undefined,
          metadata: {
            event_id: String(event_id),
            guest: 'true',
            ...(prepResult.party_id ? { party_id: prepResult.party_id } : {}),
            ...(prepResult.plan_id ? { plan_id: prepResult.plan_id } : {}),
          },
        })
        customerConfig = { customer: customer.id }
      }
    } else if (isGuest) {
      guestToken = type === 'raffle_entry'
        ? String(guest_token || guestRaffleToken || '')
        : crypto.randomUUID()
    }

    if (isGuest && type === 'raffle_entry' && !guestToken) {
      throw new Error('Please RSVP before entering the raffle')
    }

    // Build metadata
    const metadata: Record<string, string> = {
      payment_type: `event_${type}`,
      event_id: event_id,
      event_slug: event.slug,
      category: 'event',
    }

    if (!isGuest) {
      metadata.supabase_user_id = user.id
    } else {
      metadata.guest_name = guestNameNormalized!
      metadata.guest_email = guestEmailNormalized!
      metadata.guest_token = guestToken!
      if (guestPhoneForMetadata) metadata.guest_phone = guestPhoneForMetadata
      if (sms_opt_in === true) metadata.sms_opt_in = 'true'
      if (sms_consent_text_version) {
        metadata.sms_consent_text_version = String(sms_consent_text_version)
      }
    }

    // LLC-specific metadata
    if (from_waitlist) metadata.from_waitlist = 'true'
    if (invest_eligible_acknowledged) metadata.invest_eligible_acknowledged = 'true'
    if (event.invest_eligible) metadata.invest_eligible = 'true'
    if (type === 'rsvp' && seatOptionsJson) metadata.seat_options = seatOptionsJson
    if (type === 'rsvp' && disclaimerAcksJson) metadata.disclaimer_acks = disclaimerAcksJson
    if (type === 'rsvp') metadata.seat_role = rsvpSeatRole
    if (type === 'rsvp' && amenity_vote_option_id) {
      metadata.amenity_vote_option_id = String(amenity_vote_option_id).trim()
    }
    if (type === 'rsvp') {
      const baseCents = partyBaseTotalCents(event, rsvpSeats)
      const payMethod = String(method || 'ach').trim() === 'card' ? 'card' : 'ach'
      const payPlanKind = String(plan_kind || 'full').trim() === 'monthly' ? 'monthly' : 'full'
      const checkoutTotals = resolveCheckoutTotals(event, baseCents, payMethod)
      metadata.plan_kind = payPlanKind
      metadata.method = payMethod
      metadata.base_total_cents = String(checkoutTotals.baseCents)
      // Prefer aligned Checkout charge (full total_due or monthly first installment)
      metadata.checkout_total_cents = String(
        amountCents > 0 ? amountCents : checkoutTotals.checkoutTotalCents,
      )
      if (prepResult) {
        metadata.party_id = prepResult.party_id
        metadata.plan_id = prepResult.plan_id
        metadata.installment_id = prepResult.installment_id
        metadata.jm_type = 'event_party_plan'
      }
    }

    // Success URL
    const origin = req.headers.get('origin') || 'https://justicemcneal.com'
    const successUrl = isGuest
      ? `${origin}/events/?e=${event.slug}&paid=${type}&guest_token=${guestToken}`
      : `${origin}/portal/events.html?paid=${type}&event=${event_id}`

    // Create one-time Checkout Session (§13.10 ACH/card save PM for off-session)
    const isAchRsvp = type === 'rsvp' && rsvpPayMethod === 'ach'
    const isCardRsvp = type === 'rsvp' && rsvpPayMethod === 'card'
    const sessionParams: Record<string, unknown> = {
      ...customerConfig,
      payment_method_types: isAchRsvp ? ['us_bank_account'] : ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: productName,
              description: productDescription,
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: `${origin}${isGuest ? `/events/?e=${event.slug}&canceled=true` : `/portal/events.html?canceled=true&event=${event_id}`}`,
      metadata,
    }
    if (isAchRsvp || isCardRsvp) {
      sessionParams.payment_intent_data = {
        setup_future_usage: 'off_session',
        metadata: {
          jm_type: 'event_party_plan',
          payment_type: 'event_rsvp',
          event_id: String(event_id),
          ...(prepResult?.party_id ? { party_id: prepResult.party_id } : {}),
          ...(prepResult?.plan_id ? { plan_id: prepResult.plan_id } : {}),
          ...(prepResult?.installment_id ? { installment_id: prepResult.installment_id } : {}),
          method: isAchRsvp ? 'ach' : 'card',
        },
      }
    }

    // Persist Customer on plan at session create (webhook adds PaymentMethod)
    if (type === 'rsvp' && prepResult?.plan_id && customerConfig.customer) {
      await supabase
        .from('event_payment_plans')
        .update({
          stripe_customer_id: customerConfig.customer,
          updated_at: new Date().toISOString(),
        })
        .eq('id', prepResult.plan_id)
    }

    const session = await stripe.checkout.sessions.create(sessionParams as any)

    return new Response(
      JSON.stringify({
        url: session.url,
        ...(type === 'rsvp' && prepResult
          ? {
              party_id: prepResult.party_id,
              seat_info_tokens: prepResult.seat_info_tokens || [],
              ...(prepResult.guest_token ? { guest_token: prepResult.guest_token } : {}),
            }
          : {}),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
