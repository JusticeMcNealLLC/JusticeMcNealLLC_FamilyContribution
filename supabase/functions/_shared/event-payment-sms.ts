// SMS when an event party installment fails → past_due (§13.10 line 440)

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  executeSendSms,
  formatOutboundSmsBody,
  isPhoneGloballySuppressed,
  isSmsDryRun,
  maskPhone,
  normalizePhoneE164,
} from './sms.ts'

/** Prefer SMS_PAYMENT_FAILURES_ENABLED; if unset, follow SMS_SEND_ENABLED. */
export function isPaymentFailureSmsEnabled(): boolean {
  const flag = Deno.env.get('SMS_PAYMENT_FAILURES_ENABLED')
  if (flag === 'true') return true
  if (flag === 'false') return false
  return Deno.env.get('SMS_SEND_ENABLED') === 'true'
}

export function buildPaymentFailedSmsBody(args: {
  eventTitle: string
  remainingCents: number
  paymentsUrl: string
}): string {
  const title = (args.eventTitle || 'your event').trim()
  const remaining = Math.max(0, Number(args.remainingCents) || 0)
  const dollars = (remaining / 100).toFixed(remaining % 100 === 0 ? 0 : 2)
  const parts = [
    `${title}: Payment failed.`,
    remaining > 0 ? `About $${dollars} still due.` : null,
    `Update or retry: ${args.paymentsUrl}`,
  ].filter(Boolean)
  return formatOutboundSmsBody(parts.join(' '))
}

export function publicPaymentsUrl(origin: string, inviteToken: string): string {
  const base = (origin || 'https://justicemcneal.com').replace(/\/$/, '')
  return `${base}/events/payments/?t=${encodeURIComponent(inviteToken)}`
}

async function resolvePayerPhone(
  supabase: SupabaseClient,
  party: {
    payer_kind?: string | null
    payer_user_id?: string | null
    payer_guest_rsvp_id?: string | null
  },
): Promise<string | null> {
  const kind = String(party.payer_kind || '').trim()
  if (kind === 'guest' && party.payer_guest_rsvp_id) {
    const { data } = await supabase
      .from('event_guest_rsvps')
      .select('guest_phone')
      .eq('id', party.payer_guest_rsvp_id)
      .maybeSingle()
    return data?.guest_phone ? normalizePhoneE164(String(data.guest_phone)) : null
  }
  if (party.payer_user_id) {
    const { data } = await supabase
      .from('profiles')
      .select('phone')
      .eq('id', party.payer_user_id)
      .maybeSingle()
    return data?.phone ? normalizePhoneE164(String(data.phone)) : null
  }
  return null
}

export type NotifyPaymentFailedResult = {
  ok: boolean
  skipped?: boolean
  reason?: string
  dry_run?: boolean
  phone_masked?: string
}

/**
 * Notify payer that an installment failed and plan is past_due.
 * Idempotent via failure_notified_at. Never throws — safe for webhook.
 */
export async function notifyPartyPaymentFailed(
  supabase: SupabaseClient,
  args: { planId: string; installmentId: string; origin?: string },
): Promise<NotifyPaymentFailedResult> {
  try {
    if (!isPaymentFailureSmsEnabled()) {
      return { ok: true, skipped: true, reason: 'payment_failures_sms_disabled' }
    }

    const installmentId = String(args.installmentId || '').trim()
    const planId = String(args.planId || '').trim()
    if (!installmentId || !planId) {
      return { ok: false, reason: 'missing_ids' }
    }

    const { data: inst, error: instErr } = await supabase
      .from('event_payment_installments')
      .select('id, plan_id, failure_notified_at, status')
      .eq('id', installmentId)
      .maybeSingle()
    if (instErr) throw new Error(instErr.message)
    if (!inst?.id) return { ok: false, reason: 'installment_not_found' }
    if (inst.failure_notified_at) {
      return { ok: true, skipped: true, reason: 'already_notified' }
    }

    const { data: plan, error: planErr } = await supabase
      .from('event_payment_plans')
      .select(`
        id, party_id, event_id, remaining_cents, status,
        events:event_id ( title ),
        event_parties:party_id (
          invite_token, payer_kind, payer_user_id, payer_guest_rsvp_id, status
        )
      `)
      .eq('id', planId)
      .maybeSingle()
    if (planErr) throw new Error(planErr.message)
    if (!plan?.id) return { ok: false, reason: 'plan_not_found' }
    if (String(plan.status) !== 'past_due') {
      return { ok: true, skipped: true, reason: 'plan_not_past_due' }
    }

    const party = plan.event_parties as Record<string, unknown> | null
    if (!party || String(party.status || '') === 'cancelled') {
      return { ok: true, skipped: true, reason: 'party_unavailable' }
    }

    const inviteToken = String(party.invite_token || '').trim()
    if (!inviteToken) {
      return { ok: true, skipped: true, reason: 'no_invite_token' }
    }

    const phoneE164 = await resolvePayerPhone(supabase, {
      payer_kind: party.payer_kind as string | null,
      payer_user_id: party.payer_user_id as string | null,
      payer_guest_rsvp_id: party.payer_guest_rsvp_id as string | null,
    })
    if (!phoneE164) {
      return { ok: true, skipped: true, reason: 'no_phone' }
    }

    const twilioFrom = Deno.env.get('TWILIO_FROM_PHONE')?.trim() || null
    if (await isPhoneGloballySuppressed(supabase, phoneE164, twilioFrom)) {
      return { ok: true, skipped: true, reason: 'globally_suppressed' }
    }

    const eventTitle = (plan.events as { title?: string } | null)?.title || 'your event'
    const origin = args.origin || Deno.env.get('PUBLIC_SITE_ORIGIN') || 'https://justicemcneal.com'
    const paymentsUrl = publicPaymentsUrl(origin, inviteToken)
    const body = buildPaymentFailedSmsBody({
      eventTitle,
      remainingCents: Number(plan.remaining_cents) || 0,
      paymentsUrl,
    })

    const eventId = String(plan.event_id)
    const { data: messageRow, error: messageErr } = await supabase
      .from('sms_messages')
      .insert({
        event_id: eventId,
        body,
        message_type: 'event_payment_failed',
        sender_user_id: null,
        recipient_count: 1,
      })
      .select('id')
      .single()

    if (messageErr || !messageRow?.id) {
      console.error('Payment failure SMS message insert failed', messageErr?.message)
      return { ok: false, reason: 'message_insert_failed' }
    }

    // Mark notified before send so retries don't spam if Twilio is slow/flaky
    const nowIso = new Date().toISOString()
    await supabase
      .from('event_payment_installments')
      .update({ failure_notified_at: nowIso, updated_at: nowIso })
      .eq('id', installmentId)

    const sendResult = await executeSendSms(supabase, {
      message_id: messageRow.id,
      body,
      recipients: [{ phone_e164: phoneE164 }],
    })

    console.log(
      'Payment failure SMS',
      installmentId,
      maskPhone(phoneE164),
      sendResult.dry_run ? 'dry_run' : 'sent',
      `sent=${sendResult.sent} failed=${sendResult.failed}`,
    )

    return {
      ok: true,
      dry_run: sendResult.dry_run || isSmsDryRun(),
      phone_masked: maskPhone(phoneE164),
    }
  } catch (err) {
    console.error(
      'notifyPartyPaymentFailed unexpected error (non-blocking)',
      args.planId,
      args.installmentId,
      (err as Error).message,
    )
    return { ok: false, reason: 'unexpected_error' }
  }
}

/** Payment magic-link SMS follows SMS_SEND_ENABLED (dry-run when unset). */
export function isPaymentLinkSmsEnabled(): boolean {
  return Deno.env.get('SMS_SEND_ENABLED') === 'true'
}

export function buildPaymentLinkSmsBody(args: {
  eventTitle: string
  paymentsUrl: string
}): string {
  const title = (args.eventTitle || 'your event').trim()
  return formatOutboundSmsBody(
    `${title}: Save your trip payments link: ${args.paymentsUrl}`,
  )
}

export type NotifyPaymentLinkResult = {
  ok: boolean
  skipped?: boolean
  reason?: string
  dry_run?: boolean
  phone_masked?: string
  payments_url?: string
}

const RESEND_COOLDOWN_MS = 60_000

async function guestHasSmsOptIn(
  supabase: SupabaseClient,
  eventId: string,
  guestRsvpId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('event_sms_recipients')
    .select('id, opted_in, opted_out_at')
    .eq('event_id', eventId)
    .eq('guest_rsvp_id', guestRsvpId)
    .maybeSingle()
  if (!data?.id) return false
  return !!(data.opted_in && !data.opted_out_at)
}

/**
 * Send payment magic-link SMS for a party.
 * Initial: skip if payment_link_sent_at set. Resend (force): 60s cooldown.
 * Never throws — safe for webhook.
 */
export async function notifyPartyPaymentLink(
  supabase: SupabaseClient,
  args: { partyId: string; origin?: string; force?: boolean },
): Promise<NotifyPaymentLinkResult> {
  try {
    const partyId = String(args.partyId || '').trim()
    if (!partyId) return { ok: false, reason: 'missing_party_id' }

    const { data: party, error: partyErr } = await supabase
      .from('event_parties')
      .select(`
        id, event_id, status, invite_token, payment_link_sent_at,
        payer_kind, payer_user_id, payer_guest_rsvp_id,
        events:event_id ( title )
      `)
      .eq('id', partyId)
      .maybeSingle()
    if (partyErr) throw new Error(partyErr.message)
    if (!party?.id) return { ok: false, reason: 'party_not_found' }
    if (String(party.status || '') === 'cancelled') {
      return { ok: true, skipped: true, reason: 'party_cancelled' }
    }

    const inviteToken = String(party.invite_token || '').trim()
    if (!inviteToken) {
      return { ok: true, skipped: true, reason: 'no_invite_token' }
    }

    const force = !!args.force
    const sentAt = party.payment_link_sent_at ? new Date(String(party.payment_link_sent_at)).getTime() : 0
    if (!force && sentAt > 0) {
      return { ok: true, skipped: true, reason: 'already_sent' }
    }
    if (force && sentAt > 0 && Date.now() - sentAt < RESEND_COOLDOWN_MS) {
      return { ok: false, skipped: true, reason: 'rate_limited' }
    }

    const phoneE164 = await resolvePayerPhone(supabase, {
      payer_kind: party.payer_kind as string | null,
      payer_user_id: party.payer_user_id as string | null,
      payer_guest_rsvp_id: party.payer_guest_rsvp_id as string | null,
    })
    if (!phoneE164) {
      return { ok: true, skipped: true, reason: 'no_phone' }
    }

    if (String(party.payer_kind || '') === 'guest' && party.payer_guest_rsvp_id) {
      const optedIn = await guestHasSmsOptIn(
        supabase,
        String(party.event_id),
        String(party.payer_guest_rsvp_id),
      )
      if (!optedIn) {
        return { ok: true, skipped: true, reason: 'guest_not_opted_in' }
      }
    }

    const twilioFrom = Deno.env.get('TWILIO_FROM_PHONE')?.trim() || null
    if (await isPhoneGloballySuppressed(supabase, phoneE164, twilioFrom)) {
      return { ok: true, skipped: true, reason: 'globally_suppressed' }
    }

    const eventTitle = (party.events as { title?: string } | null)?.title || 'your event'
    const origin = args.origin || Deno.env.get('PUBLIC_SITE_ORIGIN') || 'https://justicemcneal.com'
    const paymentsUrl = publicPaymentsUrl(origin, inviteToken)
    const body = buildPaymentLinkSmsBody({ eventTitle, paymentsUrl })

    const eventId = String(party.event_id)
    const { data: messageRow, error: messageErr } = await supabase
      .from('sms_messages')
      .insert({
        event_id: eventId,
        body,
        message_type: 'event_payment_link',
        sender_user_id: null,
        recipient_count: 1,
      })
      .select('id')
      .single()

    if (messageErr || !messageRow?.id) {
      console.error('Payment link SMS message insert failed', messageErr?.message)
      return { ok: false, reason: 'message_insert_failed' }
    }

    const nowIso = new Date().toISOString()
    await supabase
      .from('event_parties')
      .update({ payment_link_sent_at: nowIso, updated_at: nowIso })
      .eq('id', partyId)

    const sendResult = await executeSendSms(supabase, {
      message_id: messageRow.id,
      body,
      recipients: [{ phone_e164: phoneE164 }],
    })

    console.log(
      'Payment link SMS',
      partyId,
      maskPhone(phoneE164),
      sendResult.dry_run ? 'dry_run' : 'sent',
      `sent=${sendResult.sent} failed=${sendResult.failed}`,
      force ? 'force' : 'initial',
    )

    return {
      ok: true,
      dry_run: sendResult.dry_run || isSmsDryRun(),
      phone_masked: maskPhone(phoneE164),
      payments_url: paymentsUrl,
    }
  } catch (err) {
    console.error(
      'notifyPartyPaymentLink unexpected error (non-blocking)',
      args.partyId,
      (err as Error).message,
    )
    return { ok: false, reason: 'unexpected_error' }
  }
}
