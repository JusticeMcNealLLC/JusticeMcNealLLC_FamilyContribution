// Edge Function: send-event-rsvp-confirmation — service-role RSVP thank-you SMS (Phase 5.1).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import {
  assertServiceRole,
  corsHeaders,
  createServiceClient,
  jsonResponse,
  sendEventRsvpConfirmation,
} from '../_shared/sms.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    assertServiceRole(req)
    const body = await req.json()
    const eventId = String(body.event_id || '')
    const recipientId = String(body.event_sms_recipient_id || '')

    if (!eventId || !recipientId) {
      throw new Error('event_id and event_sms_recipient_id are required')
    }

    const supabase = createServiceClient()
    const result = await sendEventRsvpConfirmation(supabase, {
      event_id: eventId,
      event_sms_recipient_id: recipientId,
    })

    return jsonResponse({ ok: result.ok, ...result })
  } catch (err) {
    console.error('send-event-rsvp-confirmation error:', (err as Error).message)
    const message = (err as Error).message || 'Unknown error'
    const status = message.includes('Unauthorized') ? 401 : 400
    return jsonResponse({ ok: false, error: message }, status)
  }
})
