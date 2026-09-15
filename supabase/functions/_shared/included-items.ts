// Shared included-items catalog + party/seat helpers for event RSVP edges

export const NAME_MAX = 80
export const CHOICE_MAX = 40
export const CHOICES_MAX = 40
export const ANSWER_MAX = 120
export const IMAGE_URL_MAX = 2000
export const OPTION_TYPES = ['size', 'color', 'text', 'select'] as const
export const APPLIES_TO = ['all', 'adult', 'kid'] as const

function needsChoices(type: string) {
  return type === 'size' || type === 'color' || type === 'select'
}

type IncludedItem = {
  id: string
  name: string
  required: boolean
  option_type: string
  choices: string[]
  applies_to: 'all' | 'adult' | 'kid'
  image_url?: string
}

function normalizeImageUrl(raw: unknown): string {
  const v = String(raw || '').trim()
  if (!v || v.length > IMAGE_URL_MAX) return ''
  if (!/^https:\/\//i.test(v)) return ''
  return v
}

function normalizeAppliesTo(raw: unknown): 'all' | 'adult' | 'kid' {
  const v = String(raw || '').trim()
  if (v === 'adult' || v === 'kid' || v === 'all') return v
  return 'all'
}

export function normalizeIncludedItems(items: unknown): IncludedItem[] {
  if (!Array.isArray(items)) return []
  const out: IncludedItem[] = []
  for (const raw of items) {
    if (!raw || typeof raw !== 'object') continue
    const row = raw as Record<string, unknown>
    const name = String(row.name || '').trim().slice(0, NAME_MAX)
    if (!name) continue
    const option_type = String(row.option_type || '').trim()
    if (!OPTION_TYPES.includes(option_type as typeof OPTION_TYPES[number])) continue
    let choices: string[] = []
    if (needsChoices(option_type)) {
      const seen = new Set<string>()
      const src = Array.isArray(row.choices) ? row.choices : []
      for (const c of src) {
        const v = String(c || '').trim().slice(0, CHOICE_MAX)
        if (!v) continue
        const key = v.toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        choices.push(v)
        if (choices.length >= CHOICES_MAX) break
      }
      if (!choices.length) continue
    }
    const id = String(row.id || '').trim() || `inc-${out.length + 1}`
    const image_url = normalizeImageUrl(row.image_url)
    const item: IncludedItem = {
      id,
      name,
      required: !!row.required,
      option_type,
      choices,
      applies_to: normalizeAppliesTo(row.applies_to),
    }
    if (image_url) item.image_url = image_url
    out.push(item)
  }
  return out
}

export function forRole(catalog: unknown, role?: string | null): IncludedItem[] {
  const list = normalizeIncludedItems(catalog)
  const r = role === 'kid' ? 'kid' : (role === 'adult' ? 'adult' : null)
  if (!r) return list
  return list.filter((item) => item.applies_to === 'all' || item.applies_to === r)
}

export function validateAnswers(catalog: unknown, answers: unknown, role?: string | null): string | null {
  const list = role ? forRole(catalog, role) : normalizeIncludedItems(catalog)
  const map = answers && typeof answers === 'object' ? answers as Record<string, unknown> : {}
  for (const item of list) {
    const raw = map[item.id]
    const value = raw == null ? '' : String(raw).trim()
    if (item.required && !value) return `${item.name} is required.`
    if (!value) continue
    if (value.length > ANSWER_MAX) return `${item.name} must be ${ANSWER_MAX} characters or fewer.`
    if (needsChoices(item.option_type) && !item.choices.includes(value)) {
      return `Pick a valid option for ${item.name}.`
    }
  }
  return null
}

export function sanitizeAnswers(catalog: unknown, answers: unknown, role?: string | null): Record<string, string> {
  const list = role ? forRole(catalog, role) : normalizeIncludedItems(catalog)
  const map = answers && typeof answers === 'object' ? answers as Record<string, unknown> : {}
  const out: Record<string, string> = {}
  for (const item of list) {
    const value = map[item.id] == null ? '' : String(map[item.id]).trim().slice(0, ANSWER_MAX)
    if (!value) continue
    if (needsChoices(item.option_type) && !item.choices.includes(value)) continue
    out[item.id] = value
  }
  return out
}

export function answersComplete(catalog: unknown, answers: unknown, role?: string | null): boolean {
  return validateAnswers(catalog, answers, role) == null
}

export function parseSeatOptionsMetadata(raw: string | undefined | null): Record<string, string> {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (v == null) continue
      const s = String(v).trim().slice(0, ANSWER_MAX)
      if (s) out[String(k)] = s
    }
    return out
  } catch {
    return {}
  }
}

type EnsureArgs = {
  supabase: any
  eventId: string
  catalog: unknown
  seatOptions: unknown
  displayName: string
  partyStatus: 'draft' | 'pending_payment' | 'active' | 'cancelled'
  seatRole?: 'adult' | 'kid'
  phone?: string | null
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
 * Idempotent: reuse existing non-cancelled party for this payer on the event.
 * Creates/updates one seat (default adult) and sets RSVP.party_id.
 */
export async function ensurePartyAndSeat(args: EnsureArgs) {
  const {
    supabase,
    eventId,
    catalog,
    seatOptions,
    displayName,
    partyStatus,
    payer,
    disclaimerAcks,
    phone,
    amenityVoteOptionId,
    amenityVoteStatus,
  } = args
  const seatRole = args.seatRole === 'kid' ? 'kid' : 'adult'

  const list = forRole(catalog, seatRole)
  if (list.length) {
    const err = validateAnswers(catalog, seatOptions, seatRole)
    if (err) throw new Error(err)
  }
  const options = sanitizeAnswers(catalog, seatOptions, seatRole)
  const complete = answersComplete(catalog, options, seatRole)
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
    if (existingParty.status !== partyStatus && partyStatus === 'active') {
      partyUpdate.status = 'active'
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

  const { data: existingSeat } = await supabase
    .from('event_seats')
    .select('id')
    .eq('party_id', partyId)
    .eq('sort_order', 0)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  const seatPayload = {
    event_id: eventId,
    party_id: partyId,
    role: seatRole,
    display_name: String(displayName || 'Guest').trim().slice(0, 120) || 'Guest',
    phone: phone ? String(phone).trim().slice(0, 32) : null,
    options,
    options_complete: complete,
    linked_user_id: payer.kind === 'member' ? payer.userId : null,
    linked_guest_rsvp_id: payer.kind === 'guest' ? payer.guestRsvpId : null,
    sort_order: 0,
  }

  if (existingSeat?.id) {
    const { error: seatUpErr } = await supabase
      .from('event_seats')
      .update(seatPayload)
      .eq('id', existingSeat.id)
    if (seatUpErr) throw new Error(seatUpErr.message)
  } else {
    const { error: seatInsErr } = await supabase.from('event_seats').insert(seatPayload)
    if (seatInsErr) throw new Error(seatInsErr.message)
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

  return { party_id: partyId, options, options_complete: complete }
}
