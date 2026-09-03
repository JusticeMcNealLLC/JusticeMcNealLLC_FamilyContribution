// Resolve event_parties by invite_token, guest_token, or JWT payer
// (§13.10 / §13.11 magic-link payments auth)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export type EventPartyAuthRow = {
  id: string
  event_id: string
  payer_user_id: string | null
  invite_token: string
  status: string
  payer_kind?: string | null
  payer_guest_rsvp_id?: string | null
}

const SELECT_COLS =
  'id, event_id, payer_user_id, invite_token, status, payer_kind, payer_guest_rsvp_id'

function assertPartyActive(data: EventPartyAuthRow | null): EventPartyAuthRow {
  if (!data?.id) throw new Error('invalid_token')
  if (String(data.status) === 'cancelled') throw new Error('party_cancelled')
  return data
}

/**
 * Resolve party for public payment edges.
 * Priority: invite_token → guest_token → JWT payer (+ optional party_id / plan_id / event_id / event_slug).
 */
export async function resolveEventPartyByInviteOrJwt(
  req: Request,
  body: {
    invite_token?: string
    guest_token?: string
    plan_id?: string
    party_id?: string
    event_id?: string
    event_slug?: string
  },
  opts?: { supabaseUrl?: string; serviceKey?: string; anonKey?: string },
): Promise<EventPartyAuthRow> {
  const supabaseUrl = opts?.supabaseUrl || (Deno.env.get('SUPABASE_URL') as string)
  const supabaseServiceKey = opts?.serviceKey || (Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string)
  const supabaseAnonKey = opts?.anonKey || (Deno.env.get('SUPABASE_ANON_KEY') as string)
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const inviteToken = String(body.invite_token || '').trim()
  const guestToken = String(body.guest_token || '').trim()
  const planIdBody = String(body.plan_id || '').trim()
  const partyIdBody = String(body.party_id || '').trim()
  let eventIdBody = String(body.event_id || '').trim()
  const eventSlug = String(body.event_slug || '').trim()

  if (inviteToken) {
    const { data, error } = await supabase
      .from('event_parties')
      .select(SELECT_COLS)
      .eq('invite_token', inviteToken)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return assertPartyActive(data as EventPartyAuthRow | null)
  }

  if (guestToken) {
    const { data: guestRsvp, error: guestErr } = await supabase
      .from('event_guest_rsvps')
      .select('id, event_id')
      .eq('guest_token', guestToken)
      .maybeSingle()
    if (guestErr) throw new Error(guestErr.message)
    if (!guestRsvp?.id) throw new Error('invalid_token')

    const { data: party, error: partyErr } = await supabase
      .from('event_parties')
      .select(SELECT_COLS)
      .eq('payer_guest_rsvp_id', guestRsvp.id)
      .neq('status', 'cancelled')
      .maybeSingle()
    if (partyErr) throw new Error(partyErr.message)
    return assertPartyActive(party as EventPartyAuthRow | null)
  }

  const authHeader = req.headers.get('Authorization') || ''
  if (!authHeader) {
    throw new Error('Authorization, invite_token, or guest_token required')
  }
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData, error: userErr } = await userClient.auth.getUser()
  if (userErr || !userData?.user) throw new Error('Not signed in')
  const authUserId = userData.user.id

  if (!eventIdBody && eventSlug) {
    const { data: evt, error: evtErr } = await supabase
      .from('events')
      .select('id')
      .eq('slug', eventSlug)
      .maybeSingle()
    if (evtErr) throw new Error(evtErr.message)
    if (evt?.id) eventIdBody = String(evt.id)
  }

  let q = supabase
    .from('event_parties')
    .select(SELECT_COLS)
    .eq('payer_user_id', authUserId)
    .neq('status', 'cancelled')

  if (partyIdBody) {
    q = q.eq('id', partyIdBody)
    const { data, error } = await q.maybeSingle()
    if (error) throw new Error(error.message)
    if (!data?.id) throw new Error('Not authorized for this party')
    return assertPartyActive(data as EventPartyAuthRow)
  }

  if (planIdBody) {
    const { data: planRow } = await supabase
      .from('event_payment_plans')
      .select('party_id')
      .eq('id', planIdBody)
      .maybeSingle()
    if (!planRow?.party_id) throw new Error('Payment plan not found')
    q = q.eq('id', planRow.party_id)
    const { data, error } = await q.maybeSingle()
    if (error) throw new Error(error.message)
    if (!data?.id) throw new Error('Not authorized for this party')
    return assertPartyActive(data as EventPartyAuthRow)
  }

  if (eventIdBody) {
    q = q.eq('event_id', eventIdBody)
  }

  const { data: parties, error: listErr } = await q
  if (listErr) throw new Error(listErr.message)
  const rows = (parties || []) as EventPartyAuthRow[]
  if (!rows.length) throw new Error('Not authorized for this party')

  // Prefer parties that have a payment plan
  const partyIds = rows.map((r) => r.id)
  const { data: plans, error: plansErr } = await supabase
    .from('event_payment_plans')
    .select('party_id')
    .in('party_id', partyIds)
  if (plansErr) throw new Error(plansErr.message)
  const withPlan = new Set((plans || []).map((p: { party_id: string }) => String(p.party_id)))
  const candidates = rows.filter((r) => withPlan.has(r.id))
  const pool = candidates.length ? candidates : rows

  if (pool.length === 1) {
    return assertPartyActive(pool[0])
  }

  throw new Error('party_id or event_id required')
}
