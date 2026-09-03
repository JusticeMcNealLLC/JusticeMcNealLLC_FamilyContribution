// Retry latest failed installment for a party payment plan (§13.10 line 440)

export type RetryPrepResult = {
  plan_id: string
  party_id: string
  event_id: string
  installment_id: string
  amount_cents: number
  remaining_cents: number
  method: 'ach' | 'card'
  plan_status: string
  stripe_customer_id: string | null
  stripe_payment_method_id: string | null
  event_slug: string | null
}

/**
 * Locate the latest failed installment on an active/past_due plan for Checkout retry.
 */
export async function preparePartyRetryInstallment(
  supabase: any,
  args: { planId: string },
): Promise<RetryPrepResult> {
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
    throw new Error('Retry is only available for active or past-due payment plans')
  }

  const { data: failed, error: failErr } = await supabase
    .from('event_payment_installments')
    .select('id, amount_cents, sequence, status')
    .eq('plan_id', planId)
    .eq('status', 'failed')
    .order('sequence', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (failErr) throw new Error(failErr.message)
  if (!failed?.id) throw new Error('No failed installment to retry')

  const amount = Math.max(0, Number(failed.amount_cents) || 0)
  if (amount <= 0) throw new Error('Failed installment has no amount')

  const method = String(plan.method || 'ach').trim() === 'card' ? 'card' as const : 'ach' as const
  const eventSlug = (plan.events as any)?.slug ? String((plan.events as any).slug) : null

  return {
    plan_id: planId,
    party_id: String(plan.party_id),
    event_id: String(plan.event_id),
    installment_id: String(failed.id),
    amount_cents: amount,
    remaining_cents: Math.max(0, Number(plan.remaining_cents) || 0),
    method,
    plan_status: status,
    stripe_customer_id: plan.stripe_customer_id ? String(plan.stripe_customer_id) : null,
    stripe_payment_method_id: plan.stripe_payment_method_id
      ? String(plan.stripe_payment_method_id)
      : null,
    event_slug: eventSlug,
  }
}
