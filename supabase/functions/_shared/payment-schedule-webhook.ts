// Stripe webhook rollups for event payment installments / plans (§13.10 line 438)

import {
  commitPartyAmenityVote,
  removePartyAmenityVoteIfUncommitted,
} from './amenity-voting.ts'
import { cancelPartyParticipation } from './cancel-party-participation.ts'
import {
  enforceFullPlanCompleted,
  persistPlanStripeIds,
} from './paid-rsvp-prep.ts'

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
 * Idempotent installment success + plan rollup.
 * If installment already succeeded for this PI, only persists Customer/PM (no double-count).
 */
export async function applyInstallmentSucceeded(
  supabase: any,
  args: {
    installmentId: string
    paymentIntentId: string
    amountCents?: number | null
    customerId?: string | null
    paymentMethodId?: string | null
  },
): Promise<{ applied: boolean; planId?: string }> {
  const installmentId = String(args.installmentId || '').trim()
  const paymentIntentId = String(args.paymentIntentId || '').trim()
  if (!installmentId || !paymentIntentId) return { applied: false }

  const { data: inst, error: instErr } = await supabase
    .from('event_payment_installments')
    .select('id, plan_id, amount_cents, status, stripe_payment_intent_id, kind')
    .eq('id', installmentId)
    .maybeSingle()
  if (instErr) throw new Error(instErr.message)
  if (!inst?.id || !inst.plan_id) return { applied: false }

  const planId = String(inst.plan_id)
  const nowIso = new Date().toISOString()
  const alreadySucceeded = inst.status === 'succeeded'
    && (
      !inst.stripe_payment_intent_id
      || String(inst.stripe_payment_intent_id) === paymentIntentId
    )

  await persistPlanStripeIds(supabase, planId, {
    customerId: args.customerId,
    paymentMethodId: args.paymentMethodId,
  })

  if (alreadySucceeded) {
    return { applied: false, planId }
  }

  const creditAmount = Math.max(
    0,
    Number.isFinite(Number(args.amountCents)) && Number(args.amountCents) > 0
      ? Number(args.amountCents)
      : (Number(inst.amount_cents) || 0),
  )

  await supabase.from('event_payment_installments').update({
    status: 'succeeded',
    stripe_payment_intent_id: paymentIntentId,
    succeeded_at: nowIso,
    updated_at: nowIso,
  }).eq('id', installmentId)

  const { data: plan } = await supabase
    .from('event_payment_plans')
    .select('id, party_id, plan_kind, total_due_cents, amount_paid_cents, status, amenity_vote_committed_at')
    .eq('id', planId)
    .maybeSingle()
  if (!plan?.id) return { applied: true, planId }

  const instKind = String(inst.kind || '').trim()
  const planKind = String(plan.plan_kind || 'full').trim() === 'monthly' ? 'monthly' : 'full'
  const partyId = plan.party_id ? String(plan.party_id) : ''

  // Full plans and early payoff both terminate the schedule
  if (planKind === 'full' || instKind === 'payoff') {
    await enforceFullPlanCompleted(supabase, planId, {
      totalDueCents: plan.total_due_cents,
      amountPaidFallback: creditAmount,
      customerId: args.customerId,
      paymentMethodId: args.paymentMethodId,
      amenityVoteCommitted: !plan.amenity_vote_committed_at,
    })
    await supabase
      .from('event_payment_installments')
      .update({ status: 'cancelled', updated_at: nowIso })
      .eq('plan_id', planId)
      .eq('status', 'pending')
      .neq('id', installmentId)
    if (partyId) {
      await commitPartyAmenityVote(supabase, { partyId })
    }
    return { applied: true, planId }
  }

  const prevPaid = Number(plan.amount_paid_cents) || 0
  const totalDue = Number(plan.total_due_cents) || creditAmount
  // Checkout may have already credited this first charge while installment was still processing
  const alreadyCredited = prevPaid >= creditAmount
    && (String(plan.status) === 'active' || String(plan.status) === 'completed')
  const newPaid = alreadyCredited ? prevPaid : prevPaid + creditAmount
  const remaining = Math.max(0, totalDue - newPaid)
  const nextDebit = remaining > 0 ? await nextPendingDebitAt(supabase, planId) : null

  await supabase.from('event_payment_plans').update({
    amount_paid_cents: newPaid,
    remaining_cents: remaining,
    status: remaining <= 0 ? 'completed' : 'active',
    next_debit_at: nextDebit,
    updated_at: nowIso,
  }).eq('id', planId)

  if (partyId && (!plan.amenity_vote_committed_at || String(plan.status) === 'setup')) {
    await commitPartyAmenityVote(supabase, { partyId })
  }

  return { applied: true, planId }
}

export async function applyInstallmentFailed(
  supabase: any,
  args: {
    installmentId: string
    paymentIntentId?: string | null
    failureMessage?: string | null
    /** When true, set plan past_due if active/setup. Default true. */
    markPlanPastDue?: boolean
  },
): Promise<{ applied: boolean; planId?: string }> {
  const installmentId = String(args.installmentId || '').trim()
  if (!installmentId) return { applied: false }

  const { data: inst, error: instErr } = await supabase
    .from('event_payment_installments')
    .select('id, plan_id, status, due_at')
    .eq('id', installmentId)
    .maybeSingle()
  if (instErr) throw new Error(instErr.message)
  if (!inst?.id || !inst.plan_id) return { applied: false }
  if (inst.status === 'succeeded' || inst.status === 'cancelled') {
    return { applied: false, planId: String(inst.plan_id) }
  }

  const planId = String(inst.plan_id)
  const nowIso = new Date().toISOString()
  const update: Record<string, unknown> = {
    status: 'failed',
    updated_at: nowIso,
  }
  if (args.paymentIntentId) update.stripe_payment_intent_id = String(args.paymentIntentId)

  await supabase.from('event_payment_installments').update(update).eq('id', installmentId)

  const markPastDue = args.markPlanPastDue !== false
  if (markPastDue) {
    const { data: plan } = await supabase
      .from('event_payment_plans')
      .select('status')
      .eq('id', planId)
      .maybeSingle()
    const status = String(plan?.status || '')
    if (status === 'active' || status === 'setup' || status === 'past_due') {
      const nextDebit = inst.due_at
        ? String(inst.due_at)
        : await nextPendingDebitAt(supabase, planId)
      await supabase.from('event_payment_plans').update({
        status: 'past_due',
        next_debit_at: nextDebit,
        updated_at: nowIso,
      }).eq('id', planId)
    }
  }

  return { applied: true, planId }
}

export async function applyInstallmentProcessing(
  supabase: any,
  args: {
    installmentId: string
    paymentIntentId?: string | null
  },
): Promise<{ applied: boolean; planId?: string }> {
  const installmentId = String(args.installmentId || '').trim()
  if (!installmentId) return { applied: false }

  const { data: inst, error: instErr } = await supabase
    .from('event_payment_installments')
    .select('id, plan_id, status')
    .eq('id', installmentId)
    .maybeSingle()
  if (instErr) throw new Error(instErr.message)
  if (!inst?.id || !inst.plan_id) return { applied: false }
  if (inst.status !== 'pending' && inst.status !== 'failed') {
    return { applied: false, planId: String(inst.plan_id) }
  }

  const nowIso = new Date().toISOString()
  const update: Record<string, unknown> = {
    status: 'processing',
    updated_at: nowIso,
  }
  if (args.paymentIntentId) update.stripe_payment_intent_id = String(args.paymentIntentId)

  await supabase.from('event_payment_installments').update(update).eq('id', installmentId)
  return { applied: true, planId: String(inst.plan_id) }
}

/**
 * Abandoned Checkout: mark first pending installment failed without past_due
 * unless plan was already active.
 */
export async function applyCheckoutSessionExpired(
  supabase: any,
  args: {
    planId: string
    installmentId?: string | null
  },
): Promise<{ applied: boolean }> {
  const planId = String(args.planId || '').trim()
  if (!planId) return { applied: false }

  const { data: plan } = await supabase
    .from('event_payment_plans')
    .select('id, status, party_id, event_id, amount_paid_cents, amenity_vote_committed_at')
    .eq('id', planId)
    .maybeSingle()
  if (!plan?.id) return { applied: false }

  let installmentId = args.installmentId ? String(args.installmentId).trim() : ''
  if (!installmentId) {
    const { data: first } = await supabase
      .from('event_payment_installments')
      .select('id')
      .eq('plan_id', planId)
      .eq('sequence', 1)
      .in('status', ['pending', 'processing'])
      .maybeSingle()
    installmentId = first?.id ? String(first.id) : ''
  }
  if (!installmentId) return { applied: false }

  const markPastDue = String(plan.status) === 'active' || String(plan.status) === 'past_due'
  await applyInstallmentFailed(supabase, {
    installmentId,
    markPlanPastDue: markPastDue,
  })

  // Never-pay: drop provisional amenity vote + cancel unpaid prep so Manage roster
  // does not keep forever-abandoned going stubs (public going count is paid-only).
  const partyId = plan.party_id ? String(plan.party_id) : ''
  const eventId = plan.event_id ? String(plan.event_id) : ''
  const neverCommitted = !plan.amenity_vote_committed_at
    && (Number(plan.amount_paid_cents) || 0) <= 0
    && String(plan.status) !== 'active'
    && String(plan.status) !== 'completed'
    && String(plan.status) !== 'past_due'
  if (partyId && neverCommitted) {
    await removePartyAmenityVoteIfUncommitted(supabase, { partyId, planId })
    if (eventId) {
      const { data: party } = await supabase
        .from('event_parties')
        .select('id, payer_user_id, payer_guest_rsvp_id')
        .eq('id', partyId)
        .eq('event_id', eventId)
        .maybeSingle()

      await cancelPartyParticipation(supabase, {
        eventId,
        partyIds: [partyId],
        payerUserId: party?.payer_user_id || null,
        payerGuestRsvpId: party?.payer_guest_rsvp_id || null,
      })

      const nowIso = new Date().toISOString()
      if (party?.payer_guest_rsvp_id) {
        await supabase
          .from('event_guest_rsvps')
          .update({ status: 'not_going' })
          .eq('id', String(party.payer_guest_rsvp_id))
          .eq('event_id', eventId)
          .eq('paid', false)
      }
      if (party?.payer_user_id) {
        await supabase
          .from('event_rsvps')
          .update({ status: 'not_going' })
          .eq('event_id', eventId)
          .eq('user_id', String(party.payer_user_id))
          .eq('paid', false)
      }
    }
  }

  return { applied: true }
}
