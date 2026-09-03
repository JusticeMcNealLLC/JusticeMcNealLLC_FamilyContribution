// Shared payment choice validation + fee math for event RSVP checkout

export const PLATFORM_CARD_FEE_BPS = 290

export type PlanKind = 'full' | 'monthly'
export type PayMethod = 'ach' | 'card'

export function monthsUntilFundDeadline(deadlineStr: unknown): number | null {
  if (!deadlineStr) return null
  const deadline = new Date(String(deadlineStr))
  if (Number.isNaN(deadline.getTime())) return null
  const now = new Date()
  if (deadline <= now) return 0
  let months = (deadline.getFullYear() - now.getFullYear()) * 12
    + (deadline.getMonth() - now.getMonth())
  if (deadline.getDate() >= now.getDate()) months += 1
  return Math.max(1, months)
}

export function resolveCardFeeBps(event: Record<string, unknown>): number {
  const raw = event?.card_fee_bps
  if (raw != null && Number.isFinite(Number(raw)) && Number(raw) >= 0) {
    return Number(raw)
  }
  return PLATFORM_CARD_FEE_BPS
}

export function cardTotalCents(baseCents: number, feeBps: number): number {
  const base = Math.max(0, Number(baseCents) || 0)
  const bps = Math.max(0, Number(feeBps) || 0)
  if (base <= 0) return 0
  if (bps <= 0) return base
  return Math.ceil((base * 10000) / (10000 - bps))
}

export function enabledPlanKinds(event: Record<string, unknown>): PlanKind[] {
  const kinds: PlanKind[] = ['full']
  const months = monthsUntilFundDeadline(event?.fund_deadline)
  if (event?.fund_deadline && months && months > 0) kinds.push('monthly')
  return kinds
}

export function enabledMethods(event: Record<string, unknown>): PayMethod[] {
  const methods: PayMethod[] = []
  if (event?.ach_payments_enabled !== false) methods.push('ach')
  if (event?.card_payments_enabled !== false) methods.push('card')
  if (!methods.length) methods.push('card')
  return methods
}

export function needsPaymentChoice(event: Record<string, unknown>, seatPriceCents: number): boolean {
  if (event?.pricing_mode !== 'paid') return false
  return (Number(seatPriceCents) || 0) > 0
}

export function resolveCheckoutTotals(
  event: Record<string, unknown>,
  seatPriceCents: number,
  method: PayMethod,
): { baseCents: number; feeCents: number; checkoutTotalCents: number } {
  const baseCents = Math.max(0, Number(seatPriceCents) || 0)
  const feeBps = resolveCardFeeBps(event)
  if (method === 'card') {
    const checkoutTotalCents = cardTotalCents(baseCents, feeBps)
    return { baseCents, feeCents: checkoutTotalCents - baseCents, checkoutTotalCents }
  }
  return { baseCents, feeCents: 0, checkoutTotalCents: baseCents }
}

export function validateChoice(
  event: Record<string, unknown>,
  seatPriceCents: number,
  planKindRaw: unknown,
  methodRaw: unknown,
): string | null {
  if (!needsPaymentChoice(event, seatPriceCents)) return null

  const planKind = String(planKindRaw || '').trim() as PlanKind
  const method = String(methodRaw || '').trim() as PayMethod
  const plans = enabledPlanKinds(event)
  const methods = enabledMethods(event)

  if (!planKind || !plans.includes(planKind)) {
    return 'Please choose a payment schedule (pay in full or monthly).'
  }
  if (!method || !methods.includes(method)) {
    return 'Please choose a payment method (bank or card).'
  }
  return null
}
