// Shared SMS / Twilio helpers for Event SMS Edge Functions.

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-twilio-signature',
}

export type DeliveryStatus =
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'undelivered'
  | 'opted_out'
  | 'skipped'
  | 'invalid_phone'

export type SendRecipient = {
  event_sms_recipient_id?: string | null
  phone_e164: string
}

export type SendSmsResult = {
  message_id: string
  total: number
  sent: number
  skipped: number
  failed: number
  dry_run: boolean
  deliveries: Array<{
    delivery_id: string
    status: DeliveryStatus
    phone_masked: string
  }>
}

export function createServiceClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) throw new Error('Supabase service configuration missing')
  return createClient(url, key)
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

export function twimlResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
  })
}

export function assertServiceRole(req: Request): void {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!serviceKey || token !== serviceKey) {
    throw new Error('Unauthorized: service role required')
  }
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 4) return '***'
  const last4 = digits.slice(-4)
  return `***-***-${last4}`
}

export function normalizePhoneE164(raw: string): string | null {
  const trimmed = (raw ?? '').trim()
  if (!trimmed) return null

  const digits = trimmed.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  if (trimmed.startsWith('+') && digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`
  }
  if (digits.length >= 10 && digits.length <= 15) return `+${digits}`
  return null
}

export function isSmsDryRun(forceDryRun = false): boolean {
  if (forceDryRun) return true
  if (Deno.env.get('SMS_DRY_RUN') === 'true') return true
  if (Deno.env.get('SMS_SEND_ENABLED') !== 'true') return true
  return false
}

export function getTwilioFrom(): string | null {
  return Deno.env.get('TWILIO_FROM_PHONE')?.trim() || null
}

export function getTwilioMessagingServiceSid(): string | null {
  return Deno.env.get('TWILIO_MESSAGING_SERVICE_SID')?.trim() || null
}

export function getDefaultStatusCallbackUrl(): string | null {
  const base = Deno.env.get('SUPABASE_URL')?.replace(/\/$/, '')
  if (!base) return null
  return `${base}/functions/v1/twilio-sms-status-callback`
}

export function mapTwilioOutboundStatus(twilioStatus: string): DeliveryStatus {
  const s = (twilioStatus ?? '').toLowerCase()
  if (s === 'queued' || s === 'accepted') return 'queued'
  if (s === 'sending' || s === 'sent') return 'sent'
  if (s === 'delivered') return 'delivered'
  if (s === 'failed') return 'failed'
  if (s === 'undelivered') return 'undelivered'
  return 'queued'
}

export function mapTwilioCallbackStatus(twilioStatus: string): DeliveryStatus {
  return mapTwilioOutboundStatus(twilioStatus)
}

export async function isPhoneGloballySuppressed(
  supabase: SupabaseClient,
  phoneE164: string,
  twilioFrom: string | null,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('sms_global_suppressions')
    .select('id, twilio_from')
    .eq('phone_e164', phoneE164)
    .is('released_at', null)

  if (error) {
    console.error('Suppression lookup failed for', maskPhone(phoneE164), error.message)
    return true
  }

  return (data ?? []).some((row) => {
    if (!twilioFrom) return true
    return !row.twilio_from || row.twilio_from === twilioFrom
  })
}

export async function userCanManageEventNotifications(
  supabase: SupabaseClient,
  userId: string,
  eventId: string,
): Promise<boolean> {
  const [{ data: hasManageAll }, { data: hasNotif }] = await Promise.all([
    supabase.rpc('user_has_permission', { uid: userId, perm: 'events.manage_all' }),
    supabase.rpc('user_has_permission', { uid: userId, perm: 'events.manage_notifications' }),
  ])

  if (hasManageAll || hasNotif) return true

  const { data: event } = await supabase
    .from('events')
    .select('created_by')
    .eq('id', eventId)
    .maybeSingle()

  if (event?.created_by === userId) return true

  const { data: host } = await supabase
    .from('event_hosts')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .maybeSingle()

  return !!host
}

async function twilioSendMessage(
  to: string,
  body: string,
  statusCallbackUrl?: string | null,
): Promise<{ ok: true; sid: string } | { ok: false; code?: string; message: string }> {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')
  const messagingServiceSid = getTwilioMessagingServiceSid()
  const fromPhone = getTwilioFrom()

  if (!accountSid || !authToken) {
    return { ok: false, message: 'Twilio credentials not configured' }
  }
  if (!messagingServiceSid && !fromPhone) {
    return { ok: false, message: 'TWILIO_MESSAGING_SERVICE_SID or TWILIO_FROM_PHONE required' }
  }

  const form = new URLSearchParams()
  form.set('To', to)
  form.set('Body', body)
  if (messagingServiceSid) {
    form.set('MessagingServiceSid', messagingServiceSid)
  } else if (fromPhone) {
    form.set('From', fromPhone)
  }
  if (statusCallbackUrl) form.set('StatusCallback', statusCallbackUrl)

  const auth = btoa(`${accountSid}:${authToken}`)
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    },
  )

  const payload = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message = payload?.message || `Twilio HTTP ${res.status}`
    console.error('Twilio send failed for', maskPhone(to), payload?.code || res.status)
    return { ok: false, code: payload?.code ? String(payload.code) : String(res.status), message }
  }

  return { ok: true, sid: String(payload.sid || '') }
}

export async function executeSendSms(
  supabase: SupabaseClient,
  input: {
    message_id: string
    body: string
    recipients: SendRecipient[]
    status_callback_url?: string | null
    force_dry_run?: boolean
  },
): Promise<SendSmsResult> {
  const messageId = input.message_id
  const body = (input.body ?? '').trim()
  if (!messageId) throw new Error('message_id is required')
  if (!body) throw new Error('body is required')
  if (!input.recipients?.length) throw new Error('recipients is required')

  const { data: messageRow, error: messageErr } = await supabase
    .from('sms_messages')
    .select('id')
    .eq('id', messageId)
    .maybeSingle()

  if (messageErr || !messageRow) throw new Error('sms_messages row not found')

  const dryRun = isSmsDryRun(input.force_dry_run)
  const statusCallback = input.status_callback_url ?? getDefaultStatusCallbackUrl()
  const twilioFrom = getTwilioFrom()

  let sent = 0
  let skipped = 0
  let failed = 0
  const deliveries: SendSmsResult['deliveries'] = []

  for (const recipient of input.recipients) {
    const normalized = normalizePhoneE164(recipient.phone_e164)
    const masked = maskPhone(recipient.phone_e164 || '')

    if (!normalized) {
      const { data: row } = await supabase
        .from('sms_message_deliveries')
        .insert({
          message_id: messageId,
          event_sms_recipient_id: recipient.event_sms_recipient_id ?? null,
          phone_e164: recipient.phone_e164 || 'invalid',
          status: 'invalid_phone',
          error_message: 'Invalid phone number',
          status_updated_at: new Date().toISOString(),
        })
        .select('id')
        .single()

      failed++
      if (row?.id) {
        deliveries.push({ delivery_id: row.id, status: 'invalid_phone', phone_masked: masked })
      }
      continue
    }

    const suppressed = await isPhoneGloballySuppressed(supabase, normalized, twilioFrom)
    if (suppressed) {
      const { data: row } = await supabase
        .from('sms_message_deliveries')
        .insert({
          message_id: messageId,
          event_sms_recipient_id: recipient.event_sms_recipient_id ?? null,
          phone_e164: normalized,
          status: 'opted_out',
          error_message: 'Globally suppressed',
          status_updated_at: new Date().toISOString(),
        })
        .select('id')
        .single()

      skipped++
      if (row?.id) {
        deliveries.push({ delivery_id: row.id, status: 'opted_out', phone_masked: maskPhone(normalized) })
      }
      continue
    }

    const { data: delivery, error: insertErr } = await supabase
      .from('sms_message_deliveries')
      .insert({
        message_id: messageId,
        event_sms_recipient_id: recipient.event_sms_recipient_id ?? null,
        phone_e164: normalized,
        status: 'queued',
        status_updated_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (insertErr || !delivery?.id) {
      console.error('Delivery insert failed for', maskPhone(normalized), insertErr?.message)
      failed++
      continue
    }

    if (dryRun) {
      const fakeSid = `dry_run_${crypto.randomUUID()}`
      await supabase
        .from('sms_message_deliveries')
        .update({
          twilio_message_sid: fakeSid,
          status: 'sent',
          status_updated_at: new Date().toISOString(),
        })
        .eq('id', delivery.id)

      sent++
      deliveries.push({
        delivery_id: delivery.id,
        status: 'sent',
        phone_masked: maskPhone(normalized),
      })
      continue
    }

    const twilioResult = await twilioSendMessage(normalized, body, statusCallback)
    if (!twilioResult.ok) {
      await supabase
        .from('sms_message_deliveries')
        .update({
          status: 'failed',
          error_code: twilioResult.code ?? null,
          error_message: twilioResult.message,
          status_updated_at: new Date().toISOString(),
        })
        .eq('id', delivery.id)

      failed++
      deliveries.push({
        delivery_id: delivery.id,
        status: 'failed',
        phone_masked: maskPhone(normalized),
      })
      continue
    }

    await supabase
      .from('sms_message_deliveries')
      .update({
        twilio_message_sid: twilioResult.sid,
        status: 'sent',
        status_updated_at: new Date().toISOString(),
      })
      .eq('id', delivery.id)

    sent++
    deliveries.push({
      delivery_id: delivery.id,
      status: 'sent',
      phone_masked: maskPhone(normalized),
    })
  }

  await supabase
    .from('sms_messages')
    .update({ recipient_count: input.recipients.length })
    .eq('id', messageId)

  return {
    message_id: messageId,
    total: input.recipients.length,
    sent,
    skipped,
    failed,
    dry_run: dryRun,
    deliveries,
  }
}

/** Parse application/x-www-form-urlencoded or multipart-ish Twilio body. */
export async function parseTwilioFormBody(req: Request): Promise<Record<string, string>> {
  const contentType = req.headers.get('content-type') ?? ''
  const raw = await req.text()
  const params: Record<string, string> = {}

  if (contentType.includes('application/x-www-form-urlencoded') || raw.includes('=')) {
    const search = new URLSearchParams(raw)
    search.forEach((value, key) => {
      params[key] = value
    })
    return params
  }

  try {
    const json = JSON.parse(raw)
    if (json && typeof json === 'object') {
      for (const [k, v] of Object.entries(json)) {
        if (typeof v === 'string') params[k] = v
      }
    }
  } catch {
    // ignore
  }
  return params
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

/** Twilio request signature validation (HMAC-SHA1). */
export async function validateTwilioSignature(
  req: Request,
  params: Record<string, string>,
): Promise<boolean> {
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')
  const signature = req.headers.get('x-twilio-signature') || req.headers.get('X-Twilio-Signature')
  if (!authToken || !signature) {
    console.warn('Twilio signature validation skipped: missing token or signature header')
    return false
  }

  const url = new URL(req.url)
  const data = url.toString() + Object.keys(params).sort().map((k) => k + params[k]).join('')

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(authToken),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  const expected = bytesToBase64(new Uint8Array(sig))

  if (expected.length !== signature.length) return false
  let mismatch = 0
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i)
  }
  return mismatch === 0
}

export function parseInboundCommand(body: string): string | null {
  const normalized = (body ?? '').trim().toUpperCase()
  if (!normalized) return null
  const first = normalized.split(/\s+/)[0]?.replace(/[^A-Z]/g, '')
  if (first === 'STOP' || first === 'STOPALL' || first === 'UNSUBSCRIBE' || first === 'CANCEL' || first === 'END' || first === 'QUIT') {
    return 'STOP'
  }
  if (first === 'START' || first === 'UNSTOP') return first === 'UNSTOP' ? 'UNSTOP' : 'START'
  if (first === 'HELP' || first === 'INFO') return 'HELP'
  return null
}
