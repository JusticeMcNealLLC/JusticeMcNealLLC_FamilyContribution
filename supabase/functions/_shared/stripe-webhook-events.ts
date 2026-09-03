// Stripe webhook event claim / finalize (§13.10 line 441)

export type StripeWebhookEventStatus = 'received' | 'processed' | 'skipped' | 'error'

export type ClaimStripeWebhookResult = {
  claimed: boolean
  duplicate: boolean
  stripe_event_id: string
}

export type FinalizeStripeWebhookArgs = {
  stripeEventId: string
  status: 'processed' | 'skipped' | 'error'
  errorMessage?: string | null
  planId?: string | null
  installmentId?: string | null
  jmType?: string | null
}

/**
 * Insert event.id with status=received. On unique conflict, treat as duplicate.
 */
export async function claimStripeWebhookEvent(
  supabase: any,
  args: { stripeEventId: string; eventType: string; jmType?: string | null },
): Promise<ClaimStripeWebhookResult> {
  const stripeEventId = String(args.stripeEventId || '').trim()
  const eventType = String(args.eventType || '').trim()
  if (!stripeEventId) throw new Error('stripe_event_id required')

  const row: Record<string, unknown> = {
    stripe_event_id: stripeEventId,
    event_type: eventType || 'unknown',
    status: 'received',
  }
  if (args.jmType) row.jm_type = String(args.jmType)

  const { data, error } = await supabase
    .from('stripe_webhook_events')
    .insert(row)
    .select('stripe_event_id')
    .maybeSingle()

  if (error) {
    // Unique violation → already claimed / processed
    const code = String((error as any).code || '')
    const msg = String(error.message || '').toLowerCase()
    if (code === '23505' || msg.includes('duplicate') || msg.includes('unique')) {
      return { claimed: false, duplicate: true, stripe_event_id: stripeEventId }
    }
    throw new Error(error.message)
  }

  if (!data?.stripe_event_id) {
    // Insert + maybeSingle with no returning can happen on conflict with ignore — treat as dup
    return { claimed: false, duplicate: true, stripe_event_id: stripeEventId }
  }

  return { claimed: true, duplicate: false, stripe_event_id: stripeEventId }
}

export async function finalizeStripeWebhookEvent(
  supabase: any,
  args: FinalizeStripeWebhookArgs,
): Promise<void> {
  const stripeEventId = String(args.stripeEventId || '').trim()
  if (!stripeEventId) return

  const nowIso = new Date().toISOString()
  const update: Record<string, unknown> = {
    status: args.status,
    processed_at: nowIso,
  }
  if (args.errorMessage != null) update.error_message = String(args.errorMessage).slice(0, 2000)
  if (args.planId) update.plan_id = String(args.planId)
  if (args.installmentId) update.installment_id = String(args.installmentId)
  if (args.jmType) update.jm_type = String(args.jmType)

  const { error } = await supabase
    .from('stripe_webhook_events')
    .update(update)
    .eq('stripe_event_id', stripeEventId)

  if (error) {
    console.error('finalizeStripeWebhookEvent failed:', stripeEventId, error.message)
  }
}

/** Best-effort jm_type / ids from common Stripe object metadata shapes. */
export function extractWebhookMetaHints(eventType: string, obj: any): {
  jmType: string | null
  planId: string | null
  installmentId: string | null
} {
  const meta = (obj && obj.metadata) || {}
  return {
    jmType: meta.jm_type ? String(meta.jm_type) : null,
    planId: meta.plan_id ? String(meta.plan_id) : null,
    installmentId: meta.installment_id ? String(meta.installment_id) : null,
  }
}
