// Early payoff helpers for event payment plans (§13.10 line 439)

export type PayoffPrepResult = {
  plan_id: string
  party_id: string
  event_id: string
  installment_id: string
  remaining_cents: number
  method: 'ach' | 'card'
  stripe_customer_id: string | null
  stripe_payment_method_id: string | null
  event_slug: string | null
  payer_user_id: string | null
}

/**
 * Cancel future scheduled installments and create a pending payoff row for remaining balance.
 */
export async function preparePartyPayoffInstallment(
  supabase: any,
  args: { planId: string },
): Promise<PayoffPrepResult> {
  const planId = String(args.planId || '').trim()
  if (!planId) throw new Error('plan_id required')

  const { data: plan, error: planErr } = await supabase
    .from('event_payment_plans')
    .select(`
      id, party_id, event_id, status, remaining_cents, method,
      stripe_customer_id, stripe_payment_method_id,
      events:event_id ( slug )
    `)
    .eq('id', planId)
    .maybeSingle()
  if (planErr) throw new Error(planErr.message)
  if (!plan?.id) throw new Error('Payment plan not found')

  const status = String(plan.status || '')
  if (status !== 'active' && status !== 'past_due') {
    throw new Error('Payoff is only available for active or past-due payment plans')
  }
  const remaining = Math.max(0, Number(plan.remaining_cents) || 0)
  if (remaining <= 0) throw new Error('Nothing left to pay')

  const partyId = String(plan.party_id)
  const eventId = String(plan.event_id)
  const nowIso = new Date().toISOString()

  await supabase
    .from('event_payment_installments')
    .update({ status: 'cancelled', updated_at: nowIso })
    .eq('plan_id', planId)
    .eq('kind', 'scheduled')
    .in('status', ['pending', 'failed', 'processing'])

  // Reuse open payoff row if present
  const { data: existingPayoff } = await supabase
    .from('event_payment_installments')
    .select('id, status, amount_cents')
    .eq('plan_id', planId)
    .eq('kind', 'payoff')
    .in('status', ['pending', 'processing', 'failed'])
    .order('sequence', { ascending: false })
    .limit(1)
    .maybeSingle()

  let installmentId: string
  if (existingPayoff?.id) {
    const { error: upErr } = await supabase
      .from('event_payment_installments')
      .update({
        amount_cents: remaining,
        status: 'pending',
        due_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', existingPayoff.id)
    if (upErr) throw new Error(upErr.message)
    installmentId = String(existingPayoff.id)
  } else {
    const { data: maxRow } = await supabase
      .from('event_payment_installments')
      .select('sequence')
      .eq('plan_id', planId)
      .order('sequence', { ascending: false })
      .limit(1)
      .maybeSingle()
    const nextSeq = (Number(maxRow?.sequence) || 0) + 1

    const { data: created, error: insErr } = await supabase
      .from('event_payment_installments')
      .insert({
        plan_id: planId,
        event_id: eventId,
        party_id: partyId,
        sequence: nextSeq,
        kind: 'payoff',
        due_at: nowIso,
        amount_cents: remaining,
        status: 'pending',
        updated_at: nowIso,
      })
      .select('id')
      .single()
    if (insErr) throw new Error(insErr.message)
    installmentId = String(created.id)
  }

  await supabase
    .from('event_payment_plans')
    .update({ next_debit_at: nowIso, updated_at: nowIso })
    .eq('id', planId)

  const { data: party } = await supabase
    .from('event_parties')
    .select('payer_user_id')
    .eq('id', partyId)
    .maybeSingle()

  const method = String(plan.method || 'ach').trim() === 'card' ? 'card' as const : 'ach' as const
  const eventSlug = (plan.events as any)?.slug ? String((plan.events as any).slug) : null

  return {
    plan_id: planId,
    party_id: partyId,
    event_id: eventId,
    installment_id: installmentId,
    remaining_cents: remaining,
    method,
    stripe_customer_id: plan.stripe_customer_id ? String(plan.stripe_customer_id) : null,
    stripe_payment_method_id: plan.stripe_payment_method_id
      ? String(plan.stripe_payment_method_id)
      : null,
    event_slug: eventSlug,
    payer_user_id: party?.payer_user_id ? String(party.payer_user_id) : null,
  }
}
