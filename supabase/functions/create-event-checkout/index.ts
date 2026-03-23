// Supabase Edge Function: create-event-checkout
// Creates a Stripe Checkout Session for event RSVP or raffle entry payments

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
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse body
    const { event_id, type, guest_name, guest_email, from_waitlist, invest_eligible_acknowledged, amount_cents } = await req.json()
    // type: 'rsvp' | 'raffle_entry' | 'competition_entry' | 'prize_pool'
    // guest_name + guest_email: for non-member (public event) RSVP
    // from_waitlist: true when claiming a waitlist spot
    // invest_eligible_acknowledged: true when user acknowledged Fidelity risk
    // amount_cents: custom amount for prize_pool contributions

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

    // Determine amount
    let amountCents = 0
    let productName = ''
    let productDescription = ''

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
          .eq('guest_email', guest_email)
          .maybeSingle()

        if (existingGuestRsvp?.paid) {
          throw new Error('This email already has a paid RSVP for this event')
        }
      }

      // Check capacity (members + guests)
      if (event.max_participants) {
        const { count: memberCount } = await supabase
          .from('event_rsvps')
          .select('id', { count: 'exact', head: true })
          .eq('event_id', event_id)
          .eq('status', 'going')

        const { count: guestCount } = await supabase
          .from('event_guest_rsvps')
          .select('id', { count: 'exact', head: true })
          .eq('event_id', event_id)
          .eq('paid', true)

        const totalGoing = (memberCount || 0) + (guestCount || 0)
        if (totalGoing >= event.max_participants) {
          throw new Error('This event is full')
        }
      }

      // LLC event: enforce cost_breakdown_locked — if LLC and breakdown exists, it must be locked
      if (event.event_type === 'llc' && event.cost_breakdown && !event.cost_breakdown_locked) {
        throw new Error('Cost breakdown must be locked before accepting payments. Please contact the event host.')
      }

      amountCents = event.rsvp_cost_cents || 0
      if (amountCents <= 0) throw new Error('Invalid RSVP price configured')

      productName = `RSVP — ${event.title}`
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
          .eq('guest_email', guest_email)
          .maybeSingle()

        if (guestRsvp) {
          const { data: existingEntry } = await supabase
            .from('event_raffle_entries')
            .select('id')
            .eq('event_id', event_id)
            .eq('guest_token', guestRsvp.guest_token)
            .maybeSingle()

          if (existingEntry) {
            throw new Error('This email already has a raffle entry for this event')
          }
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
    let customerConfig: any = {}

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
      // For guests: pre-fill email, don't attach to a Stripe customer
      customerConfig = { customer_email: guest_email }
    }

    // Generate a guest token for guest RSVPs
    const guestToken = isGuest ? crypto.randomUUID() : null

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
      metadata.guest_name = guest_name
      metadata.guest_email = guest_email
      metadata.guest_token = guestToken!
    }

    // LLC-specific metadata
    if (from_waitlist) metadata.from_waitlist = 'true'
    if (invest_eligible_acknowledged) metadata.invest_eligible_acknowledged = 'true'
    if (event.invest_eligible) metadata.invest_eligible = 'true'

    // Success URL
    const origin = req.headers.get('origin') || 'https://justicemcneal.com'
    const successUrl = isGuest
      ? `${origin}/events/?e=${event.slug}&paid=${type}&guest_token=${guestToken}`
      : `${origin}/portal/events.html?paid=${type}&event=${event_id}`

    // Create one-time Checkout Session
    const session = await stripe.checkout.sessions.create({
      ...customerConfig,
      payment_method_types: ['card'],
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
    })

    return new Response(
      JSON.stringify({ url: session.url }),
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
