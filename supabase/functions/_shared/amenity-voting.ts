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

export type CommitPartyAmenityVoteResult = {
  committed: boolean
  alreadyCounted?: boolean
  skipped?: boolean
  reason?: string
}

/** Idempotent: provisional → counted on plan commit; backfill amenity_vote_committed_at. */
export async function commitPartyAmenityVote(
  supabase: any,
  args: { partyId: string; optionId?: string | null },
): Promise<CommitPartyAmenityVoteResult> {
  const partyId = String(args.partyId || '').trim()
  if (!partyId) return { committed: false, skipped: true, reason: 'no_party' }

  const { data: party, error: partyErr } = await supabase
    .from('event_parties')
    .select('id, amenity_vote_option_id, amenity_vote_status')
    .eq('id', partyId)
    .maybeSingle()
  if (partyErr) throw new Error(partyErr.message)
  if (!party?.id) return { committed: false, skipped: true, reason: 'party_not_found' }

  const optionId = String(args.optionId || party.amenity_vote_option_id || '').trim() || null
  if (!optionId) return { committed: false, skipped: true, reason: 'no_option' }

  const nowIso = new Date().toISOString()
  const status = String(party.amenity_vote_status || '')
  const alreadyCounted = status === 'counted'

  if (!alreadyCounted) {
    const { error: upErr } = await supabase
      .from('event_parties')
      .update({
        amenity_vote_option_id: optionId,
        amenity_vote_status: 'counted' as AmenityVoteStatus,
        updated_at: nowIso,
      })
      .eq('id', partyId)
    if (upErr) throw new Error(upErr.message)
  }

  await supabase
    .from('event_payment_plans')
    .update({ amenity_vote_committed_at: nowIso, updated_at: nowIso })
    .eq('party_id', partyId)
    .is('amenity_vote_committed_at', null)
    .neq('status', 'cancelled')

  return { committed: true, alreadyCounted }
}

export type RemovePartyAmenityVoteResult = {
  removed: boolean
  skipped?: boolean
  reason?: string
}

/**
 * Never-pay / abandon: provisional → removed only when plan never committed.
 * Keeps amenity_vote_option_id for audit.
 */
export async function removePartyAmenityVoteIfUncommitted(
  supabase: any,
  args: { partyId: string; planId?: string | null },
): Promise<RemovePartyAmenityVoteResult> {
  const partyId = String(args.partyId || '').trim()
  if (!partyId) return { removed: false, skipped: true, reason: 'no_party' }

  const { data: party, error: partyErr } = await supabase
    .from('event_parties')
    .select('id, amenity_vote_option_id, amenity_vote_status')
    .eq('id', partyId)
    .maybeSingle()
  if (partyErr) throw new Error(partyErr.message)
  if (!party?.id) return { removed: false, skipped: true, reason: 'party_not_found' }

  const status = String(party.amenity_vote_status || '')
  if (status === 'removed') return { removed: false, skipped: true, reason: 'already_removed' }
  if (status === 'counted') return { removed: false, skipped: true, reason: 'already_counted' }
  if (status !== 'provisional' && !(status === 'none' && party.amenity_vote_option_id)) {
    return { removed: false, skipped: true, reason: 'not_provisional' }
  }

  const planId = args.planId ? String(args.planId).trim() : ''
  let planQuery = supabase
    .from('event_payment_plans')
    .select('id, status, amount_paid_cents, amenity_vote_committed_at')
    .eq('party_id', partyId)
  if (planId) planQuery = planQuery.eq('id', planId)

  const { data: plans, error: planErr } = await planQuery
  if (planErr) throw new Error(planErr.message)

  const rows = plans || []
  for (const plan of rows) {
    const planStatus = String(plan.status || '')
    if (planStatus === 'active' || planStatus === 'completed' || planStatus === 'past_due') {
      return { removed: false, skipped: true, reason: 'plan_committed' }
    }
    if (plan.amenity_vote_committed_at) {
      return { removed: false, skipped: true, reason: 'vote_committed_at' }
    }
    if ((Number(plan.amount_paid_cents) || 0) > 0) {
      return { removed: false, skipped: true, reason: 'amount_paid' }
    }

    const { data: succeeded } = await supabase
      .from('event_payment_installments')
      .select('id')
      .eq('plan_id', plan.id)
      .eq('status', 'succeeded')
      .limit(1)
      .maybeSingle()
    if (succeeded?.id) {
      return { removed: false, skipped: true, reason: 'succeeded_installment' }
    }
  }

  const nowIso = new Date().toISOString()
  const { error: upErr } = await supabase
    .from('event_parties')
    .update({
      amenity_vote_status: 'removed' as AmenityVoteStatus,
      updated_at: nowIso,
    })
    .eq('id', partyId)
  if (upErr) throw new Error(upErr.message)

  return { removed: true }
}
