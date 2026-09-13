// Cancel party participation without Stripe refunds (§13.12 line 462)
// Host remove / reset: soft-close party + pending installments; no in-app refunds

import { removePartyAmenityVoteIfUncommitted } from './amenity-voting.ts'

export type CancelPartyParticipationArgs = {
  eventId: string
  partyIds?: string[]
  payerUserId?: string | null
  payerGuestRsvpId?: string | null
  /** When true, cancel every non-cancelled party on the event */
  allForEvent?: boolean
}

export type CancelPartyParticipationResult = {
  cancelledPartyIds: string[]
  cancelledPlanIds: string[]
}

/**
 * Soft-cancel payment-linked parties: pending/failed installments + open plans,
 * drop provisional amenity votes, mark party cancelled. Succeeded charges untouched.
 */
export async function cancelPartyParticipation(
  supabase: any,
  args: CancelPartyParticipationArgs,
): Promise<CancelPartyParticipationResult> {
  const eventId = String(args.eventId || '').trim()
  if (!eventId) throw new Error('event_id is required')

  const partyIdSet = new Set<string>()
  for (const id of args.partyIds || []) {
    const pid = String(id || '').trim()
    if (pid) partyIdSet.add(pid)
  }

  if (args.allForEvent) {
    const { data: rows, error } = await supabase
      .from('event_parties')
      .select('id')
      .eq('event_id', eventId)
      .neq('status', 'cancelled')
    if (error) throw new Error(error.message)
    for (const row of rows || []) {
      if (row?.id) partyIdSet.add(String(row.id))
    }
  }

  const payerUserId = args.payerUserId ? String(args.payerUserId).trim() : ''
  if (payerUserId) {
    const { data: rows, error } = await supabase
      .from('event_parties')
      .select('id')
      .eq('event_id', eventId)
      .eq('payer_user_id', payerUserId)
      .neq('status', 'cancelled')
    if (error) throw new Error(error.message)
    for (const row of rows || []) {
      if (row?.id) partyIdSet.add(String(row.id))
    }
  }

  const payerGuestRsvpId = args.payerGuestRsvpId ? String(args.payerGuestRsvpId).trim() : ''
  if (payerGuestRsvpId) {
    const { data: rows, error } = await supabase
      .from('event_parties')
      .select('id')
      .eq('event_id', eventId)
      .eq('payer_guest_rsvp_id', payerGuestRsvpId)
      .neq('status', 'cancelled')
    if (error) throw new Error(error.message)
    for (const row of rows || []) {
      if (row?.id) partyIdSet.add(String(row.id))
    }
  }

  const cancelledPartyIds: string[] = []
  const cancelledPlanIds: string[] = []
  const nowIso = new Date().toISOString()

  for (const partyId of partyIdSet) {
    const { data: party, error: partyErr } = await supabase
      .from('event_parties')
      .select('id, status')
      .eq('id', partyId)
      .eq('event_id', eventId)
      .maybeSingle()
    if (partyErr) throw new Error(partyErr.message)
    if (!party?.id) continue
    if (String(party.status) === 'cancelled') continue

    const { data: plans, error: planErr } = await supabase
      .from('event_payment_plans')
      .select('id, status')
      .eq('party_id', partyId)
      .eq('event_id', eventId)
    if (planErr) throw new Error(planErr.message)

    for (const plan of plans || []) {
      const planId = String(plan.id || '')
      if (!planId) continue
      const planStatus = String(plan.status || '')

      // Stop open charges; leave completed / already-cancelled plans alone
      if (planStatus !== 'completed' && planStatus !== 'cancelled') {
        const { error: instErr } = await supabase
          .from('event_payment_installments')
          .update({ status: 'cancelled', updated_at: nowIso })
          .eq('plan_id', planId)
          .in('status', ['pending', 'failed'])
        if (instErr) throw new Error(instErr.message)

        const { error: planUpErr } = await supabase
          .from('event_payment_plans')
          .update({
            status: 'cancelled',
            next_debit_at: null,
            updated_at: nowIso,
          })
          .eq('id', planId)
        if (planUpErr) throw new Error(planUpErr.message)
        cancelledPlanIds.push(planId)
      }

      await removePartyAmenityVoteIfUncommitted(supabase, { partyId, planId })
    }

    // No plan: still drop provisional vote if any
    if (!(plans || []).length) {
      await removePartyAmenityVoteIfUncommitted(supabase, { partyId })
    }

    const { error: partyUpErr } = await supabase
      .from('event_parties')
      .update({
        status: 'cancelled',
        updated_at: nowIso,
      })
      .eq('id', partyId)
    if (partyUpErr) throw new Error(partyUpErr.message)
    cancelledPartyIds.push(partyId)
  }

  return { cancelledPartyIds, cancelledPlanIds }
}
