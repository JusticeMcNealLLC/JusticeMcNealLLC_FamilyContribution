// Edge Function: send-event-invites — host SMS with event title + public link (§13.12 line 457)

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

const MAX_RECIPIENTS = 100

function publicInviteUrl(origin: string, slug: string): string {
  const base = (origin || 'https://justicemcneal.com').replace(/\/$/, '')
  return `${base}/events/?e=${encodeURIComponent(slug)}`
}

function buildInviteSmsBody(eventTitle: string, inviteUrl: string): string {
  const title = (eventTitle || 'Event').trim() || 'Event'
  return `${title}: You're invited. ${inviteUrl}`
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
    const eventId = String(body.event_id || '').trim()
    const memberIds = Array.isArray(body.member_ids)
      ? [...new Set(body.member_ids.map((id: unknown) => String(id || '').trim()).filter(Boolean))]
      : []
    const rawPhones = Array.isArray(body.phones)
      ? body.phones.map((p: unknown) => String(p || '').trim()).filter(Boolean)
      : []
    const forceDryRun = body.dry_run === true

    if (!eventId) throw new Error('event_id is required')
    if (!memberIds.length && !rawPhones.length) {
      throw new Error('member_ids or phones is required')
    }

    const canManage = await userCanManageEventNotifications(supabase, user.id, eventId)
    if (!canManage) throw new Error('Not allowed to send event SMS')

    const { data: event, error: eventErr } = await supabase
      .from('events')
      .select('id, title, slug')
      .eq('id', eventId)
      .maybeSingle()

    if (eventErr) throw new Error(eventErr.message)
    if (!event?.slug) throw new Error('Event not found or missing public slug')

    const origin = Deno.env.get('PUBLIC_SITE_ORIGIN') || 'https://justicemcneal.com'
    const inviteUrl = publicInviteUrl(origin, String(event.slug))
    const smsBody = buildInviteSmsBody(String(event.title || 'Event'), inviteUrl)

    const phoneSet = new Map<string, { phone_e164: string; source: string }>()
    let skippedInvalid = 0
    let skippedSuppressed = 0

    if (memberIds.length) {
      const { data: profiles, error: profErr } = await supabase
        .from('profiles')
        .select('id, phone')
        .in('id', memberIds)
      if (profErr) throw new Error(profErr.message)

      const byId = new Map((profiles || []).map((p) => [p.id, p]))
      for (const id of memberIds) {
        const row = byId.get(id)
        const normalized = row?.phone ? normalizePhoneE164(String(row.phone)) : null
        if (!normalized) {
          skippedInvalid++
          continue
        }
        if (!phoneSet.has(normalized)) {
          phoneSet.set(normalized, { phone_e164: normalized, source: `member:${id}` })
        }
      }
    }

    for (const raw of rawPhones) {
      const normalized = normalizePhoneE164(raw)
      if (!normalized) {
        skippedInvalid++
        continue
      }
      if (!phoneSet.has(normalized)) {
        phoneSet.set(normalized, { phone_e164: normalized, source: 'phone' })
      }
    }

    const twilioFrom = Deno.env.get('TWILIO_FROM_PHONE')?.trim() || null
    const eligible: Array<{ phone_e164: string }> = []
    for (const entry of phoneSet.values()) {
      if (await isPhoneGloballySuppressed(supabase, entry.phone_e164, twilioFrom)) {
        skippedSuppressed++
        continue
      }
      eligible.push({ phone_e164: entry.phone_e164 })
    }

    if (!eligible.length) {
      return jsonResponse({
        ok: true,
        message_id: null,
        sent: 0,
        dry_run: forceDryRun,
        skipped_invalid: skippedInvalid,
        skipped_suppressed: skippedSuppressed,
        results: [],
        status_summary: 'no_eligible_recipients',
      })
    }

    if (eligible.length > MAX_RECIPIENTS) {
      throw new Error(`Too many recipients (max ${MAX_RECIPIENTS}). Deselect some and try again.`)
    }

    const { data: messageRow, error: messageErr } = await supabase
      .from('sms_messages')
      .insert({
        event_id: eventId,
        body: smsBody,
        message_type: 'event_invite',
        sender_user_id: user.id,
        recipient_count: eligible.length,
      })
      .select('id')
      .single()

    if (messageErr || !messageRow?.id) {
      throw new Error(messageErr?.message || 'Failed to create sms_messages row')
    }

    const result = await executeSendSms(supabase, {
      message_id: messageRow.id,
      body: smsBody,
      recipients: eligible,
      force_dry_run: forceDryRun,
    })

    return jsonResponse({
      ok: true,
      message_id: messageRow.id,
      sent: result.sent,
      failed: result.failed,
      dry_run: result.dry_run,
      skipped_invalid: skippedInvalid,
      skipped_suppressed: skippedSuppressed + result.skipped,
      results: (result.deliveries || []).map((d) => ({
        delivery_id: d.delivery_id,
        status: d.status,
        phone_masked: d.phone_masked,
      })),
    })
  } catch (err) {
    console.error('send-event-invites error:', (err as Error).message)
    const message = (err as Error).message || 'Unknown error'
    const status = message.includes('Unauthorized') || message.includes('Not allowed') ? 403 : 400
    return jsonResponse({ ok: false, error: message }, status)
  }
})
