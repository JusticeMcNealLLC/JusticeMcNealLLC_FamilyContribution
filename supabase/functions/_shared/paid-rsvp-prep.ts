// Pre-checkout RSVP + party/seat + payment plan stub for paid event checkout (§13.8 MVP)

import {
  normalizeIncludedItems,
  parseSeatOptionsMetadata,
} from './included-items.ts'
import {
  acksPayload,
  normalizeDisclaimers,
  parseAckIds,
  parseAcksMetadata,
} from './disclaimers.ts'
import { commitPartyAmenityVote, needsVote, resolveVoteStatus } from './amenity-voting.ts'
import {
  type PayMethod,
  type PlanKind,
  monthsUntilFundDeadline,
  resolveCheckoutTotals,
} from './payment-choice.ts'
import { buildMonthlyInstallmentRows } from './payment-schedule.ts'
import {
  ensurePartyAndSeats,
  normalizePartySeats,
  partyBaseTotalCents,
  validatePartySeats,
  type PartySeatInput,
  type SeatInfoTokenRow,
} from './party-seats.ts'

export type PreparePaidRsvpContext = {
  event: Record<string, unknown> & { id: string }
  seats?: PartySeatInput[]
  seatRole?: 'adult' | 'kid'
  seatOptions?: unknown
  disclaimerAcks: unknown
  amenityVoteOptionId?: string | null
  planKind: PlanKind
  method: PayMethod
  payer: {
    kind: 'member'
    userId: string
    email?: string | null
    displayName?: string | null
    phone?: string | null
  } | {
    kind: 'guest'
    guestName: string
    guestEmail: string
    guestPhone: string | null
    guestToken?: string | null
  }
}

export type PreparePaidRsvpResult = {
  party_id: string
  plan_id: string
  installment_id: string
  rsvp_id: string
  guest_token?: string
  seat_info_tokens?: SeatInfoTokenRow[]
  fully_credited?: boolean
  credited_cents?: number
  remaining_cents?: number
}

/**
 * Sum succeeded payments already taken for this payer+event across cancelled/completed plans.
 * Used so rejoin does not charge again for money already collected (no double-count by plan id).
 */
export async function sumPriorPaymentCredit(
  supabase: any,
  args: {
    eventId: string
    payerUserId?: string | null
    payerGuestRsvpId?: string | null
    excludePartyId?: string | null
  },
): Promise<number> {
  const eventId = String(args.eventId || '').trim()
  if (!eventId) return 0

  let partyQuery = supabase
    .from('event_parties')
    .select('id')
    .eq('event_id', eventId)

  if (args.payerUserId) {
    partyQuery = partyQuery.eq('payer_user_id', String(args.payerUserId))
  } else if (args.payerGuestRsvpId) {
    partyQuery = partyQuery.eq('payer_guest_rsvp_id', String(args.payerGuestRsvpId))
  } else {
    return 0
  }

  const { data: parties, error: partyErr } = await partyQuery
  if (partyErr) throw new Error(partyErr.message)
  const partyIds = (parties || [])
    .map((p: { id?: string }) => String(p.id || ''))
    .filter((id: string) => id && id !== String(args.excludePartyId || ''))
  if (!partyIds.length) return 0

  const { data: plans, error: planErr } = await supabase
    .from('event_payment_plans')
    .select('id, amount_paid_cents, status')
    .eq('event_id', eventId)
    .in('party_id', partyIds)
    .in('status', ['cancelled', 'completed'])
  if (planErr) throw new Error(planErr.message)

  let credited = 0
  const seen = new Set<string>()
  for (const plan of plans || []) {
    const id = String(plan?.id || '')
    if (!id || seen.has(id)) continue
    seen.add(id)
    credited += Math.max(0, Number(plan?.amount_paid_cents) || 0)
  }
  return credited
}

function snapshotFundDeadline(event: Record<string, unknown>, anchorAt: Date): string {
  const raw = event.fund_deadline ?? event.start_date
  if (raw) {
    const d = new Date(String(raw))
    if (!Number.isNaN(d.getTime())) return d.toISOString()
  }
  return anchorAt.toISOString()
}

async function upsertMemberRsvp(
  supabase: any,
  eventId: string,
  userId: string,
): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from('event_rsvps')
    .upsert(
      { event_id: eventId, user_id: userId, status: 'going', paid: false },
      { onConflict: 'event_id,user_id' },
    )
    .select('id, paid')
    .single()
  if (error) throw new Error(error.message)
  if (data?.paid) throw new Error('You have already paid for this RSVP')
  return { id: data.id as string }
}

async function upsertGuestRsvp(
  supabase: any,
  eventId: string,
  guestName: string,
  guestEmail: string,
  guestPhone: string | null,
  guestToken: string,
): Promise<{ id: string; guest_token: string }> {
  const email = guestEmail.trim().toLowerCase()
  const { data: existing } = await supabase
    .from('event_guest_rsvps')
    .select('id, guest_token, paid')
    .eq('event_id', eventId)
    .ilike('guest_email', email)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (existing?.paid) throw new Error('This email already has a paid RSVP for this event')

  const token = existing?.guest_token || guestToken

  const { data, error } = await supabase
    .from('event_guest_rsvps')
    .upsert(
      {
        event_id: eventId,
        guest_name: guestName.trim(),
        guest_email: email,
        guest_phone: guestPhone,
        guest_token: token,
        status: 'going',
        paid: false,
      },
      { onConflict: 'event_id,guest_email' },
    )
    .select('id, guest_token')
    .single()
  if (error) throw new Error(error.message)
  return { id: data.id as string, guest_token: data.guest_token as string }
}

async function ensurePaymentPlanStub(
  supabase: any,
  args: {
    partyId: string
    eventId: string
    planKind: PlanKind
    method: PayMethod
    baseCents: number
    feeCents: number
    totalDueCents: number
    fundDeadline: string
    anchorAt: string
    creditedCents?: number
  },
): Promise<{ plan_id: string; installment_id: string; remaining_cents: number; fully_credited: boolean }> {
  const {
    partyId,
    eventId,
    planKind,
    method,
    baseCents,
    feeCents,
    totalDueCents,
    fundDeadline,
    anchorAt,
  } = args

  const creditedCents = Math.max(0, Math.min(totalDueCents, Number(args.creditedCents) || 0))
  const remainingCents = Math.max(0, totalDueCents - creditedCents)
  const fullyCredited = remainingCents <= 0

  let monthlyRows: ReturnType<typeof buildMonthlyInstallmentRows> | null = null
  let nextDebitAt: string | null = null

  if (!fullyCredited && planKind === 'monthly') {
    monthlyRows = buildMonthlyInstallmentRows({
      totalDueCents: remainingCents,
      anchorAt,
      fundDeadline,
    })
    nextDebitAt = monthlyRows[0]?.due_at || anchorAt
  }

  const planPayload = {
    party_id: partyId,
    event_id: eventId,
    plan_kind: planKind,
    method,
    currency: 'usd',
    base_total_cents: baseCents,
    fee_cents: feeCents,
    total_due_cents: totalDueCents,
    amount_paid_cents: creditedCents,
    remaining_cents: remainingCents,
    fund_deadline: fundDeadline,
    anchor_at: anchorAt,
    next_debit_at: fullyCredited ? null : nextDebitAt,
    status: fullyCredited ? 'completed' : 'setup',
    updated_at: new Date().toISOString(),
  }

  const { data: existingPlan } = await supabase
    .from('event_payment_plans')
    .select('id, status')
    .eq('party_id', partyId)
    .maybeSingle()

  let planId: string
  if (existingPlan?.id) {
    if (existingPlan.status === 'completed' || existingPlan.status === 'cancelled') {
      throw new Error('Payment plan is no longer open for this RSVP')
    }
    const { error: upErr } = await supabase
      .from('event_payment_plans')
      .update(planPayload)
      .eq('id', existingPlan.id)
    if (upErr) throw new Error(upErr.message)
    planId = existingPlan.id as string
  } else {
    const { data: created, error: insErr } = await supabase
      .from('event_payment_plans')
      .insert(planPayload)
      .select('id')
      .single()
    if (insErr) throw new Error(insErr.message)
    planId = created.id as string
  }

  const nowIso = new Date().toISOString()

  await supabase
    .from('event_payment_installments')
    .update({ status: 'cancelled', updated_at: nowIso })
    .eq('plan_id', planId)
    .eq('status', 'pending')

  if (fullyCredited) {
    // Credit-only plan: no pending Stripe installment
    const { data: existingInst } = await supabase
      .from('event_payment_installments')
      .select('id')
      .eq('plan_id', planId)
      .eq('sequence', 1)
      .maybeSingle()

    const creditInst = {
      plan_id: planId,
      event_id: eventId,
      party_id: partyId,
      sequence: 1,
      kind: 'full' as const,
      due_at: nowIso,
      amount_cents: totalDueCents,
      status: 'succeeded',
      updated_at: nowIso,
    }

    let installmentId: string
    if (existingInst?.id) {
      const { error: instUpErr } = await supabase
        .from('event_payment_installments')
        .update(creditInst)
        .eq('id', existingInst.id)
      if (instUpErr) throw new Error(instUpErr.message)
      installmentId = existingInst.id as string
    } else {
      const { data: inst, error: instErr } = await supabase
        .from('event_payment_installments')
        .insert(creditInst)
        .select('id')
        .single()
      if (instErr) throw new Error(instErr.message)
      installmentId = inst.id as string
    }
    return {
      plan_id: planId,
      installment_id: installmentId,
      remaining_cents: 0,
      fully_credited: true,
    }
  }

  if (planKind === 'monthly' && monthlyRows) {
    // Cancel any leftover pending after rebuild; insert/upsert each sequence
    let firstInstallmentId: string | null = null

    for (const row of monthlyRows) {
      const { data: existingInst } = await supabase
        .from('event_payment_installments')
        .select('id')
        .eq('plan_id', planId)
        .eq('sequence', row.sequence)
        .maybeSingle()

      const instPayload = {
        plan_id: planId,
        event_id: eventId,
        party_id: partyId,
        sequence: row.sequence,
        kind: 'scheduled' as const,
        due_at: row.due_at,
        amount_cents: row.amount_cents,
        status: 'pending',
        updated_at: nowIso,
      }

      let id: string
      if (existingInst?.id) {
        const { error: instUpErr } = await supabase
          .from('event_payment_installments')
          .update(instPayload)
          .eq('id', existingInst.id)
        if (instUpErr) throw new Error(instUpErr.message)
        id = existingInst.id as string
      } else {
        const { data: inst, error: instErr } = await supabase
          .from('event_payment_installments')
          .insert(instPayload)
          .select('id')
          .single()
        if (instErr) throw new Error(instErr.message)
        id = inst.id as string
      }
      if (row.sequence === 1) firstInstallmentId = id
    }

    if (!firstInstallmentId) {
      throw new Error('Failed to create first monthly installment')
    }

    // Cancel pending rows beyond generated sequences (plan shortened)
    const maxSeq = monthlyRows.length
    await supabase
      .from('event_payment_installments')
      .update({ status: 'cancelled', updated_at: nowIso })
      .eq('plan_id', planId)
      .eq('status', 'pending')
      .gt('sequence', maxSeq)

    return {
      plan_id: planId,
      installment_id: firstInstallmentId,
      remaining_cents: remainingCents,
      fully_credited: false,
    }
  }

  // Full pay: single installment for remaining balance
  const { data: existingInst } = await supabase
    .from('event_payment_installments')
    .select('id')
    .eq('plan_id', planId)
    .eq('sequence', 1)
    .maybeSingle()

  const instPayload = {
    plan_id: planId,
    event_id: eventId,
    party_id: partyId,
    sequence: 1,
    kind: 'full' as const,
    due_at: nowIso,
    amount_cents: remainingCents,
    status: 'pending',
    updated_at: nowIso,
  }

  let installmentId: string
  if (existingInst?.id) {
    const { error: instUpErr } = await supabase
      .from('event_payment_installments')
      .update(instPayload)
      .eq('id', existingInst.id)
    if (instUpErr) throw new Error(instUpErr.message)
    installmentId = existingInst.id as string
  } else {
    const { data: inst, error: instErr } = await supabase
      .from('event_payment_installments')
      .insert(instPayload)
      .select('id')
      .single()
    if (instErr) throw new Error(instErr.message)
    installmentId = inst.id as string
  }

  await supabase
    .from('event_payment_installments')
    .update({ status: 'cancelled', updated_at: nowIso })
    .eq('plan_id', planId)
    .eq('status', 'pending')
    .neq('id', installmentId)

  return {
    plan_id: planId,
    installment_id: installmentId,
    remaining_cents: remainingCents,
    fully_credited: false,
  }
}

/**
 * Create or refresh unpaid RSVP, pending party/seat, and payment plan stub before Stripe redirect.
 */
export async function preparePaidRsvpForCheckout(
  supabase: any,
  ctx: PreparePaidRsvpContext,
): Promise<PreparePaidRsvpResult> {
  const { event, disclaimerAcks, planKind, method, payer } = ctx
  const eventId = event.id
  const catalog = normalizeIncludedItems(event.included_items)
  const discCatalog = normalizeDisclaimers(event.disclaimers)
  const ackIds = parseAckIds(disclaimerAcks)
  const disclaimerAckPayload = acksPayload(discCatalog, ackIds)
  const voteRequired = needsVote(event)
  const amenityVoteOptionId = voteRequired
    ? String(ctx.amenityVoteOptionId || '').trim() || null
    : null

  let displayName = ''
  let phone: string | null = null

  if (payer.kind === 'member') {
    if (payer.displayName) {
      displayName = payer.displayName.trim()
    } else {
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone')
        .eq('id', payer.userId)
        .maybeSingle()
      displayName = (
        [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')
        || payer.email
        || 'Member'
      ).trim()
      phone = payer.phone || profile?.phone || null
    }
    if (payer.phone) phone = payer.phone
  } else {
    displayName = payer.guestName.trim()
    phone = payer.guestPhone
  }

  const seats = normalizePartySeats(ctx.seats, {
    seatRole: ctx.seatRole,
    seatOptions: ctx.seatOptions,
    displayName,
    phone,
  })
  const seatsErr = validatePartySeats(event, seats, catalog, { allowIncompleteGuests: true })
  if (seatsErr) throw new Error(seatsErr)

  const baseCents = partyBaseTotalCents(event, seats)
  if (baseCents <= 0) {
    throw new Error('This party is free — complete RSVP without checkout')
  }

  const checkoutTotals = resolveCheckoutTotals(event, baseCents, method)
  const voteStatus = amenityVoteOptionId ? resolveVoteStatus(baseCents) : undefined
  const anchorAt = new Date()
  const fundDeadline = snapshotFundDeadline(event, anchorAt)

  if (planKind === 'monthly') {
    const months = monthsUntilFundDeadline(event.fund_deadline || fundDeadline)
    if (!event.fund_deadline || !months || months < 1) {
      throw new Error('Monthly payments require a fund deadline with at least one month remaining.')
    }
  }

  let rsvpId: string
  let guestToken: string | undefined

  if (payer.kind === 'member') {
    const rsvp = await upsertMemberRsvp(supabase, eventId, payer.userId)
    rsvpId = rsvp.id
  } else {
    const token = payer.guestToken?.trim() || crypto.randomUUID()
    const guestRsvp = await upsertGuestRsvp(
      supabase,
      eventId,
      payer.guestName,
      payer.guestEmail,
      payer.guestPhone,
      token,
    )
    rsvpId = guestRsvp.id
    guestToken = guestRsvp.guest_token
  }

  const payerSeats = seats.map((s) => (
    s.is_payer ? { ...s, phone } : s
  ))

  const party = await ensurePartyAndSeats({
    supabase,
    eventId,
    catalog,
    seats: payerSeats,
    partyStatus: 'pending_payment',
    disclaimerAcks: disclaimerAckPayload.length ? disclaimerAckPayload : undefined,
    amenityVoteOptionId,
    amenityVoteStatus: voteStatus,
    payer: payer.kind === 'member'
      ? { kind: 'member', userId: payer.userId, rsvpId }
      : { kind: 'guest', guestRsvpId: rsvpId },
  })

  await supabase
    .from('event_parties')
    .update({ status: 'pending_payment', updated_at: new Date().toISOString() })
    .eq('id', party.party_id)
    .neq('status', 'active')

  const creditedCents = await sumPriorPaymentCredit(supabase, {
    eventId,
    payerUserId: payer.kind === 'member' ? payer.userId : null,
    payerGuestRsvpId: payer.kind === 'guest' ? rsvpId : null,
    excludePartyId: party.party_id,
  })

  const { plan_id, installment_id, remaining_cents, fully_credited } = await ensurePaymentPlanStub(supabase, {
    partyId: party.party_id,
    eventId,
    planKind,
    method,
    baseCents: checkoutTotals.baseCents,
    feeCents: checkoutTotals.feeCents,
    totalDueCents: checkoutTotals.checkoutTotalCents,
    fundDeadline,
    anchorAt: anchorAt.toISOString(),
    creditedCents,
  })

  if (fully_credited) {
    const nowIso = new Date().toISOString()
    if (payer.kind === 'member') {
      await supabase
        .from('event_rsvps')
        .update({ paid: true, status: 'going', updated_at: nowIso })
        .eq('id', rsvpId)
    } else {
      await supabase
        .from('event_guest_rsvps')
        .update({ paid: true, status: 'going', updated_at: nowIso })
        .eq('id', rsvpId)
    }
    await supabase
      .from('event_parties')
      .update({ status: 'active', updated_at: nowIso })
      .eq('id', party.party_id)
  }

  return {
    party_id: party.party_id,
    plan_id,
    installment_id,
    rsvp_id: rsvpId,
    seat_info_tokens: party.seat_info_tokens || [],
    fully_credited: !!fully_credited,
    credited_cents: creditedCents,
    remaining_cents,
    ...(guestToken ? { guest_token: guestToken } : {}),
  }
}

export type CompletePaidRsvpResult = {
  usedPrepPath: boolean
  rsvpId?: string
  guestRsvpId?: string
  alreadyComplete?: boolean
}

/** Persist Stripe Customer + PaymentMethod on a payment plan (§13.10 ACH collect). */
export async function persistPlanStripeIds(
  supabase: any,
  planId: string,
  ids: { customerId?: string | null; paymentMethodId?: string | null },
): Promise<void> {
  if (!planId) return
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (ids.customerId) update.stripe_customer_id = String(ids.customerId)
  if (ids.paymentMethodId) update.stripe_payment_method_id = String(ids.paymentMethodId)
  if (!ids.customerId && !ids.paymentMethodId) return
  await supabase.from('event_payment_plans').update(update).eq('id', planId)
}

/** §13.10 full pay — force terminal schedule state (remaining 0, no next debit). */
export async function enforceFullPlanCompleted(
  supabase: any,
  planId: string,
  args?: {
    totalDueCents?: number | null
    amountPaidFallback?: number | null
    customerId?: string | null
    paymentMethodId?: string | null
    amenityVoteCommitted?: boolean
  },
): Promise<void> {
  if (!planId) return
  const nowIso = new Date().toISOString()
  const { data: plan } = await supabase
    .from('event_payment_plans')
    .select('total_due_cents')
    .eq('id', planId)
    .maybeSingle()

  const totalDue = Number.isFinite(Number(args?.totalDueCents))
    ? Number(args?.totalDueCents)
    : (Number(plan?.total_due_cents) || Number(args?.amountPaidFallback) || 0)

  const update: Record<string, unknown> = {
    status: 'completed',
    remaining_cents: 0,
    amount_paid_cents: Math.max(0, totalDue),
    next_debit_at: null,
    updated_at: nowIso,
  }
  if (args?.customerId) update.stripe_customer_id = String(args.customerId)
  if (args?.paymentMethodId) update.stripe_payment_method_id = String(args.paymentMethodId)
  if (args?.amenityVoteCommitted) update.amenity_vote_committed_at = nowIso

  await supabase.from('event_payment_plans').update(update).eq('id', planId)
}

async function cancelLeftoverPendingInstallments(
  supabase: any,
  planId: string,
  exceptInstallmentId?: string | null,
): Promise<void> {
  if (!planId) return
  let q = supabase
    .from('event_payment_installments')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('plan_id', planId)
    .eq('status', 'pending')
  if (exceptInstallmentId) q = q.neq('id', exceptInstallmentId)
  await q
}

/** Earliest pending/failed installment due_at for monthly next_debit_at. */
async function nextPendingDebitAt(
  supabase: any,
  planId: string,
): Promise<string | null> {
  const { data: rows } = await supabase
    .from('event_payment_installments')
    .select('due_at, status')
    .eq('plan_id', planId)
    .in('status', ['pending', 'failed'])
    .order('due_at', { ascending: true })
    .limit(1)
  const due = rows?.[0]?.due_at
  return due ? String(due) : null
}

/**
 * Complete pre-created RSVP/party/plan after Stripe checkout.
 * Returns usedPrepPath=false when metadata lacks party_id (caller should use legacy path).
 */
export async function completePaidRsvpAfterCheckout(
  supabase: any,
  args: {
    session: {
      metadata?: Record<string, string> | null
      amount_total?: number | null
      payment_intent?: string | null
      customer?: string | null
    }
    eventId: string
    amountPaid: number
    paymentIntentId: string | null
    isGuest: boolean
    /** Resolved from session / PaymentIntent (§13.10 ACH PM collect) */
    paymentMethodId?: string | null
    customerId?: string | null
  },
): Promise<CompletePaidRsvpResult> {
  const { session, eventId, amountPaid, paymentIntentId, isGuest } = args
  const meta = session.metadata || {}
  const partyId = meta.party_id ? String(meta.party_id).trim() : ''
  const planId = meta.plan_id ? String(meta.plan_id).trim() : ''
  const installmentId = meta.installment_id ? String(meta.installment_id).trim() : ''
  const customerId = args.customerId || (session.customer ? String(session.customer) : null)
  const paymentMethodId = args.paymentMethodId ? String(args.paymentMethodId) : null

  if (!partyId || meta.jm_type !== 'event_party_plan') {
    return { usedPrepPath: false }
  }

  const { data: party, error: partyErr } = await supabase
    .from('event_parties')
    .select('id, status, amenity_vote_option_id, payer_kind, payer_user_id, payer_guest_rsvp_id')
    .eq('id', partyId)
    .maybeSingle()
  if (partyErr) throw new Error(partyErr.message)
  if (!party?.id) {
    console.error('Party not found for checkout completion:', partyId)
    return { usedPrepPath: true }
  }

  if (party.status === 'active' && planId) {
    const { data: planRow } = await supabase
      .from('event_payment_plans')
      .select('status, plan_kind, total_due_cents')
      .eq('id', planId)
      .maybeSingle()
    if (planRow?.status === 'completed' || planRow?.status === 'active') {
      // Still attach Customer/PM if checkout/PI delivered them after first complete
      await persistPlanStripeIds(supabase, planId, { customerId, paymentMethodId })
      const isFull = String(meta.plan_kind || planRow.plan_kind || 'full').trim() !== 'monthly'
      if (isFull) {
        await enforceFullPlanCompleted(supabase, planId, {
          totalDueCents: planRow.total_due_cents,
          amountPaidFallback: amountPaid,
          customerId,
          paymentMethodId,
        })
        await cancelLeftoverPendingInstallments(supabase, planId, installmentId || null)
      }
      return {
        usedPrepPath: true,
        alreadyComplete: true,
        guestRsvpId: party.payer_guest_rsvp_id || undefined,
        rsvpId: undefined,
      }
    }
  }

  const nowIso = new Date().toISOString()
  const planKind = String(meta.plan_kind || 'full').trim() === 'monthly' ? 'monthly' : 'full'
  const amenityVoteOptionId = (
    meta.amenity_vote_option_id || party.amenity_vote_option_id || ''
  ).trim() || null

  let rsvpId: string | undefined
  let guestRsvpId: string | undefined

  if (isGuest) {
    const guestEmail = meta.guest_email?.trim().toLowerCase()
    const guestName = meta.guest_name
    const guestToken = meta.guest_token
    if (!guestEmail || !guestName || !guestToken) {
      console.error('Missing guest metadata for prep-path RSVP completion')
      return { usedPrepPath: true }
    }

    const { data: guestRsvp, error: guestErr } = await supabase
      .from('event_guest_rsvps')
      .upsert({
        event_id: eventId,
        guest_name: guestName,
        guest_email: guestEmail,
        guest_phone: meta.guest_phone || null,
        guest_token: guestToken,
        status: 'going',
        paid: true,
        stripe_payment_intent_id: paymentIntentId,
        amount_paid_cents: amountPaid,
        accepted_no_refund_policy: true,
        accepted_no_refund_at: nowIso,
        party_id: partyId,
      }, { onConflict: 'event_id,guest_email' })
      .select('id, paid')
      .single()
    if (guestErr) throw new Error(guestErr.message)
    guestRsvpId = guestRsvp?.id as string
    rsvpId = guestRsvpId
  } else {
    const userId = meta.supabase_user_id
    if (!userId) {
      console.error('Missing supabase_user_id for prep-path member completion')
      return { usedPrepPath: true }
    }

    const { data: memberRsvp, error: rsvpErr } = await supabase
      .from('event_rsvps')
      .upsert({
        event_id: eventId,
        user_id: userId,
        status: 'going',
        paid: true,
        stripe_payment_intent_id: paymentIntentId,
        amount_paid_cents: amountPaid,
        accepted_no_refund_policy: true,
        accepted_no_refund_at: nowIso,
        party_id: partyId,
        ...(meta.invest_eligible_acknowledged === 'true' ? {
          invest_eligible_acknowledged: true,
          invest_eligible_acknowledged_at: nowIso,
        } : {}),
      }, { onConflict: 'event_id,user_id' })
      .select('id, paid')
      .single()
    if (rsvpErr) throw new Error(rsvpErr.message)
    rsvpId = memberRsvp?.id as string
  }

  const partyUpdate: Record<string, unknown> = {
    status: 'active',
    updated_at: nowIso,
  }
  await supabase.from('event_parties').update(partyUpdate).eq('id', partyId)
  await commitPartyAmenityVote(supabase, {
    partyId,
    optionId: amenityVoteOptionId,
  })

  if (planId) {
    const { data: plan } = await supabase
      .from('event_payment_plans')
      .select('total_due_cents, amount_paid_cents')
      .eq('id', planId)
      .maybeSingle()

    if (planKind === 'full') {
      await enforceFullPlanCompleted(supabase, planId, {
        totalDueCents: plan?.total_due_cents,
        amountPaidFallback: amountPaid,
        customerId,
        paymentMethodId,
        amenityVoteCommitted: !!amenityVoteOptionId,
      })
    } else {
      const prevPaid = Number(plan?.amount_paid_cents) || 0
      const totalDue = Number(plan?.total_due_cents) || amountPaid
      const newPaid = prevPaid + amountPaid
      const remaining = Math.max(0, totalDue - newPaid)
      const planStatus = remaining <= 0 ? 'completed' : 'active'
      const nextDebit = remaining > 0
        ? await nextPendingDebitAt(supabase, planId)
        : null

      const planUpdate: Record<string, unknown> = {
        amount_paid_cents: newPaid,
        remaining_cents: remaining,
        status: planStatus,
        updated_at: nowIso,
        next_debit_at: nextDebit,
      }
      if (customerId) planUpdate.stripe_customer_id = customerId
      if (paymentMethodId) planUpdate.stripe_payment_method_id = paymentMethodId
      if (amenityVoteOptionId) planUpdate.amenity_vote_committed_at = nowIso

      await supabase.from('event_payment_plans').update(planUpdate).eq('id', planId)
    }
  }

  if (installmentId) {
    await supabase.from('event_payment_installments').update({
      status: 'succeeded',
      stripe_payment_intent_id: paymentIntentId,
      succeeded_at: nowIso,
      updated_at: nowIso,
    }).eq('id', installmentId)
  }

  // After marking installment succeeded, refresh next_debit for monthly
  if (planId && planKind === 'monthly') {
    const nextDebit = await nextPendingDebitAt(supabase, planId)
    await supabase.from('event_payment_plans').update({
      next_debit_at: nextDebit,
      updated_at: nowIso,
    }).eq('id', planId)
  }

  if (planId && planKind === 'full') {
    await cancelLeftoverPendingInstallments(supabase, planId, installmentId || null)
  }

  try {
    const { data: eventForOpts } = await supabase
      .from('events')
      .select('included_items, disclaimers')
      .eq('id', eventId)
      .single()
    const catalog = normalizeIncludedItems(eventForOpts?.included_items)
    const discCatalog = normalizeDisclaimers(eventForOpts?.disclaimers)
    const seatRole = meta.seat_role === 'kid' ? 'kid' : 'adult'
    const seatOptions = parseSeatOptionsMetadata(meta.seat_options)
    const ackIds = parseAcksMetadata(meta.disclaimer_acks)
    const disclaimerAcks = acksPayload(discCatalog, ackIds)

    const { count: existingSeatCount } = await supabase
      .from('event_seats')
      .select('id', { count: 'exact', head: true })
      .eq('party_id', partyId)

    if ((existingSeatCount || 0) > 0) {
      return {
        usedPrepPath: true,
        rsvpId: isGuest ? undefined : rsvpId,
        guestRsvpId,
      }
    }

    if (isGuest && guestRsvpId) {
      await ensurePartyAndSeats({
        supabase,
        eventId,
        catalog,
        seats: normalizePartySeats(null, {
          seatRole,
          seatOptions,
          displayName: meta.guest_name || 'Guest',
          phone: meta.guest_phone || null,
        }),
        partyStatus: 'active',
        disclaimerAcks: disclaimerAcks.length ? disclaimerAcks : undefined,
        amenityVoteOptionId,
        amenityVoteStatus: amenityVoteOptionId ? 'counted' : undefined,
        payer: { kind: 'guest', guestRsvpId },
      })
    } else if (!isGuest && rsvpId && meta.supabase_user_id) {
      const userId = meta.supabase_user_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone')
        .eq('id', userId)
        .maybeSingle()
      const displayName = (
        [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')
        || 'Member'
      ).trim()
      await ensurePartyAndSeats({
        supabase,
        eventId,
        catalog,
        seats: normalizePartySeats(null, {
          seatRole,
          seatOptions,
          displayName,
          phone: profile?.phone || null,
        }),
        partyStatus: 'active',
        disclaimerAcks: disclaimerAcks.length ? disclaimerAcks : undefined,
        amenityVoteOptionId,
        amenityVoteStatus: amenityVoteOptionId ? 'counted' : undefined,
        payer: { kind: 'member', userId, rsvpId },
      })
    }
  } catch (mergeErr) {
    console.error('Prep-path party/seat merge failed:', mergeErr)
  }

  return {
    usedPrepPath: true,
    rsvpId: isGuest ? undefined : rsvpId,
    guestRsvpId,
  }
}
