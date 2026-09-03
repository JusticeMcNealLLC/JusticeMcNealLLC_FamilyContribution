// Shared event seat pricing helpers for RSVP edges

export type SeatRole = 'adult' | 'kid'

export function normalizeSeatRole(raw: unknown): SeatRole {
  const v = String(raw || '').trim().toLowerCase()
  return v === 'kid' ? 'kid' : 'adult'
}

export function adultPriceCents(event: Record<string, unknown>): number {
  if (event?.adult_price_cents != null && Number.isFinite(Number(event.adult_price_cents))) {
    return Math.max(0, Number(event.adult_price_cents))
  }
  return Math.max(0, Number(event?.rsvp_cost_cents || 0))
}

export function seatPriceCents(event: Record<string, unknown>, role: SeatRole): number {
  if (role === 'kid') {
    if (event?.kids_free !== false) return 0
    const kid = Number(event?.kid_price_cents)
    return Number.isFinite(kid) && kid >= 0 ? kid : 0
  }
  return adultPriceCents(event)
}

export function seatCountsTowardCapacity(event: Record<string, unknown>, role: SeatRole): boolean {
  if (role === 'adult') return true
  const counts = String(event?.capacity_counts || 'adults').trim()
  return counts === 'all'
}

export function validateSeatRoleForEvent(event: Record<string, unknown>, role: SeatRole): void {
  if (role !== 'kid') return
  if (event?.kids_free === false) {
    const kid = event?.kid_price_cents
    if (kid == null || !Number.isFinite(Number(kid)) || Number(kid) < 0) {
      throw new Error('Kid pricing is not configured for this event.')
    }
  }
}
