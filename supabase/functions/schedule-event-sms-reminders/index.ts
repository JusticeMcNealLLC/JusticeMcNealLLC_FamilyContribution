// Edge Function: schedule-event-sms-reminders — 24h SMS reminder shell (disabled by default).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import {
  assertServiceRole,
  corsHeaders,
  createServiceClient,
  executeSendSms,
  isPhoneGloballySuppressed,
  jsonResponse,
  normalizePhoneE164,
} from '../_shared/sms.ts'

const REMINDER_WINDOW = { hoursMin: 23, hoursMax: 25 }

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    assertServiceRole(req)

    const supabase = createServiceClient()
    const now = new Date()
    const remindersEnabled = Deno.env.get('SMS_REMINDERS_ENABLED') === 'true'

    const start = new Date(now.getTime() + REMINDER_WINDOW.hoursMin * 60 * 60 * 1000)
    const end = new Date(now.getTime() + REMINDER_WINDOW.hoursMax * 60 * 60 * 1000)

    const { data: events, error: evtErr } = await supabase
      .from('events')
      .select('id, title, start_date, location_text, status, timezone')
      .gte('start_date', start.toISOString())
      .lte('start_date', end.toISOString())
      .in('status', ['open', 'confirmed', 'active'])

    if (evtErr) throw new Error(evtErr.message)

    const summary: Array<{
      event_id: string
      eligible: number
      sent: number
      skipped: number
      reminders_enabled: boolean
    }> = []

    for (const event of events || []) {
      const { data: recipients } = await supabase
        .from('event_sms_recipients')
        .select('id, sms_phone_contacts(phone_e164)')
        .eq('event_id', event.id)
        .eq('opted_in', true)
        .is('opted_out_at', null)

      const twilioFrom = Deno.env.get('TWILIO_FROM_PHONE')?.trim() || null
      const targets: Array<{ event_sms_recipient_id: string; phone_e164: string }> = []

      for (const row of recipients || []) {
        const contact = row.sms_phone_contacts as { phone_e164: string } | { phone_e164: string }[] | null
        const phone = Array.isArray(contact) ? contact[0]?.phone_e164 : contact?.phone_e164
        if (!phone) continue
        const normalized = normalizePhoneE164(phone)
        if (!normalized) continue
        if (await isPhoneGloballySuppressed(supabase, normalized, twilioFrom)) continue
        targets.push({ event_sms_recipient_id: row.id, phone_e164: normalized })
      }

      if (!targets.length) {
        summary.push({
          event_id: event.id,
          eligible: 0,
          sent: 0,
          skipped: 0,
          reminders_enabled: remindersEnabled,
        })
        continue
      }

      if (!remindersEnabled) {
        summary.push({
          event_id: event.id,
          eligible: targets.length,
          sent: 0,
          skipped: targets.length,
          reminders_enabled: false,
        })
        continue
      }

      const eventDate = new Date(event.start_date)
      const dateStr = eventDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        timeZone: event.timezone || 'America/New_York',
      })
      const timeStr = eventDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: event.timezone || 'America/New_York',
      })
      const locationPart = event.location_text ? ` Location: ${event.location_text}.` : ''
      const body = `Reminder: "${event.title}" starts in about 24 hours (${dateStr} at ${timeStr}).${locationPart}`

      const { data: messageRow } = await supabase
        .from('sms_messages')
        .insert({
          event_id: event.id,
          body,
          message_type: 'reminder_24h',
          recipient_count: targets.length,
        })
        .select('id')
        .single()

      if (!messageRow?.id) {
        summary.push({
          event_id: event.id,
          eligible: targets.length,
          sent: 0,
          skipped: targets.length,
          reminders_enabled: true,
        })
        continue
      }

      const result = await executeSendSms(supabase, {
        message_id: messageRow.id,
        body,
        recipients: targets,
      })

      summary.push({
        event_id: event.id,
        eligible: targets.length,
        sent: result.sent,
        skipped: result.skipped + result.failed,
        reminders_enabled: true,
      })
    }

    return jsonResponse({
      ok: true,
      reminders_enabled: remindersEnabled,
      events_in_window: (events || []).length,
      summary,
    })
  } catch (err) {
    console.error('schedule-event-sms-reminders error:', (err as Error).message)
    const message = (err as Error).message || 'Unknown error'
    const status = message.includes('Unauthorized') ? 401 : 500
    return jsonResponse({ ok: false, error: message }, status)
  }
})
