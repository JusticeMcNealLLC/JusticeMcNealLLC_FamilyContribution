// Edge Function: send-event-sms — authenticated manual/event SMS send wrapper.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import {
  corsHeaders,
  createServiceClient,
  executeSendSms,
  isPhoneGloballySuppressed,
  jsonResponse,
  normalizePhoneE164,
  userCanManageEventNotifications,
} from '../_shared/sms.ts'

type RecipientRow = {
  id: string
  contact_id: string
  opted_in: boolean
  opted_out_at: string | null
  sms_phone_contacts: { phone_e164: string } | { phone_e164: string }[] | null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Authorization required')

    const supabase = createServiceClient()
    const token = authHeader.replace(/^Bearer\s+/i, '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) throw new Error('Unauthorized')

    const body = await req.json()
    const eventId = String(body.event_id || '')
    const text = String(body.body || '').trim()
    const messageType = String(body.message_type || 'manual')
    const recipientIds = Array.isArray(body.recipient_ids)
      ? body.recipient_ids.map((id: unknown) => String(id))
      : []
    const selectAllOptedIn = body.select_all_opted_in === true
    const forceDryRun = body.dry_run === true

    if (!eventId) throw new Error('event_id is required')
    if (!text) throw new Error('body is required')
    if (!recipientIds.length && !selectAllOptedIn) {
      throw new Error('recipient_ids or select_all_opted_in is required')
    }

    const allowedTypes = ['manual', 'cancellation', 'update', 'rsvp_confirmation', 'reminder_24h']
    if (!allowedTypes.includes(messageType)) {
      throw new Error('Invalid message_type')
    }

    const canManage = await userCanManageEventNotifications(supabase, user.id, eventId)
    if (!canManage) throw new Error('Not allowed to send event SMS')

    let query = supabase
      .from('event_sms_recipients')
      .select('id, contact_id, opted_in, opted_out_at, sms_phone_contacts(phone_e164)')
      .eq('event_id', eventId)
      .eq('opted_in', true)
      .is('opted_out_at', null)

    if (recipientIds.length) {
      query = query.in('id', recipientIds)
    }

    const { data: rows, error: recipientErr } = await query
    if (recipientErr) throw new Error(recipientErr.message)

    const twilioFrom = Deno.env.get('TWILIO_FROM_PHONE')?.trim() || null
    const sendTargets: Array<{ event_sms_recipient_id: string; phone_e164: string }> = []
    let skippedSuppressed = 0
    let skippedInvalid = 0

    for (const row of (rows || []) as RecipientRow[]) {
      const contact = row.sms_phone_contacts
      const phone = Array.isArray(contact) ? contact[0]?.phone_e164 : contact?.phone_e164
      if (!phone) {
        skippedInvalid++
        continue
      }

      const normalized = normalizePhoneE164(phone)
      if (!normalized) {
        skippedInvalid++
        continue
      }

      if (await isPhoneGloballySuppressed(supabase, normalized, twilioFrom)) {
        skippedSuppressed++
        continue
      }

      sendTargets.push({
        event_sms_recipient_id: row.id,
        phone_e164: normalized,
      })
    }

    if (!sendTargets.length) {
      return jsonResponse({
        ok: true,
        message_id: null,
        recipient_count: 0,
        sent: 0,
        skipped: skippedSuppressed + skippedInvalid,
        skipped_suppressed: skippedSuppressed,
        skipped_invalid: skippedInvalid,
        dry_run: forceDryRun,
        status_summary: 'no_eligible_recipients',
      })
    }

    const { data: messageRow, error: messageErr } = await supabase
      .from('sms_messages')
      .insert({
        event_id: eventId,
        body: text,
        message_type: messageType,
        sender_user_id: user.id,
        recipient_count: sendTargets.length,
      })
      .select('id')
      .single()

    if (messageErr || !messageRow?.id) {
      throw new Error(messageErr?.message || 'Failed to create sms_messages row')
    }

    const result = await executeSendSms(supabase, {
      message_id: messageRow.id,
      body: text,
      recipients: sendTargets,
      force_dry_run: forceDryRun,
    })

    return jsonResponse({
      ok: true,
      message_id: messageRow.id,
      recipient_count: sendTargets.length,
      sent: result.sent,
      skipped: result.skipped + skippedSuppressed + skippedInvalid,
      skipped_suppressed: skippedSuppressed,
      skipped_invalid: skippedInvalid,
      failed: result.failed,
      dry_run: result.dry_run,
      status_summary: {
        queued_or_sent: result.sent,
        delivery_failed: result.failed,
        globally_suppressed: result.skipped,
      },
    })
  } catch (err) {
    console.error('send-event-sms error:', (err as Error).message)
    const message = (err as Error).message || 'Unknown error'
    const status = message.includes('Unauthorized') || message.includes('Not allowed') ? 403 : 400
    return jsonResponse({ ok: false, error: message }, status)
  }
})
