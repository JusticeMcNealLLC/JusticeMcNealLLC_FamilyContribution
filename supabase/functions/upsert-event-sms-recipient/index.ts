// Edge Function: upsert-event-sms-recipient — member event SMS opt-in/out (no send).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import {
  corsHeaders,
  createServiceClient,
  jsonResponse,
  upsertEventSmsRecipient,
  trySendEventRsvpConfirmation,
} from '../_shared/sms.ts'

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
    const smsOptIn = body.sms_opt_in === true

    if (!eventId) throw new Error('event_id is required')

    const { data: profile } = await supabase
      .from('profiles')
      .select('phone, first_name, last_name')
      .eq('id', user.id)
      .single()

    const displayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim() || null

    const { data: memberRsvp } = await supabase
      .from('event_rsvps')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .eq('status', 'going')
      .maybeSingle()

    const result = await upsertEventSmsRecipient(supabase, {
      event_id: eventId,
      phone_raw: profile?.phone || null,
      sms_opt_in: smsOptIn,
      sms_consent_text_version: body.sms_consent_text_version || 'event_sms_v1',
      display_name: displayName,
      user_id: user.id,
      event_rsvp_id: memberRsvp?.id ?? null,
      consent_source: 'member_rsvp',
    })

    if (smsOptIn && result.reason === 'invalid_phone') {
      return jsonResponse({
        ok: false,
        error: 'Add a phone number to your profile to receive event SMS updates.',
        opted_in: false,
      }, 400)
    }

    if (smsOptIn && result.opted_in && result.recipient_id) {
      await trySendEventRsvpConfirmation(supabase, {
        event_id: eventId,
        upsert_result: result,
      })
    }

    return jsonResponse({
      ok: result.ok,
      opted_in: result.opted_in,
      reason: result.reason,
    })
  } catch (err) {
    console.error('upsert-event-sms-recipient error:', (err as Error).message)
    const message = (err as Error).message || 'Unknown error'
    const status = message.includes('Unauthorized') ? 401 : 400
    return jsonResponse({ ok: false, error: message }, status)
  }
})
