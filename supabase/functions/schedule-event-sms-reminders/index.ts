// Edge Function: schedule-event-sms-reminders — 24h SMS reminders (Phase 5.2).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import {
  assertServiceRole,
  buildReminder24hBody,
  corsHeaders,
  createServiceClient,
  eventHasDistributedDocs,
  executeSendSms,
  hasReminder24hBeenSent,
  isSmsRemindersEnabled,
  jsonResponse,
  reminder24hWindowBounds,
  resolveOptedInSmsTargets,
  type EventSmsEventRow,
} from '../_shared/sms.ts'

const ACTIVE_EVENT_STATUSES = ['open', 'confirmed', 'active'] as const

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    assertServiceRole(req)

    const emptySummary = {
      success: true,
      enabled: false,
      events_checked: 0,
      events_sent: 0,
      recipients_sent: 0,
      events_skipped_duplicate: 0,
      recipients_skipped: 0,
    }

    if (!isSmsRemindersEnabled()) {
      return jsonResponse(emptySummary)
    }

    const supabase = createServiceClient()
    const { start, end } = reminder24hWindowBounds()

    const { data: events, error: evtErr } = await supabase
      .from('events')
      .select(`
        id, title, start_date, timezone, status,
        location_text, location_nickname, gate_location, raffle_enabled
      `)
      .gte('start_date', start.toISOString())
      .lt('start_date', end.toISOString())
      .in('status', [...ACTIVE_EVENT_STATUSES])

    if (evtErr) throw new Error(evtErr.message)

    let events_sent = 0
    let recipients_sent = 0
    let events_skipped_duplicate = 0
    let recipients_skipped = 0

    for (const event of events || []) {
      if (await hasReminder24hBeenSent(supabase, event.id)) {
        events_skipped_duplicate++
        continue
      }

      const { targets, skipped_invalid, skipped_suppressed } = await resolveOptedInSmsTargets(
        supabase,
        event.id,
      )

      recipients_skipped += skipped_invalid + skipped_suppressed

      if (!targets.length) continue

      const eventRow = event as EventSmsEventRow
      const hasLocation = !!(eventRow.location_nickname || eventRow.location_text || '').trim()
      const includeDocsHint = await eventHasDistributedDocs(supabase, event.id)

      const body = buildReminder24hBody(eventRow, {
        include_location: hasLocation,
        include_raffle_hint: !!eventRow.raffle_enabled,
        include_docs_hint: includeDocsHint,
      })

      const { data: messageRow, error: messageErr } = await supabase
        .from('sms_messages')
        .insert({
          event_id: event.id,
          channel: 'sms',
          body,
          message_type: 'reminder_24h',
          sender_user_id: null,
          recipient_count: targets.length,
        })
        .select('id')
        .single()

      if (messageErr || !messageRow?.id) {
        console.error('24h reminder sms_messages insert failed for event', event.id, messageErr?.message)
        recipients_skipped += targets.length
        continue
      }

      const result = await executeSendSms(supabase, {
        message_id: messageRow.id,
        body,
        recipients: targets,
      })

      events_sent++
      recipients_sent += result.sent
      recipients_skipped += result.skipped + result.failed
    }

    return jsonResponse({
      success: true,
      enabled: true,
      events_checked: (events || []).length,
      events_sent,
      recipients_sent,
      events_skipped_duplicate,
      recipients_skipped,
    })
  } catch (err) {
    console.error('schedule-event-sms-reminders error:', (err as Error).message)
    const message = (err as Error).message || 'Unknown error'
    const status = message.includes('Unauthorized') ? 401 : 500
    return jsonResponse({ success: false, error: message }, status)
  }
})
