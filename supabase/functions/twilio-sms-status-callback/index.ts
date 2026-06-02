// Edge Function: twilio-sms-status-callback — Twilio delivery status webhook.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import {
  corsHeaders,
  createServiceClient,
  mapTwilioCallbackStatus,
  parseTwilioFormBody,
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
      console.warn('Twilio status callback signature validation failed')
      return new Response('Forbidden', { status: 403, headers: corsHeaders })
    }

    const messageSid = params.MessageSid || params.SmsSid || ''
    const twilioStatus = params.MessageStatus || params.SmsStatus || ''
    const errorCode = params.ErrorCode || null
    const errorMessage = params.ErrorMessage || null

    if (!messageSid) {
      return new Response('OK', { status: 200, headers: corsHeaders })
    }

    const status = mapTwilioCallbackStatus(twilioStatus)
    const supabase = createServiceClient()

    const { error } = await supabase
      .from('sms_message_deliveries')
      .update({
        status,
        error_code: errorCode,
        error_message: errorMessage,
        status_updated_at: new Date().toISOString(),
      })
      .eq('twilio_message_sid', messageSid)

    if (error) {
      console.error('Status callback update failed for sid', messageSid.slice(0, 8) + '…', error.message)
    }

    return new Response('OK', { status: 200, headers: corsHeaders })
  } catch (err) {
    console.error('twilio-sms-status-callback error:', (err as Error).message)
    return new Response('OK', { status: 200, headers: corsHeaders })
  }
})
