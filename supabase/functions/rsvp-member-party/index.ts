// Supabase Edge Function: rsvp-member-party
// Free member RSVP "going" + party seats + included options / disclaimer acks

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { normalizeIncludedItems } from '../_shared/included-items.ts'
import {
  acksPayload,
  hasRequiredDisclaimers,
  normalizeDisclaimers,
  validateAcks,
} from '../_shared/disclaimers.ts'
import { requireMemberPhone } from '../_shared/rsvp-contact.ts'
import { needsVote, resolveVoteStatus, validateVote } from '../_shared/amenity-voting.ts'
import {
  assertCapacityForIncomingSeats,
  ensurePartyAndSeats,
  normalizePartySeats,
  partyBaseTotalCents,
  validatePartySeats,
} from '../_shared/party-seats.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') as string

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization') || ''
    if (!authHeader) throw new Error('Authorization required')

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: userErr } = await userClient.auth.getUser()
    if (userErr || !userData?.user) throw new Error('Not signed in')
    const user = userData.user

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body = await req.json()
    const {
      event_id,
      seats: rawSeats,
      seat_options,
      disclaimer_acks,
      phone,
      seat_role,
      amenity_vote_option_id,
    } = body
    if (!event_id) throw new Error('event_id is required')

    const memberPhone = await requireMemberPhone(supabase, user.id, phone)

    const { data: event, error: evtErr } = await supabase
      .from('events')
      .select('*')
      .eq('id', event_id)
      .single()
    if (evtErr || !event) throw new Error('Event not found')

    if (!['open', 'confirmed', 'active'].includes(event.status)) {
      throw new Error('This event is not accepting RSVPs')
    }
    if (event.rsvp_enabled === false) throw new Error('RSVP is disabled for this event')

    if (event.rsvp_deadline && new Date(event.rsvp_deadline) < new Date()) {
      throw new Error('RSVP deadline has passed')
    }

    const catalog = normalizeIncludedItems(event.included_items)
    const discCatalog = normalizeDisclaimers(event.disclaimers)
    const voteRequired = needsVote(event)
    const hasSeatRole = seat_role != null && String(seat_role).trim() !== ''
    const needsParty = catalog.length > 0 || hasRequiredDisclaimers(discCatalog) || hasSeatRole
      || voteRequired || (Array.isArray(rawSeats) && rawSeats.length > 0)
    if (!needsParty) {
      throw new Error('This event does not require party RSVP')
    }
    if (voteRequired) {
      const voteErr = validateVote(event.amenity_voting, amenity_vote_option_id)
      if (voteErr) throw new Error(voteErr)
    }
    const ackErr = validateAcks(discCatalog, disclaimer_acks)
    if (ackErr) throw new Error(ackErr)
    const disclaimerAcks = acksPayload(discCatalog, disclaimer_acks)

    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .maybeSingle()

    const displayName = (
      [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')
      || user.email
      || 'Member'
    ).trim()

    const seats = normalizePartySeats(rawSeats, {
      seatRole: seat_role,
      seatOptions: seat_options,
      displayName,
      phone: memberPhone,
    })
    const seatsErr = validatePartySeats(event, seats, catalog, { allowIncompleteGuests: true })
    if (seatsErr) throw new Error(seatsErr)

    await assertCapacityForIncomingSeats(supabase, event, seats)

    const partyTotal = partyBaseTotalCents(event, seats)
    if (partyTotal > 0) {
      throw new Error('This party requires payment — use checkout instead')
    }

    const { data: rsvp, error: rsvpErr } = await supabase
      .from('event_rsvps')
      .upsert(
        { event_id, user_id: user.id, status: 'going' },
        { onConflict: 'event_id,user_id' },
      )
      .select()
      .single()
    if (rsvpErr) throw new Error(rsvpErr.message)

    const voteStatus = voteRequired && amenity_vote_option_id
      ? resolveVoteStatus(partyTotal)
      : undefined

    const payerSeats = seats.map((s) => (
      s.is_payer ? { ...s, phone: memberPhone } : s
    ))

    const party = await ensurePartyAndSeats({
      supabase,
      eventId: event_id,
      catalog,
      seats: payerSeats,
      partyStatus: 'active',
      disclaimerAcks: disclaimerAcks.length ? disclaimerAcks : undefined,
      amenityVoteOptionId: voteRequired ? String(amenity_vote_option_id || '').trim() || null : null,
      amenityVoteStatus: voteStatus,
      payer: { kind: 'member', userId: user.id, rsvpId: rsvp.id },
    })

    return new Response(JSON.stringify({
      rsvp,
      party_id: party.party_id,
      options_complete: party.options_complete,
      seat_count: party.seat_count,
      seat_info_tokens: party.seat_info_tokens || [],
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('rsvp-member-party error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
