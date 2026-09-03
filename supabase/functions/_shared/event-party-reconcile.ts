// Reconcile stuck event-party installments vs Stripe PI truth (§13.10 line 441)
// Does NOT send payment-failure SMS — live webhook path only.

import {
  applyInstallmentFailed,
  applyInstallmentSucceeded,
} from './payment-schedule-webhook.ts'

export const RECONCILE_STALE_MINUTES = 15
export const RECONCILE_BATCH_LIMIT = 50

export type ReconcileSummary = {
  checked: number
  fixed_succeeded: number
  fixed_failed: number
  skipped: number
  errors: number
  details: Array<{
    installment_id: string
    action: string
    pi_status?: string
    error?: string
  }>
}

function isTerminalFailed(piStatus: string): boolean {
  return (
    piStatus === 'canceled'
    || piStatus === 'requires_payment_method'
    || piStatus === 'requires_source'
  )
}

/**
 * Find processing installments older than staleMinutes with a PI id,
 * retrieve from Stripe, and apply succeeded/failed rollups.
 */
export async function reconcileStuckProcessingInstallments(
  supabase: any,
  stripe: { paymentIntents: { retrieve: (id: string) => Promise<any> } },
  opts?: { staleMinutes?: number; limit?: number; now?: Date },
): Promise<ReconcileSummary> {
  const staleMinutes = opts?.staleMinutes ?? RECONCILE_STALE_MINUTES
  const limit = opts?.limit ?? RECONCILE_BATCH_LIMIT
  const now = opts?.now ?? new Date()
  const cutoff = new Date(now.getTime() - staleMinutes * 60 * 1000).toISOString()

  const summary: ReconcileSummary = {
    checked: 0,
    fixed_succeeded: 0,
    fixed_failed: 0,
    skipped: 0,
    errors: 0,
    details: [],
  }

  const { data: rows, error } = await supabase
    .from('event_payment_installments')
    .select('id, plan_id, status, stripe_payment_intent_id, updated_at')
    .eq('status', 'processing')
    .not('stripe_payment_intent_id', 'is', null)
    .lt('updated_at', cutoff)
    .order('updated_at', { ascending: true })
    .limit(limit)

  if (error) throw new Error(error.message)

  const installments = rows || []
  summary.checked = installments.length

  for (const inst of installments) {
    const installmentId = String(inst.id)
    const piId = String(inst.stripe_payment_intent_id || '').trim()
    if (!piId) {
      summary.skipped++
      summary.details.push({ installment_id: installmentId, action: 'skip_no_pi' })
      continue
    }

    try {
      const pi = await stripe.paymentIntents.retrieve(piId)
      const piStatus = String(pi?.status || '')

      if (piStatus === 'succeeded') {
        const amountCents =
          typeof pi.amount_received === 'number' && pi.amount_received > 0
            ? pi.amount_received
            : (typeof pi.amount === 'number' ? pi.amount : null)
        const customerId =
          typeof pi.customer === 'string'
            ? pi.customer
            : (pi.customer && typeof pi.customer === 'object' ? pi.customer.id : null)
        const paymentMethodId =
          typeof pi.payment_method === 'string'
            ? pi.payment_method
            : (pi.payment_method && typeof pi.payment_method === 'object'
              ? pi.payment_method.id
              : null)

        await applyInstallmentSucceeded(supabase, {
          installmentId,
          paymentIntentId: piId,
          amountCents,
          customerId,
          paymentMethodId,
        })
        summary.fixed_succeeded++
        summary.details.push({
          installment_id: installmentId,
          action: 'fixed_succeeded',
          pi_status: piStatus,
        })
        continue
      }

      if (isTerminalFailed(piStatus) || (piStatus === 'requires_confirmation' && pi.last_payment_error)) {
        await applyInstallmentFailed(supabase, {
          installmentId,
          paymentIntentId: piId,
          failureMessage: pi.last_payment_error?.message || `reconcile:${piStatus}`,
          markPlanPastDue: true,
        })
        // Intentionally no notifyPartyPaymentFailed — live webhook only
        summary.fixed_failed++
        summary.details.push({
          installment_id: installmentId,
          action: 'fixed_failed',
          pi_status: piStatus,
        })
        continue
      }

      summary.skipped++
      summary.details.push({
        installment_id: installmentId,
        action: 'skip_still_open',
        pi_status: piStatus,
      })
    } catch (err) {
      summary.errors++
      summary.details.push({
        installment_id: installmentId,
        action: 'error',
        error: (err as Error).message || String(err),
      })
      console.error('reconcile installment error', installmentId, err)
    }
  }

  return summary
}
