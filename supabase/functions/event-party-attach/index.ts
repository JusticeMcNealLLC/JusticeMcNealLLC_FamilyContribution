// Supabase Edge Function: event-party-attach
// Flow E — list pending guests + attach to member payer party

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  attachPendingGuestToMemberParty,
  listPendingAttachGuests,
} from '../_shared/party-seats.ts'

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization') || ''
    if (!authHeader) throw new Error('Authorization required')

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: userErr } = await userClient.auth.getUser()
    if (userErr || !userData?.user) throw new Error('Not signed in')
    const user = userData.user

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body = await req.json().catch(() => ({}))
    const action = String(body.action || '').trim()
    const eventId = String(body.event_id || '').trim()
    if (!eventId) throw new Error('event_id is required')
    if (!action) throw new Error('action is required')

    const { data: event, error: evtErr } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()
    if (evtErr || !event) throw new Error('Event not found')

    if (action === 'list_pending') {
      const pending = await listPendingAttachGuests(supabase, eventId)
      // Deduplicate by guest_rsvp_id for UI (one row per guest; seats aggregated)
      const byGuest = new Map<string, {
        guest_rsvp_id: string
        pending_party_id: string
        display_name: string
        role: string
        options_complete: boolean
        guest_email: string | null
        seat_count: number
      }>()
      for (const row of pending) {
        const prev = byGuest.get(row.guest_rsvp_id)
        if (!prev) {
          byGuest.set(row.guest_rsvp_id, {
            guest_rsvp_id: row.guest_rsvp_id,
            pending_party_id: row.pending_party_id,
            display_name: row.display_name,
            role: row.role,
            options_complete: row.options_complete,
            guest_email: row.guest_email,
            seat_count: 1,
          })
        } else {
          prev.seat_count += 1
          prev.options_complete = prev.options_complete && row.options_complete
        }
      }
      return json({ pending_guests: Array.from(byGuest.values()) })
    }

    if (action === 'attach') {
      const guestRsvpId = body.guest_rsvp_id ? String(body.guest_rsvp_id).trim() : ''
      const pendingPartyId = body.pending_party_id ? String(body.pending_party_id).trim() : ''
      if (!guestRsvpId && !pendingPartyId) {
        throw new Error('guest_rsvp_id or pending_party_id is required')
      }

      let { data: memberRsvp } = await supabase
        .from('event_rsvps')
        .select('id, status, paid, party_id')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (!memberRsvp?.id) {
        const { data: created, error: createErr } = await supabase
          .from('event_rsvps')
          .upsert(
            { event_id: eventId, user_id: user.id, status: 'going', paid: false },
            { onConflict: 'event_id,user_id' },
          )
          .select('id, status, paid, party_id')
          .single()
        if (createErr) throw new Error(createErr.message)
        memberRsvp = created
      }

      if (memberRsvp.status !== 'going' && !memberRsvp.paid) {
        await supabase
          .from('event_rsvps')
          .update({ status: 'going' })
          .eq('id', memberRsvp.id)
        memberRsvp.status = 'going'
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .maybeSingle()
      const payerName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim()
        || (user.email || '').split('@')[0]
        || 'Member'

      const result = await attachPendingGuestToMemberParty({
        supabase,
        event,
        eventId,
        memberUserId: user.id,
        memberRsvpId: memberRsvp.id,
        memberPaid: !!memberRsvp.paid,
        guestRsvpId: guestRsvpId || null,
        pendingPartyId: pendingPartyId || null,
        payerDisplayName: payerName,
      })

      return json({
        ok: true,
        party_id: result.party_id,
        party_total_cents: result.party_total_cents,
        seats: result.seats,
      })
    }

    throw new Error(`Unknown action: ${action}`)
  } catch (err) {
    console.error('event-party-attach error:', err)
    return json({ error: (err as Error).message || 'Attach failed' }, 400)
  }
})
