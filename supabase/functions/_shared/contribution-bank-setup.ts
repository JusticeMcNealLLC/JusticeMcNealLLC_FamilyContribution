// Cancels a member's unfinished contribution bank setups (e.g. a mistyped manual entry still
// waiting on microdeposits) so only one bank account is ever pending or applied.
export async function cancelPendingContributionSetups(stripe: any, customerId: string, keepId?: string) {
  const list = await stripe.setupIntents.list({ customer: customerId, limit: 20 })
  for (const si of list.data) {
    if (si.id === keepId) continue
    if (si.metadata?.jm_type !== 'contribution_pm_update') continue
    if (!['requires_action', 'requires_payment_method', 'requires_confirmation'].includes(si.status)) continue
    try {
      await stripe.setupIntents.cancel(si.id, { cancellation_reason: 'abandoned' })
      console.log('Canceled superseded contribution bank setup:', si.id)
    } catch (err) {
      console.error('Could not cancel contribution bank setup:', si.id, err)
    }
  }
}
