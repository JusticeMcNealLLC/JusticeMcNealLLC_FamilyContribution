// Monthly payment schedule builder for event payment plans (§13.10)

import { monthsUntilFundDeadline } from './payment-choice.ts'

export type ScheduledInstallmentRow = {
  sequence: number
  due_at: string
  amount_cents: number
  kind: 'scheduled'
}

/** Add calendar months; clamp day when target month is shorter (e.g. Jan 31 → Feb 28). */
export function addMonthsClamped(date: Date, months: number): Date {
  const src = new Date(date.getTime())
  const day = src.getDate()
  const result = new Date(src.getTime())
  result.setDate(1)
  result.setMonth(result.getMonth() + months)
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate()
  result.setDate(Math.min(day, lastDay))
  result.setHours(src.getHours(), src.getMinutes(), src.getSeconds(), src.getMilliseconds())
  return result
}

/**
 * Pre-generate monthly installments: amounts = remaining ÷ months left (ceil),
 * last row takes remainder so sum === totalDueCents.
 */
export function buildMonthlyInstallmentRows(args: {
  totalDueCents: number
  anchorAt: Date | string
  fundDeadline: Date | string
  /** When set, uses this month count; otherwise monthsUntilFundDeadline(fundDeadline) from now. */
  monthCount?: number | null
}): ScheduledInstallmentRow[] {
  const totalDue = Math.max(0, Math.floor(Number(args.totalDueCents) || 0))
  const anchor = args.anchorAt instanceof Date ? args.anchorAt : new Date(String(args.anchorAt))
  const deadline = args.fundDeadline instanceof Date
    ? args.fundDeadline
    : new Date(String(args.fundDeadline))

  if (Number.isNaN(anchor.getTime()) || Number.isNaN(deadline.getTime())) {
    throw new Error('Invalid anchor or fund deadline for monthly schedule')
  }

  let n = args.monthCount != null && Number.isFinite(Number(args.monthCount))
    ? Math.max(0, Math.floor(Number(args.monthCount)))
    : (monthsUntilFundDeadline(deadline.toISOString()) ?? 0)

  // Prefer months from anchor→deadline when generating at plan create (anchor ≈ now)
  if (args.monthCount == null) {
    const fromAnchor = monthsBetweenInclusive(anchor, deadline)
    if (fromAnchor != null && fromAnchor > 0) n = fromAnchor
  }

  if (n < 1 || totalDue <= 0) {
    throw new Error('Monthly schedule requires a fund deadline with at least one month remaining')
  }

  const rows: ScheduledInstallmentRow[] = []
  let left = totalDue

  for (let i = 0; i < n; i++) {
    const open = n - i
    const amount = i === n - 1 ? left : Math.ceil(left / open)
    left -= amount

    let due = i === 0 ? new Date(anchor.getTime()) : addMonthsClamped(anchor, i)
    if (due.getTime() > deadline.getTime()) {
      due = new Date(deadline.getTime())
    }

    rows.push({
      sequence: i + 1,
      due_at: due.toISOString(),
      amount_cents: amount,
      kind: 'scheduled',
    })
  }

  return rows
}

/** Months from anchor to deadline using same inclusivity rules as monthsUntilFundDeadline. */
function monthsBetweenInclusive(anchor: Date, deadline: Date): number | null {
  if (deadline <= anchor) return 0
  let months = (deadline.getFullYear() - anchor.getFullYear()) * 12
    + (deadline.getMonth() - anchor.getMonth())
  if (deadline.getDate() >= anchor.getDate()) months += 1
  return Math.max(1, months)
}
