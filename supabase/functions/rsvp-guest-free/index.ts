// Supabase Edge Function: rsvp-guest-free
// Handles free RSVP for non-member guests (no Stripe needed)
// Collects name + email + phone, creates guest RSVP + optional party/seat (adult|kid)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { upsertEventSmsRecipient, trySendEventRsvpConfirmation } from '../_shared/sms.ts'
import { normalizeIncludedItems } from '../_shared/included-items.ts'
import {
  acksPayload,
  hasRequiredDisclaimers,
  normalizeDisclaimers,
  validateAcks,
} from '../_shared/disclaimers.ts'
import { requirePhone } from '../_shared/rsvp-contact.ts'
import {
  assertCapacityForIncomingSeats,
  ensurePartyAndSeats,
  normalizePartySeats,
  partyBaseTotalCents,
  validatePartySeats,
} from '../_shared/party-seats.ts'
import { needsVote, resolveVoteStatus, validateVote } from '../_shared/amenity-voting.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function maybeAttachPartySeats(
  supabase: any,
  event: any,
  guestRsvp: any,
  rawSeats: unknown,
  seat_options: unknown,
  disclaimer_acks: unknown,
  guest_name: string,
  guestPhone: string | null,
  seat_role: unknown,
  amenity_vote_option_id?: string | null,
  partyStatus: 'active' | 'awaiting_attach' = 'active',
) {
  const catalog = normalizeIncludedItems(event.included_items)
  const discCatalog = normalizeDisclaimers(event.disclaimers)
  const voteRequired = needsVote(event)

  const ackErr = validateAcks(discCatalog, disclaimer_acks)
  if (ackErr) throw new Error(ackErr)
  const disclaimerAcks = acksPayload(discCatalog, disclaimer_acks)
  if (voteRequired) {
    const voteErr = validateVote(event.amenity_voting, amenity_vote_option_id)
    if (voteErr) throw new Error(voteErr)
  }

  const seats = normalizePartySeats(rawSeats, {
    seatRole: seat_role,
    seatOptions: seat_options,
    displayName: guest_name.trim(),
    phone: guestPhone,
  })
  const seatsErr = validatePartySeats(event, seats, catalog, { allowIncompleteGuests: true })
  if (seatsErr) throw new Error(seatsErr)

  const partyTotal = partyBaseTotalCents(event, seats)
  const voteStatus = voteRequired && amenity_vote_option_id
    ? resolveVoteStatus(partyTotal)
    : undefined

  const payerSeats = seats.map((s) => (
    s.is_payer ? { ...s, phone: guestPhone } : s
  ))

  return ensurePartyAndSeats({
    supabase,
    eventId: event.id,
    catalog,
    seats: payerSeats,
    partyStatus,
    disclaimerAcks: disclaimerAcks.length ? disclaimerAcks : undefined,
    amenityVoteOptionId: voteRequired ? String(amenity_vote_option_id || '').trim() || null : null,
    amenityVoteStatus: voteStatus,
    payer: { kind: 'guest', guestRsvpId: guestRsvp.id },
  })
}

async function assertCapacityForParty(supabase: any, event: any, seats: ReturnType<typeof normalizePartySeats>) {
  await assertCapacityForIncomingSeats(supabase, event, seats)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const {
      event_id,
      guest_name,
      guest_email,
      guest_phone,
      sms_opt_in,
      sms_consent_text_version,
      seats: rawSeats,
      seat_options,
      disclaimer_acks,
      seat_role,
      amenity_vote_option_id,
      payment_intent: rawPaymentIntent,
    } = await req.json()

    if (!event_id) throw new Error('event_id is required')
    if (!guest_name || !guest_name.trim()) throw new Error('guest_name is required')
    if (!guest_email || !guest_email.trim()) throw new Error('guest_email is required')

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guest_email.trim())) {
      throw new Error('Invalid email address')
    }

    const paymentIntent = String(rawPaymentIntent || 'self').trim().toLowerCase() === 'attach_later'
      ? 'attach_later'
      : 'self'
    const attachLater = paymentIntent === 'attach_later'
    const partyStatus = attachLater ? 'awaiting_attach' as const : 'active' as const

    const guestPhoneE164 = requirePhone(guest_phone)

    const { data: event, error: evtErr } = await supabase
      .from('events')
      .select('*')
      .eq('id', event_id)
      .single()

    if (evtErr || !event) throw new Error('Event not found')

    if (!['open', 'confirmed', 'active'].includes(event.status)) {
      throw new Error('This event is not accepting RSVPs')
    }

    if (event.member_only) {
      throw new Error('This is a members-only event. Please sign in to RSVP.')
    }

    if (event.rsvp_deadline && new Date(event.rsvp_deadline) < new Date()) {
      throw new Error('RSVP deadline has passed')
    }

    const discCatalog = normalizeDisclaimers(event.disclaimers)
    const ackErr = validateAcks(discCatalog, disclaimer_acks)
    if (ackErr) throw new Error(ackErr)

    const catalog = normalizeIncludedItems(event.included_items)
    const seats = normalizePartySeats(rawSeats, {
      seatRole: seat_role,
      seatOptions: seat_options,
      displayName: guest_name.trim(),
      phone: guestPhoneE164,
    })
    const seatsErr = validatePartySeats(event, seats, catalog, { allowIncompleteGuests: true })
    if (seatsErr) throw new Error(seatsErr)

    const partyTotal = partyBaseTotalCents(event, seats)
    // Flow E attach_later: unpaid pending even when seat price > 0 (payer covers later)
    if (!attachLater && partyTotal > 0) {
      throw new Error('This party requires payment — use the checkout flow instead')
    }

    const emailLower = guest_email.trim().toLowerCase()

    async function finalizeGuestParty(guestRow: any, alreadyExists: boolean) {
      await supabase
        .from('event_guest_rsvps')
        .update({
          guest_phone: guestPhoneE164,
          guest_name: guest_name.trim(),
          attach_requested: attachLater,
        })
        .eq('id', guestRow.id)

      if (sms_opt_in === true) {
        const smsUpsert = await upsertEventSmsRecipient(supabase, {
          event_id,
          phone_raw: guestPhoneE164,
          sms_opt_in: true,
          sms_consent_text_version: sms_consent_text_version || 'event_sms_v1',
          display_name: guest_name.trim(),
          email: emailLower,
          guest_rsvp_id: guestRow.id,
          consent_source: 'guest_rsvp',
        })
        await trySendEventRsvpConfirmation(supabase, { event_id, upsert_result: smsUpsert })
      }

      const party = await maybeAttachPartySeats(
        supabase,
        event,
        guestRow,
        rawSeats,
        seat_options,
        disclaimer_acks,
        guest_name,
        guestPhoneE164,
        seat_role,
        amenity_vote_option_id,
        partyStatus,
      )

      // Re-read guest with attach_requested
      const { data: fresh } = await supabase
        .from('event_guest_rsvps')
        .select('id, guest_name, guest_email, guest_token, status, paid, created_at, party_id, attach_requested')
        .eq('id', guestRow.id)
        .single()

      return new Response(JSON.stringify({
        guest_token: (fresh || guestRow).guest_token,
        status: (fresh || guestRow).status,
        guest_rsvp: fresh || guestRow,
        already_exists: alreadyExists,
        party_id: party?.party_id || (fresh || guestRow).party_id || null,
        seat_info_tokens: party?.seat_info_tokens || [],
        payment_intent: paymentIntent,
        attach_requested: attachLater,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: existingGuest } = await supabase
      .from('event_guest_rsvps')
      .select('id, guest_name, guest_email, guest_token, status, paid, created_at, party_id, attach_requested')
      .eq('event_id', event_id)
      .ilike('guest_email', emailLower)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (existingGuest) {
      if (existingGuest.paid) {
        throw new Error('You already have a paid RSVP for this event.')
      }
      return await finalizeGuestParty(existingGuest, true)
    }

    await assertCapacityForParty(supabase, event, seats)

    const guestToken = crypto.randomUUID()

    const { data: guestRsvp, error: insertErr } = await supabase
      .from('event_guest_rsvps')
      .insert({
        event_id,
        guest_name: guest_name.trim(),
        guest_email: emailLower,
        guest_phone: guestPhoneE164,
        guest_token: guestToken,
        status: 'going',
        paid: false,
        amount_paid_cents: 0,
        attach_requested: attachLater,
      })
      .select()
      .single()

    if (insertErr) {
      console.error('Insert error:', insertErr)
      if (insertErr.code === '23505') {
        const { data: existingAfterConflict } = await supabase
          .from('event_guest_rsvps')
          .select('id, guest_name, guest_email, guest_token, status, paid, created_at, party_id, attach_requested')
          .eq('event_id', event_id)
          .ilike('guest_email', emailLower)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle()

        if (existingAfterConflict) {
          if (existingAfterConflict.paid) {
            throw new Error('You already have a paid RSVP for this event.')
          }
          return await finalizeGuestParty(existingAfterConflict, true)
        }
      }
      throw new Error('Failed to create RSVP. Please try again.')
    }

    return await finalizeGuestParty(guestRsvp, false)
  } catch (err) {
    console.error('rsvp-guest-free error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
