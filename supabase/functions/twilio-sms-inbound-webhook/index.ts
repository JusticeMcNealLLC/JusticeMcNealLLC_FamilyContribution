// Edge Function: twilio-sms-inbound-webhook — STOP/START/HELP inbound SMS.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import {
  corsHeaders,
  createServiceClient,
  normalizePhoneE164,
  parseInboundCommand,
  parseTwilioFormBody,
  formatOutboundSmsBody,
  twimlResponse,
  validateTwilioSignature,
} from '../_shared/sms.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const params = await parseTwilioFormBody(req)
    const signatureOk = await validateTwilioSignature(req, params)
    if (!signatureOk) {
      console.warn('Twilio inbound signature validation failed')
      return new Response('Forbidden', { status: 403, headers: corsHeaders })
    }

    const fromRaw = params.From || ''
    const body = params.Body || ''
    const messageSid = params.MessageSid || params.SmsSid || null
    const toNumber = params.To || null
    const phone = normalizePhoneE164(fromRaw)

    const supabase = createServiceClient()
    const command = parseInboundCommand(body)

    await supabase.from('sms_inbound_messages').insert({
      phone_e164: phone || fromRaw,
      body,
      twilio_message_sid: messageSid,
      parsed_command: command,
      raw_payload: params,
      received_at: new Date().toISOString(),
    })

    if (phone && command === 'STOP') {
      const { data: existing } = await supabase
        .from('sms_global_suppressions')
        .select('id, twilio_from')
        .eq('phone_e164', phone)
        .is('released_at', null)

      const hasActive = (existing || []).some((row) =>
        !toNumber || !row.twilio_from || row.twilio_from === toNumber
      )

      if (!hasActive) {
        await supabase.from('sms_global_suppressions').insert({
          phone_e164: phone,
          reason: 'twilio_stop',
          source: 'inbound_webhook',
          twilio_from: toNumber,
          suppressed_at: new Date().toISOString(),
        })
      }
    }

    if (phone && (command === 'START' || command === 'UNSTOP')) {
      const { data: active } = await supabase
        .from('sms_global_suppressions')
        .select('id, twilio_from')
        .eq('phone_e164', phone)
        .is('released_at', null)

      const ids = (active || [])
        .filter((row) => !toNumber || !row.twilio_from || row.twilio_from === toNumber)
        .map((row) => row.id)

      if (ids.length) {
        await supabase
          .from('sms_global_suppressions')
          .update({ released_at: new Date().toISOString() })
          .in('id', ids)
      }
    }

    if (command === 'HELP') {
      const helpText = formatOutboundSmsBody(
        'Event SMS: reply STOP to opt out. Contact your event host for help.',
      )
      return twimlResponse(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${helpText}</Message></Response>`,
      )
    }

    if (command === 'STOP') {
      const stopText = formatOutboundSmsBody(
        'You are unsubscribed from SMS updates for this number. Reply START to resubscribe.',
      )
      return twimlResponse(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${stopText}</Message></Response>`,
      )
    }

    return twimlResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>')
  } catch (err) {
    console.error('twilio-sms-inbound-webhook error:', (err as Error).message)
    return twimlResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>')
  }
})
