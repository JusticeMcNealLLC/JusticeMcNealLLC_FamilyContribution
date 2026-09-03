// Supabase Edge Function: event-seat-info
// Flow B — guest fills seat included options via info_invite_token (no payment)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  answersComplete,
  forRole,
  normalizeIncludedItems,
  sanitizeAnswers,
  validateAnswers,
} from '../_shared/included-items.ts'
import { DISPLAY_NAME_MAX } from '../_shared/party-seats.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') as string

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function loadSeatByToken(supabase: any, token: string) {
  const clean = String(token || '').trim()
  if (!clean) throw new Error('Invite token is required')

  const { data: seat, error } = await supabase
    .from('event_seats')
    .select('id, event_id, party_id, role, display_name, options, options_complete, info_invite_token, sort_order')
    .eq('info_invite_token', clean)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!seat?.id) throw new Error('This invite link is invalid or has expired')

  const { data: party, error: partyErr } = await supabase
    .from('event_parties')
    .select('id, status, payer_kind, payer_user_id, payer_guest_rsvp_id')
    .eq('id', seat.party_id)
    .maybeSingle()
  if (partyErr) throw new Error(partyErr.message)
  if (!party?.id || party.status === 'cancelled') {
    throw new Error('This invite is no longer available')
  }

  const { data: event, error: evtErr } = await supabase
    .from('events')
    .select('id, title, slug, status, included_items, rsvp_enabled')
    .eq('id', seat.event_id)
    .single()
  if (evtErr || !event) throw new Error('Event not found')

  return { seat, party, event }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const url = new URL(req.url)

    let action = url.searchParams.get('action') || ''
    let body: Record<string, unknown> = {}
    if (req.method === 'GET') {
      action = action || 'get'
      body = { token: url.searchParams.get('t') || url.searchParams.get('token') || '' }
    } else {
      body = await req.json().catch(() => ({}))
      action = String(body.action || action || 'get').trim()
    }

    // ── list: payer JWT or guest_token ─────────────────────
    if (action === 'list') {
      const eventId = String(body.event_id || '').trim()
      if (!eventId) throw new Error('event_id is required')

      const guestToken = body.guest_token ? String(body.guest_token).trim() : ''
      const authHeader = req.headers.get('Authorization') || ''

      let partyQuery = supabase
        .from('event_parties')
        .select('id, status')
        .eq('event_id', eventId)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: true })
        .limit(1)

      if (guestToken) {
        const { data: guestRsvp } = await supabase
          .from('event_guest_rsvps')
          .select('id')
          .eq('event_id', eventId)
          .eq('guest_token', guestToken)
          .maybeSingle()
        if (!guestRsvp?.id) throw new Error('Guest RSVP not found')
        partyQuery = partyQuery.eq('payer_kind', 'guest').eq('payer_guest_rsvp_id', guestRsvp.id)
      } else if (authHeader) {
        const userClient = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: authHeader } },
        })
        const { data: userData, error: userErr } = await userClient.auth.getUser()
        if (userErr || !userData?.user) throw new Error('Not signed in')
        partyQuery = partyQuery.eq('payer_kind', 'member').eq('payer_user_id', userData.user.id)
      } else {
        throw new Error('Authorization or guest_token required')
      }

      const { data: party, error: partyErr } = await partyQuery.maybeSingle()
      if (partyErr) throw new Error(partyErr.message)
      if (!party?.id) {
        return json({ seat_info_tokens: [], party_id: null })
      }

      const { data: seats } = await supabase
        .from('event_seats')
        .select('id, display_name, info_invite_token, options_complete, role, sort_order')
        .eq('party_id', party.id)
        .order('sort_order', { ascending: true })

      const seat_info_tokens = (seats || [])
        .filter((s: any) => s.info_invite_token && !s.options_complete)
        .map((s: any) => ({
          seat_id: s.id,
          display_name: s.display_name || 'Guest',
          info_invite_token: s.info_invite_token,
          options_complete: !!s.options_complete,
          role: s.role === 'kid' ? 'kid' : 'adult',
        }))

      return json({ party_id: party.id, seat_info_tokens })
    }

    // ── get ────────────────────────────────────────────────
    if (action === 'get') {
      const token = String(body.token || '').trim()
      const { seat, event } = await loadSeatByToken(supabase, token)
      const catalog = normalizeIncludedItems(event.included_items)
      const roleItems = forRole(catalog, seat.role)

      return json({
        seat: {
          id: seat.id,
          role: seat.role,
          display_name: seat.display_name,
          options: seat.options || {},
          options_complete: !!seat.options_complete,
        },
        event: {
          id: event.id,
          title: event.title,
          slug: event.slug,
          included_items: roleItems,
        },
      })
    }

    // ── submit ─────────────────────────────────────────────
    if (action === 'submit') {
      const token = String(body.token || '').trim()
      const { seat, event } = await loadSeatByToken(supabase, token)
      const catalog = normalizeIncludedItems(event.included_items)
      const role = seat.role === 'kid' ? 'kid' : 'adult'

      const ansErr = validateAnswers(catalog, body.options || {}, role)
      if (ansErr) throw new Error(ansErr)
      const options = sanitizeAnswers(catalog, body.options || {}, role)
      const complete = answersComplete(catalog, options, role)

      const update: Record<string, unknown> = {
        options,
        options_complete: complete,
      }
      if (body.display_name != null) {
        const name = String(body.display_name || '').trim().slice(0, DISPLAY_NAME_MAX)
        if (name) update.display_name = name
      }

      const { error: upErr } = await supabase
        .from('event_seats')
        .update(update)
        .eq('id', seat.id)
      if (upErr) throw new Error(upErr.message)

      return json({
        ok: true,
        options_complete: complete,
        display_name: update.display_name || seat.display_name,
      })
    }

    throw new Error('Unknown action')
  } catch (err) {
    console.error('event-seat-info error:', err)
    return json({ error: (err as Error).message || 'Request failed' }, 400)
  }
})
