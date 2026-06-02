// Edge Function: send-sms — internal shared SMS sender (service role only).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import {
  assertServiceRole,
  corsHeaders,
  createServiceClient,
  executeSendSms,
  jsonResponse,
  type SendRecipient,
} from '../_shared/sms.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    assertServiceRole(req)

    const body = await req.json()
    const messageId = String(body.message_id || '')
    const text = String(body.body || '')
    const recipients = (body.recipients || []) as SendRecipient[]
    const statusCallbackUrl = body.status_callback_url
      ? String(body.status_callback_url)
      : null
    const forceDryRun = body.force_dry_run === true

    const supabase = createServiceClient()
    const result = await executeSendSms(supabase, {
      message_id: messageId,
      body: text,
      recipients,
      status_callback_url: statusCallbackUrl,
      force_dry_run: forceDryRun,
    })

    return jsonResponse({ ok: true, ...result })
  } catch (err) {
    console.error('send-sms error:', (err as Error).message)
    const message = (err as Error).message || 'Unknown error'
    const status = message.includes('Unauthorized') ? 401 : 400
    return jsonResponse({ ok: false, error: message }, status)
  }
})
