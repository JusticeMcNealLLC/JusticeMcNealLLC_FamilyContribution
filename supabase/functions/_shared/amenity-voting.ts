// Shared amenity voting config + RSVP vote validation for event edges

const LABEL_MAX = 80
const DESC_MAX = 240
const OPTIONS_MAX = 10
const RESULTS_VISIBLE = ['after_close', 'always', 'host_only'] as const

type AmenityOption = {
  id: string
  label: string
  description?: string
}

type AmenityConfig = {
  enabled: boolean
  options: AmenityOption[]
  closes_at: string | null
  results_visible: string
}

export type AmenityVoteStatus = 'none' | 'provisional' | 'counted' | 'removed'

function normalizeOptions(items: unknown): AmenityOption[] {
  if (!Array.isArray(items)) return []
  const out: AmenityOption[] = []
  const seenLabels = new Set<string>()
  for (const raw of items) {
    if (!raw || typeof raw !== 'object') continue
    const row = raw as Record<string, unknown>
    const label = String(row.label || '').trim().slice(0, LABEL_MAX)
    if (!label) continue
    const key = label.toLowerCase()
    if (seenLabels.has(key)) continue
    seenLabels.add(key)
    const id = String(row.id || '').trim() || `amenity-${out.length + 1}`
    const description = String(row.description || '').trim().slice(0, DESC_MAX)
    out.push({
      id,
      label,
      ...(description ? { description } : {}),
    })
    if (out.length >= OPTIONS_MAX) break
  }
  return out
}

export function normalizeConfig(raw: unknown): AmenityConfig {
  const base = {
    enabled: false,
    options: [] as AmenityOption[],
    closes_at: null as string | null,
    results_visible: 'after_close',
  }
  if (!raw || typeof raw !== 'object') return base
  const row = raw as Record<string, unknown>
  const options = normalizeOptions(row.options)
  let resultsVisible = String(row.results_visible || base.results_visible).trim()
  if (!RESULTS_VISIBLE.includes(resultsVisible as typeof RESULTS_VISIBLE[number])) {
    resultsVisible = base.results_visible
  }
  let closesAt: string | null = null
  if (row.closes_at != null && row.closes_at !== '') {
    const d = new Date(String(row.closes_at))
    closesAt = Number.isNaN(d.getTime()) ? null : d.toISOString()
  }
  return {
    enabled: row.enabled === true && options.length >= 2,
    options,
    closes_at: closesAt,
    results_visible: resultsVisible,
  }
}

export function isVotingClosed(config: unknown, now?: Date): boolean {
  const cfg = normalizeConfig(config)
  if (!cfg.closes_at) return false
  const t = now || new Date()
  return new Date(cfg.closes_at) <= t
}

export function needsVote(event: { amenity_voting?: unknown } | null | undefined): boolean {
  const cfg = normalizeConfig(event?.amenity_voting)
  if (!cfg.enabled) return false
  return !isVotingClosed(cfg)
}

export function validateVote(config: unknown, optionId: unknown): string | null {
  const cfg = normalizeConfig(config)
  if (!cfg.enabled || isVotingClosed(cfg)) return null
  const id = String(optionId || '').trim()
  if (!id) return 'Please select an amenity preference.'
  if (!cfg.options.some((o) => o.id === id)) return 'Please select a valid amenity option.'
  return null
}

export function resolveVoteStatus(seatPriceCents: number): AmenityVoteStatus {
  if (seatPriceCents > 0) return 'provisional'
  return 'counted'
}

type PayerRef =
  | { kind: 'member'; userId: string }
  | { kind: 'guest'; guestRsvpId: string }

/** Idempotent: store provisional amenity vote on pending party before paid checkout. */
export async function upsertPendingPartyAmenityVote(
  supabase: any,
  eventId: string,
  payer: PayerRef,
  amenityVoteOptionId: string,
): Promise<string> {
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

  const { data: existing, error: findErr } = await partyQuery.maybeSingle()
  if (findErr) throw new Error(findErr.message)

  const payload = {
    amenity_vote_option_id: amenityVoteOptionId,
    amenity_vote_status: 'provisional' as AmenityVoteStatus,
    status: 'pending_payment',
    updated_at: new Date().toISOString(),
  }

  if (existing?.id) {
    const { error: upErr } = await supabase.from('event_parties').update(payload).eq('id', existing.id)
    if (upErr) throw new Error(upErr.message)
    return existing.id as string
  }

  const insertRow: Record<string, unknown> = payer.kind === 'member'
    ? {
        event_id: eventId,
        payer_kind: 'member',
        payer_user_id: payer.userId,
        payer_guest_rsvp_id: null,
        ...payload,
      }
    : {
        event_id: eventId,
        payer_kind: 'guest',
        payer_user_id: null,
        payer_guest_rsvp_id: payer.guestRsvpId,
        ...payload,
      }

  const { data: created, error: insErr } = await supabase
    .from('event_parties')
    .insert(insertRow)
    .select('id')
    .single()
  if (insErr) throw new Error(insErr.message)
  return created.id as string
}
