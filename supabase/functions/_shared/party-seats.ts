// Shared multi-seat party helpers for Flow A payer-owned RSVP (§13.9)

import {
  answersComplete,
  sanitizeAnswers,
  validateAnswers,
} from './included-items.ts'
import {
  eventHasCapacityLimit,
  eventMaxParticipants,
  normalizeSeatRole,
  seatCountsTowardCapacity,
  seatPriceCents,
  type SeatRole,
  validateSeatRoleForEvent,
} from './event-pricing.ts'

export const MAX_PARTY_SEATS = 12
export const DISPLAY_NAME_MAX = 120

export type PartySeatInput = {
  role: SeatRole
  display_name: string
  options?: Record<string, string>
  is_payer?: boolean
  phone?: string | null
}

export type LegacySeatFallback = {
  seatRole?: unknown
  seatOptions?: unknown
  displayName: string
  phone?: string | null
}

export function partyBaseTotalCents(
  event: Record<string, unknown>,
  seats: PartySeatInput[],
): number {
  let total = 0
  for (const seat of seats) {
    total += seatPriceCents(event, seat.role)
  }
  return total
}

export function countCapacitySeats(
  event: Record<string, unknown>,
  seats: PartySeatInput[],
): number {
  let count = 0
  for (const seat of seats) {
    if (seatCountsTowardCapacity(event, seat.role)) count += 1
  }
  return count
}

/**
 * Occupied capacity for an event: seats on active/pending_payment parties,
 * filtered by capacity_counts. Falls back to going RSVP rows if no seats.
 */
export async function countOccupiedCapacity(
  supabase: any,
  event: Record<string, unknown>,
): Promise<number> {
  if (!eventHasCapacityLimit(event)) return 0
  const eventId = String(event.id || '').trim()
  if (!eventId) return 0

  const { data: parties } = await supabase
    .from('event_parties')
    .select('id')
    .eq('event_id', eventId)
    .in('status', ['active', 'pending_payment'])

  const partyIds = (parties || []).map((p: { id: string }) => p.id).filter(Boolean)
  if (partyIds.length) {
    const { data: seats } = await supabase
      .from('event_seats')
      .select('id, role, party_id')
      .eq('event_id', eventId)
      .in('party_id', partyIds)

    let count = 0
    for (const seat of seats || []) {
      const role = normalizeSeatRole(seat.role)
      if (seatCountsTowardCapacity(event, role)) count += 1
    }
    if (count > 0 || (seats || []).length > 0) return count
  }

  // Legacy fallback: RSVP rows (cannot split adults/kids without seats)
  // Paid events: count committed (paid) only so abandoned Stripe prep does not fill capacity.
  const isPaidEvent = String(event.pricing_mode || '') === 'paid'
  let memberQuery = supabase
    .from('event_rsvps')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('status', 'going')
  let guestQuery = supabase
    .from('event_guest_rsvps')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('status', 'going')
  if (isPaidEvent) {
    memberQuery = memberQuery.eq('paid', true)
    guestQuery = guestQuery.eq('paid', true)
  }
  const { count: memberCount } = await memberQuery
  const { count: guestCount } = await guestQuery

  return (memberCount || 0) + (guestCount || 0)
}

/** Throw if incoming seats would exceed soft/hard capacity. */
export async function assertCapacityForIncomingSeats(
  supabase: any,
  event: Record<string, unknown>,
  seats: PartySeatInput[],
): Promise<void> {
  if (!eventHasCapacityLimit(event)) return
  const newCapSeats = countCapacitySeats(event, seats)
  if (!newCapSeats) return
  const occupied = await countOccupiedCapacity(supabase, event)
  const max = eventMaxParticipants(event)
  if (occupied + newCapSeats > max) {
    throw new Error('This event is full')
  }
}

export function normalizePartySeats(
  raw: unknown,
  fallback: LegacySeatFallback,
): PartySeatInput[] {
  if (Array.isArray(raw) && raw.length) {
    const out: PartySeatInput[] = []
    for (const row of raw) {
      if (!row || typeof row !== 'object') continue
      const item = row as Record<string, unknown>
      const role = normalizeSeatRole(item.role)
      const display_name = String(item.display_name || '').trim().slice(0, DISPLAY_NAME_MAX)
      if (!display_name) continue
      const options = item.options && typeof item.options === 'object' && !Array.isArray(item.options)
        ? Object.fromEntries(
          Object.entries(item.options as Record<string, unknown>)
            .map(([k, v]) => [String(k), String(v ?? '').trim()])
            .filter(([, v]) => v),
        )
        : undefined
      out.push({
        role,
        display_name,
        ...(options && Object.keys(options).length ? { options } : {}),
        ...(item.is_payer === true ? { is_payer: true } : {}),
        ...(item.phone != null ? { phone: String(item.phone).trim().slice(0, 32) || null } : {}),
      })
    }
    if (out.length) {
      if (!out.some((s) => s.is_payer)) out[0].is_payer = true
      return out.slice(0, MAX_PARTY_SEATS)
    }
  }

  const role = normalizeSeatRole(fallback.seatRole)
  return [{
    role,
    display_name: String(fallback.displayName || 'Guest').trim().slice(0, DISPLAY_NAME_MAX) || 'Guest',
    is_payer: true,
    phone: fallback.phone ? String(fallback.phone).trim().slice(0, 32) : null,
    ...(fallback.seatOptions && typeof fallback.seatOptions === 'object'
      ? { options: fallback.seatOptions as Record<string, string> }
      : {}),
  }]
}

export type ValidatePartySeatsOpts = {
  /** Flow B: non-payer seats may omit required included options (invite fills later). */
  allowIncompleteGuests?: boolean
}

export function validatePartySeats(
  event: Record<string, unknown>,
  seats: PartySeatInput[],
  catalog: unknown,
  opts?: ValidatePartySeatsOpts,
): string | null {
  const allowIncompleteGuests = !!(opts && opts.allowIncompleteGuests)
  if (!seats.length) return 'Add at least one person to your party.'
  if (seats.length > MAX_PARTY_SEATS) return `Parties are limited to ${MAX_PARTY_SEATS} people.`
  if (!seats.some((s) => s.is_payer)) return 'The payer must be included in your party.'

  for (const seat of seats) {
    validateSeatRoleForEvent(event, seat.role)
    if (!String(seat.display_name || '').trim()) {
      return seat.is_payer ? 'Your name is required.' : 'Each guest needs a name.'
    }
    if (allowIncompleteGuests && !seat.is_payer) continue
    const err = validateAnswers(catalog, seat.options || {}, seat.role)
    if (err) {
      const who = seat.is_payer ? 'Your' : `${seat.display_name}'s`
      return `${who} ${err.charAt(0).toLowerCase()}${err.slice(1)}`
    }
  }
  return null
}

export function mintInfoInviteToken(): string {
  return crypto.randomUUID().replace(/-/g, '')
}

export type SeatInfoTokenRow = {
  seat_id: string
  display_name: string
  info_invite_token: string
  options_complete: boolean
  role: SeatRole
}

export function sanitizePartySeats(
  catalog: unknown,
  seats: PartySeatInput[],
): Array<PartySeatInput & { options: Record<string, string>; options_complete: boolean }> {
  return seats.map((seat) => {
    const options = sanitizeAnswers(catalog, seat.options || {}, seat.role)
    return {
      ...seat,
      display_name: String(seat.display_name || '').trim().slice(0, DISPLAY_NAME_MAX) || 'Guest',
      options,
      options_complete: answersComplete(catalog, options, seat.role),
    }
  })
}

export type SanitizedPartySeat = PartySeatInput & {
  options: Record<string, string>
  options_complete: boolean
}

export type PartyStatus =
  | 'draft'
  | 'pending_payment'
  | 'active'
  | 'cancelled'
  | 'awaiting_attach'

export type EnsurePartySeatsArgs = {
  supabase: any
  eventId: string
  catalog: unknown
  seats: PartySeatInput[]
  partyStatus: PartyStatus
  disclaimerAcks?: Array<{ id: string; acked_at: string }>
  amenityVoteOptionId?: string | null
  amenityVoteStatus?: 'none' | 'provisional' | 'counted' | 'removed'
  payer: {
    kind: 'member'
    userId: string
    rsvpId: string
  } | {
    kind: 'guest'
    guestRsvpId: string
  }
}

/**
 * Idempotent: reuse existing non-cancelled party for payer; sync all seats by sort_order.
 * Removes extra seats when party is draft/pending_payment (re-submit before pay).
 */
export async function ensurePartyAndSeats(args: EnsurePartySeatsArgs) {
  const {
    supabase,
    eventId,
    catalog,
    partyStatus,
    payer,
    disclaimerAcks,
    amenityVoteOptionId,
    amenityVoteStatus,
  } = args

  const seats = sanitizePartySeats(catalog, args.seats)
  const acks = Array.isArray(disclaimerAcks) ? disclaimerAcks : null

  let partyQuery = supabase
    .from('event_parties')
    .select('id, status')
    .eq('event_id', eventId)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: true })
    .limit(1)

  if (payer.kind === 'member') {
    partyQuery = partyQuery.eq('payer_kind', 'member').eq('payer_user_id', payer.userId)
  } else {
    partyQuery = partyQuery.eq('payer_kind', 'guest').eq('payer_guest_rsvp_id', payer.guestRsvpId)
  }

  const { data: existingParty, error: partyFindErr } = await partyQuery.maybeSingle()
  if (partyFindErr) throw new Error(partyFindErr.message)

  let partyId = existingParty?.id as string | undefined
  const prevStatus = existingParty?.status as string | undefined

  if (!partyId) {
    const insertRow: Record<string, unknown> = payer.kind === 'member'
      ? {
          event_id: eventId,
          payer_kind: 'member',
          payer_user_id: payer.userId,
          payer_guest_rsvp_id: null,
          status: partyStatus,
        }
      : {
          event_id: eventId,
          payer_kind: 'guest',
          payer_user_id: null,
          payer_guest_rsvp_id: payer.guestRsvpId,
          status: partyStatus,
        }
    if (acks) insertRow.disclaimer_acks = acks
    if (amenityVoteOptionId) {
      insertRow.amenity_vote_option_id = amenityVoteOptionId
      insertRow.amenity_vote_status = amenityVoteStatus || 'provisional'
    }

    const { data: created, error: partyInsErr } = await supabase
      .from('event_parties')
      .insert(insertRow)
      .select('id')
      .single()
    if (partyInsErr) throw new Error(partyInsErr.message)
    partyId = created.id
  } else {
    const partyUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (prevStatus !== partyStatus && (
      partyStatus === 'active'
      || partyStatus === 'pending_payment'
      || partyStatus === 'awaiting_attach'
      || partyStatus === 'draft'
    )) {
      partyUpdate.status = partyStatus
    }
    if (acks) partyUpdate.disclaimer_acks = acks
    if (amenityVoteOptionId) {
      partyUpdate.amenity_vote_option_id = amenityVoteOptionId
      if (amenityVoteStatus) partyUpdate.amenity_vote_status = amenityVoteStatus
    }
    if (Object.keys(partyUpdate).length > 1) {
      await supabase.from('event_parties').update(partyUpdate).eq('id', partyId)
    }
  }

  const { data: existingSeats } = await supabase
    .from('event_seats')
    .select('id, sort_order, info_invite_token')
    .eq('party_id', partyId)
    .order('sort_order', { ascending: true })

  const existingByOrder = new Map<number, { id: string; info_invite_token: string | null }>()
  for (const row of existingSeats || []) {
    existingByOrder.set(Number(row.sort_order), {
      id: row.id as string,
      info_invite_token: (row.info_invite_token as string | null) || null,
    })
  }

  const canReplaceSeats = !prevStatus || prevStatus === 'draft' || prevStatus === 'pending_payment'
    || prevStatus === 'awaiting_attach'
    || partyStatus === 'draft' || partyStatus === 'pending_payment'
    || partyStatus === 'awaiting_attach'

  for (let i = 0; i < seats.length; i++) {
    const seat = seats[i]
    const existing = existingByOrder.get(i)
    const needsInvite = !seat.is_payer && !seat.options_complete
    let infoInviteToken: string | null = existing?.info_invite_token || null
    if (needsInvite && !infoInviteToken) {
      infoInviteToken = mintInfoInviteToken()
    }

    const seatPayload: Record<string, unknown> = {
      event_id: eventId,
      party_id: partyId,
      role: seat.role,
      display_name: seat.display_name,
      phone: seat.is_payer && seat.phone ? String(seat.phone).trim().slice(0, 32) : null,
      options: seat.options,
      options_complete: seat.options_complete,
      linked_user_id: seat.is_payer && payer.kind === 'member' ? payer.userId : null,
      linked_guest_rsvp_id: seat.is_payer && payer.kind === 'guest' ? payer.guestRsvpId : null,
      sort_order: i,
    }
    // Keep existing token when options become complete (re-edit via invite OK).
    if (infoInviteToken) seatPayload.info_invite_token = infoInviteToken

    if (existing?.id) {
      const { error: seatUpErr } = await supabase
        .from('event_seats')
        .update(seatPayload)
        .eq('id', existing.id)
      if (seatUpErr) throw new Error(seatUpErr.message)
    } else {
      const { error: seatInsErr } = await supabase.from('event_seats').insert(seatPayload)
      if (seatInsErr) throw new Error(seatInsErr.message)
    }
  }

  if (canReplaceSeats && (existingSeats?.length || 0) > seats.length) {
    const toRemove = (existingSeats || []).filter((row) => Number(row.sort_order) >= seats.length)
    if (toRemove.length) {
      const ids = toRemove.map((row) => row.id)
      await supabase.from('event_seats').delete().in('id', ids)
    }
  }

  if (payer.kind === 'member') {
    const { error: linkErr } = await supabase
      .from('event_rsvps')
      .update({ party_id: partyId })
      .eq('id', payer.rsvpId)
    if (linkErr) throw new Error(linkErr.message)
  } else {
    const { error: linkErr } = await supabase
      .from('event_guest_rsvps')
      .update({ party_id: partyId })
      .eq('id', payer.guestRsvpId)
    if (linkErr) throw new Error(linkErr.message)
  }

  const { data: tokenRows } = await supabase
    .from('event_seats')
    .select('id, display_name, info_invite_token, options_complete, role, sort_order')
    .eq('party_id', partyId)
    .order('sort_order', { ascending: true })

  const seat_info_tokens: SeatInfoTokenRow[] = []
  for (const row of tokenRows || []) {
    const token = row.info_invite_token ? String(row.info_invite_token) : ''
    if (!token) continue
    if (row.options_complete) continue
    seat_info_tokens.push({
      seat_id: row.id as string,
      display_name: String(row.display_name || 'Guest'),
      info_invite_token: token,
      options_complete: !!row.options_complete,
      role: row.role === 'kid' ? 'kid' : 'adult',
    })
  }

  const allComplete = seats.every((s) => s.options_complete)
  return {
    party_id: partyId as string,
    options_complete: allComplete,
    seat_count: seats.length,
    seat_info_tokens,
  }
}

export type PendingAttachGuest = {
  guest_rsvp_id: string
  pending_party_id: string
  seat_id: string
  display_name: string
  role: SeatRole
  options_complete: boolean
  guest_email: string | null
}

/** Flow E: list guests waiting for a payer to add them. */
export async function listPendingAttachGuests(
  supabase: any,
  eventId: string,
): Promise<PendingAttachGuest[]> {
  const { data: parties, error } = await supabase
    .from('event_parties')
    .select('id, payer_guest_rsvp_id')
    .eq('event_id', eventId)
    .eq('status', 'awaiting_attach')
    .eq('payer_kind', 'guest')
  if (error) throw new Error(error.message)
  if (!parties?.length) return []

  const out: PendingAttachGuest[] = []
  for (const party of parties) {
    const guestRsvpId = party.payer_guest_rsvp_id as string | null
    if (!guestRsvpId) continue

    const { data: guest } = await supabase
      .from('event_guest_rsvps')
      .select('id, guest_name, guest_email, attach_requested, paid, party_id')
      .eq('id', guestRsvpId)
      .maybeSingle()
    if (!guest?.id || guest.paid) continue

    const { data: seats } = await supabase
      .from('event_seats')
      .select('id, display_name, role, options_complete, linked_guest_rsvp_id, sort_order')
      .eq('party_id', party.id)
      .order('sort_order', { ascending: true })

    for (const seat of seats || []) {
      out.push({
        guest_rsvp_id: guest.id,
        pending_party_id: party.id as string,
        seat_id: seat.id as string,
        display_name: String(seat.display_name || guest.guest_name || 'Guest'),
        role: seat.role === 'kid' ? 'kid' : 'adult',
        options_complete: !!seat.options_complete,
        guest_email: guest.guest_email ? String(guest.guest_email) : null,
      })
    }
  }
  return out
}

/**
 * Flow E: move all seats from an awaiting_attach guest party onto the member payer party.
 * Keeps payer party amenity vote; cancels empty pending party.
 */
export async function attachPendingGuestToMemberParty(args: {
  supabase: any
  event: Record<string, unknown>
  eventId: string
  memberUserId: string
  memberRsvpId: string
  memberPaid: boolean
  guestRsvpId?: string | null
  pendingPartyId?: string | null
  payerDisplayName?: string
}): Promise<{
  party_id: string
  party_total_cents: number
  seats: Array<{ id: string; display_name: string; role: SeatRole; sort_order: number }>
}> {
  const {
    supabase,
    event,
    eventId,
    memberUserId,
    memberRsvpId,
    memberPaid,
    payerDisplayName,
  } = args

  let pendingPartyId = args.pendingPartyId ? String(args.pendingPartyId).trim() : ''
  const guestRsvpId = args.guestRsvpId ? String(args.guestRsvpId).trim() : ''

  if (!pendingPartyId && guestRsvpId) {
    const { data: pending } = await supabase
      .from('event_parties')
      .select('id')
      .eq('event_id', eventId)
      .eq('status', 'awaiting_attach')
      .eq('payer_kind', 'guest')
      .eq('payer_guest_rsvp_id', guestRsvpId)
      .maybeSingle()
    pendingPartyId = pending?.id || ''
  }
  if (!pendingPartyId) throw new Error('No pending guest found to add.')

  const { data: pendingParty, error: pendErr } = await supabase
    .from('event_parties')
    .select('id, status, payer_guest_rsvp_id, amenity_vote_option_id, amenity_vote_status')
    .eq('id', pendingPartyId)
    .eq('event_id', eventId)
    .maybeSingle()
  if (pendErr) throw new Error(pendErr.message)
  if (!pendingParty?.id || pendingParty.status !== 'awaiting_attach') {
    throw new Error('This guest is no longer waiting to be added.')
  }

  const pendingGuestId = String(pendingParty.payer_guest_rsvp_id || guestRsvpId || '')
  if (!pendingGuestId) throw new Error('Pending guest RSVP is missing.')

  const { data: pendingSeats, error: seatErr } = await supabase
    .from('event_seats')
    .select('id, role, display_name, email, phone, options, options_complete, info_invite_token, linked_guest_rsvp_id, linked_user_id, sort_order')
    .eq('party_id', pendingPartyId)
    .order('sort_order', { ascending: true })
  if (seatErr) throw new Error(seatErr.message)
  if (!pendingSeats?.length) throw new Error('Pending guest has no seats to add.')

  // Idempotent: already on this member's party
  const { data: memberPartyExisting } = await supabase
    .from('event_parties')
    .select('id, status')
    .eq('event_id', eventId)
    .eq('payer_kind', 'member')
    .eq('payer_user_id', memberUserId)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (memberPartyExisting?.id) {
    const { data: already } = await supabase
      .from('event_seats')
      .select('id')
      .eq('party_id', memberPartyExisting.id)
      .eq('linked_guest_rsvp_id', pendingGuestId)
      .limit(1)
      .maybeSingle()
    if (already?.id) {
      const { data: seatsNow } = await supabase
        .from('event_seats')
        .select('id, display_name, role, sort_order')
        .eq('party_id', memberPartyExisting.id)
        .order('sort_order', { ascending: true })
      const inputs: PartySeatInput[] = (seatsNow || []).map((s: any) => ({
        role: s.role === 'kid' ? 'kid' : 'adult',
        display_name: String(s.display_name || 'Guest'),
      }))
      return {
        party_id: memberPartyExisting.id as string,
        party_total_cents: partyBaseTotalCents(event, inputs),
        seats: (seatsNow || []).map((s: any) => ({
          id: s.id,
          display_name: String(s.display_name || 'Guest'),
          role: (s.role === 'kid' ? 'kid' : 'adult') as SeatRole,
          sort_order: Number(s.sort_order) || 0,
        })),
      }
    }
  }

  const addInputs: PartySeatInput[] = pendingSeats.map((s: any) => ({
    role: s.role === 'kid' ? 'kid' : 'adult',
    display_name: String(s.display_name || 'Guest'),
  }))
  const deltaCents = partyBaseTotalCents(event, addInputs)
  if (memberPaid && deltaCents > 0) {
    throw new Error(
      'Your RSVP is already paid. Add guests before paying, or use invite links (Flow B) for size-only guests.',
    )
  }

  // Ensure member payer party exists with at least the member seat
  let payerPartyId = memberPartyExisting?.id as string | undefined
  if (!payerPartyId) {
    const name = String(payerDisplayName || 'Member').trim().slice(0, DISPLAY_NAME_MAX) || 'Member'
    const ensured = await ensurePartyAndSeats({
      supabase,
      eventId,
      catalog: [],
      seats: [{ role: 'adult', display_name: name, is_payer: true }],
      partyStatus: memberPaid ? 'active' : 'draft',
      payer: { kind: 'member', userId: memberUserId, rsvpId: memberRsvpId },
    })
    payerPartyId = ensured.party_id
  } else if (
    memberPartyExisting?.status === 'awaiting_attach'
    || memberPartyExisting?.status === 'cancelled'
  ) {
    throw new Error('Your party cannot accept guests right now.')
  }

  const { data: payerSeats } = await supabase
    .from('event_seats')
    .select('id, sort_order')
    .eq('party_id', payerPartyId)
    .order('sort_order', { ascending: true })

  let nextOrder = (payerSeats || []).reduce(
    (max: number, s: any) => Math.max(max, Number(s.sort_order) || 0),
    -1,
  ) + 1

  for (const seat of pendingSeats) {
    const { error: moveErr } = await supabase
      .from('event_seats')
      .update({
        party_id: payerPartyId,
        linked_guest_rsvp_id: seat.linked_guest_rsvp_id || pendingGuestId,
        linked_user_id: null,
        sort_order: nextOrder,
      })
      .eq('id', seat.id)
    if (moveErr) throw new Error(moveErr.message)
    nextOrder += 1
  }

  await supabase
    .from('event_guest_rsvps')
    .update({
      attach_requested: false,
      party_id: payerPartyId,
    })
    .eq('id', pendingGuestId)

  // Cancel empty pending party; drop its provisional amenity vote (payer vote kept)
  await supabase
    .from('event_parties')
    .update({
      status: 'cancelled',
      amenity_vote_status: 'removed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', pendingPartyId)

  const { data: seatsNow } = await supabase
    .from('event_seats')
    .select('id, display_name, role, sort_order')
    .eq('party_id', payerPartyId)
    .order('sort_order', { ascending: true })

  const inputs: PartySeatInput[] = (seatsNow || []).map((s: any) => ({
    role: s.role === 'kid' ? 'kid' : 'adult',
    display_name: String(s.display_name || 'Guest'),
  }))

  return {
    party_id: payerPartyId as string,
    party_total_cents: partyBaseTotalCents(event, inputs),
    seats: (seatsNow || []).map((s: any) => ({
      id: s.id,
      display_name: String(s.display_name || 'Guest'),
      role: (s.role === 'kid' ? 'kid' : 'adult') as SeatRole,
      sort_order: Number(s.sort_order) || 0,
    })),
  }
}
