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

export type EventSmsConsentSource = 'guest_rsvp' | 'member_rsvp' | 'member_profile' | 'admin_manual'

export type UpsertEventSmsRecipientInput = {
  event_id: string
  phone_raw?: string | null
  sms_opt_in?: boolean
  sms_consent_text_version?: string
  display_name?: string | null
  email?: string | null
  user_id?: string | null
  guest_rsvp_id?: string | null
  event_rsvp_id?: string | null
  consent_source: EventSmsConsentSource
}

export type UpsertEventSmsRecipientResult = {
  ok: boolean
  opted_in: boolean
  reason?: string
  recipient_id?: string
  contact_id?: string
}

/** Persist event SMS opt-in/out. Does not send messages. */
export async function upsertEventSmsRecipient(
  supabase: SupabaseClient,
  input: UpsertEventSmsRecipientInput,
): Promise<UpsertEventSmsRecipientResult> {
  const consentVersion = input.sms_consent_text_version || 'event_sms_v1'

  if (!input.sms_opt_in) {
    if (input.user_id) {
      const { error } = await supabase
        .from('event_sms_recipients')
        .update({
          opted_in: false,
          opted_out_at: new Date().toISOString(),
        })
        .eq('event_id', input.event_id)
        .eq('user_id', input.user_id)

      if (error) {
        console.error('Event SMS opt-out failed for user', input.user_id, error.message)
        return { ok: false, opted_in: false, reason: 'opt_out_failed' }
      }
    }
    return { ok: true, opted_in: false, reason: 'no_consent' }
  }

  const phoneE164 = input.phone_raw ? normalizePhoneE164(input.phone_raw) : null
  if (!phoneE164) {
    return { ok: true, opted_in: false, reason: 'invalid_phone' }
  }

  const { data: existingContact } = await supabase
    .from('sms_phone_contacts')
    .select('id, user_id')
    .eq('phone_e164', phoneE164)
    .maybeSingle()

  let contactId = existingContact?.id as string | undefined

  if (!contactId) {
    const { data: inserted, error: contactErr } = await supabase
      .from('sms_phone_contacts')
      .insert({
        phone_e164: phoneE164,
        user_id: input.user_id ?? null,
      })
      .select('id')
      .single()

    if (contactErr || !inserted?.id) {
      console.error('sms_phone_contacts insert failed', maskPhone(phoneE164), contactErr?.message)
      return { ok: false, opted_in: false, reason: 'contact_insert_failed' }
    }
    contactId = inserted.id
  } else if (input.user_id && !existingContact?.user_id) {
    await supabase
      .from('sms_phone_contacts')
      .update({ user_id: input.user_id })
      .eq('id', contactId)
  }

  const { data: recipient, error: recipientErr } = await supabase
    .from('event_sms_recipients')
    .upsert(
      {
        event_id: input.event_id,
        contact_id: contactId,
        display_name: input.display_name ?? null,
        email: input.email ?? null,
        user_id: input.user_id ?? null,
        guest_rsvp_id: input.guest_rsvp_id ?? null,
        event_rsvp_id: input.event_rsvp_id ?? null,
        opted_in: true,
        opted_in_at: new Date().toISOString(),
        opted_out_at: null,
        consent_source: input.consent_source,
        consent_text_version: consentVersion,
      },
      { onConflict: 'event_id,contact_id' },
    )
    .select('id')
    .single()

  if (recipientErr || !recipient?.id) {
    console.error('event_sms_recipients upsert failed', recipientErr?.message)
    return { ok: false, opted_in: false, reason: 'recipient_upsert_failed' }
  }

  return {
    ok: true,
    opted_in: true,
    recipient_id: recipient.id,
    contact_id: contactId,
  }
}

// ── RSVP confirmation SMS (Phase 5.1) ───────────────────────────

export function isRsvpConfirmationsEnabled(): boolean {
  return Deno.env.get('SMS_RSVP_CONFIRMATIONS_ENABLED') === 'true'
}

export type EventSmsEventRow = {
  title: string
  start_date: string
  timezone?: string | null
  location_text?: string | null
  location_nickname?: string | null
  gate_location?: boolean | null
  gate_time?: boolean | null
  raffle_enabled?: boolean | null
}

export function formatEventDateTimeForSms(startDate: string, timezone?: string | null): string {
  const d = new Date(startDate)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: (timezone || 'America/New_York').trim() || 'America/New_York',
  })
}

/** Build RSVP confirmation body. Caller omits location when gate rules are uncertain. */
export function buildRsvpConfirmationBody(
  event: EventSmsEventRow,
  opts: {
    include_location?: boolean
    include_raffle_hint?: boolean
    include_docs_hint?: boolean
  } = {},
): string {
  const title = (event.title || 'the event').trim()
  const when = formatEventDateTimeForSms(event.start_date, event.timezone)
  const parts = [`Thanks for RSVPing to ${title}!`]
  if (when) parts.push(when + '.')

  if (opts.include_location) {
    const loc = (event.location_nickname || event.location_text || '').trim()
    if (loc) parts.push(`Location: ${loc}.`)
  }

  if (opts.include_raffle_hint && event.raffle_enabled) {
    parts.push('Raffle entry is available for this event.')
  }

  if (opts.include_docs_hint) {
    parts.push('Event documents are posted in the portal.')
  }

  parts.push('Reply STOP to opt out.')
  let body = parts.join(' ')
  if (body.length > 480) {
    body = body.slice(0, 477) + '...'
  }
  return body
}

export async function hasRsvpConfirmationBeenSent(
  supabase: SupabaseClient,
  eventId: string,
  recipientId: string,
): Promise<boolean> {
  const { data: messages, error: msgErr } = await supabase
    .from('sms_messages')
    .select('id')
    .eq('event_id', eventId)
    .eq('message_type', 'rsvp_confirmation')

  if (msgErr) {
    console.error('RSVP confirmation duplicate check (messages) failed', msgErr.message)
    return false
  }

  const messageIds = (messages || []).map((m) => m.id)
  if (!messageIds.length) return false

  const { count, error: delErr } = await supabase
    .from('sms_message_deliveries')
    .select('id', { count: 'exact', head: true })
    .eq('event_sms_recipient_id', recipientId)
    .in('message_id', messageIds)

  if (delErr) {
    console.error('RSVP confirmation duplicate check (deliveries) failed', delErr.message)
    return false
  }

  return (count ?? 0) > 0
}

export type RsvpConfirmationSendResult = {
  ok: boolean
  skipped?: boolean
  already_sent?: boolean
  reason?: string
  message_id?: string | null
  dry_run?: boolean
  phone_masked?: string
  sent?: number
  failed?: number
}

export async function sendEventRsvpConfirmation(
  supabase: SupabaseClient,
  input: { event_id: string; event_sms_recipient_id: string },
): Promise<RsvpConfirmationSendResult> {
  if (!isRsvpConfirmationsEnabled()) {
    return { ok: true, skipped: true, reason: 'confirmations_disabled' }
  }

  const eventId = input.event_id
  const recipientId = input.event_sms_recipient_id
  if (!eventId || !recipientId) {
    return { ok: false, reason: 'missing_ids' }
  }

  if (await hasRsvpConfirmationBeenSent(supabase, eventId, recipientId)) {
    return { ok: true, skipped: true, already_sent: true, reason: 'already_sent' }
  }

  const { data: recipient, error: recErr } = await supabase
    .from('event_sms_recipients')
    .select(`
      id, event_id, opted_in, opted_out_at, guest_rsvp_id, event_rsvp_id,
      sms_phone_contacts ( phone_e164 )
    `)
    .eq('id', recipientId)
    .eq('event_id', eventId)
    .maybeSingle()

  if (recErr) {
    console.error('RSVP confirmation recipient load failed', recErr.message)
    return { ok: false, reason: 'recipient_load_failed' }
  }

  if (!recipient?.opted_in || recipient.opted_out_at) {
    return { ok: true, skipped: true, reason: 'not_opted_in' }
  }

  const contact = recipient.sms_phone_contacts as { phone_e164: string } | { phone_e164: string }[] | null
  const phoneRaw = Array.isArray(contact) ? contact[0]?.phone_e164 : contact?.phone_e164
  const phoneE164 = phoneRaw ? normalizePhoneE164(phoneRaw) : null
  if (!phoneE164) {
    return { ok: true, skipped: true, reason: 'invalid_phone' }
  }

  const twilioFrom = getTwilioFrom()
  if (await isPhoneGloballySuppressed(supabase, phoneE164, twilioFrom)) {
    return { ok: true, skipped: true, reason: 'globally_suppressed' }
  }

  const { data: event, error: evtErr } = await supabase
    .from('events')
    .select('title, start_date, timezone, location_text, location_nickname, gate_location, gate_time, raffle_enabled')
    .eq('id', eventId)
    .maybeSingle()

  if (evtErr || !event) {
    console.error('RSVP confirmation event load failed', evtErr?.message)
    return { ok: false, reason: 'event_load_failed' }
  }

  const rsvpConfirmed = !!(recipient.guest_rsvp_id || recipient.event_rsvp_id)
  const includeLocation = rsvpConfirmed
    ? (!!((event.location_nickname || event.location_text || '').trim()) &&
      (!event.gate_location || rsvpConfirmed))
    : false

  let includeDocsHint = false
  const { count: docCount, error: docErr } = await supabase
    .from('event_documents')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('distributed', true)

  if (!docErr && (docCount ?? 0) > 0) {
    includeDocsHint = true
  }

  const body = buildRsvpConfirmationBody(event as EventSmsEventRow, {
    include_location: includeLocation,
    include_raffle_hint: !!event.raffle_enabled,
    include_docs_hint: includeDocsHint,
  })

  const { data: messageRow, error: messageErr } = await supabase
    .from('sms_messages')
    .insert({
      event_id: eventId,
      body,
      message_type: 'rsvp_confirmation',
      sender_user_id: null,
      recipient_count: 1,
    })
    .select('id')
    .single()

  if (messageErr || !messageRow?.id) {
    console.error('RSVP confirmation sms_messages insert failed', messageErr?.message)
    return { ok: false, reason: 'message_insert_failed' }
  }

  const sendResult = await executeSendSms(supabase, {
    message_id: messageRow.id,
    body,
    recipients: [{
      event_sms_recipient_id: recipientId,
      phone_e164: phoneE164,
    }],
  })

  return {
    ok: true,
    message_id: messageRow.id,
    dry_run: sendResult.dry_run,
    phone_masked: maskPhone(phoneE164),
    sent: sendResult.sent,
    failed: sendResult.failed,
  }
}

/** Fire-and-forget RSVP confirmation; never throws to caller. */
export async function trySendEventRsvpConfirmation(
  supabase: SupabaseClient,
  input: {
    event_id: string
    event_sms_recipient_id?: string | null
    upsert_result?: UpsertEventSmsRecipientResult
  },
): Promise<void> {
  const recipientId = input.event_sms_recipient_id ?? input.upsert_result?.recipient_id ?? null
  if (!recipientId || !input.upsert_result?.opted_in) return

  try {
    const result = await sendEventRsvpConfirmation(supabase, {
      event_id: input.event_id,
      event_sms_recipient_id: recipientId,
    })
    if (!result.ok) {
      console.error('RSVP confirmation send failed', input.event_id, recipientId, result.reason)
    } else if (result.skipped && result.reason) {
      console.log('RSVP confirmation skipped', input.event_id, recipientId, result.reason)
    }
  } catch (err) {
    console.error(
      'RSVP confirmation unexpected error (non-blocking)',
      input.event_id,
      recipientId,
      (err as Error).message,
    )
  }
}
