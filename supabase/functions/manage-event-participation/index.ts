import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type CleanupAction = 'remove_rsvp' | 'remove_raffle_entry' | 'reset_participation'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Authorization required')

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) throw new Error('Unauthorized')

    const body = await req.json()
    const action = body.action as CleanupAction
    const eventId = String(body.event_id || '')
    if (!eventId) throw new Error('event_id is required')
    if (!['remove_rsvp', 'remove_raffle_entry', 'reset_participation'].includes(action)) {
      throw new Error('Unsupported participation cleanup action')
    }

    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, created_by')
      .eq('id', eventId)
      .single()
    if (eventError || !event) throw new Error('Event not found')

    const { data: hasEventPerm } = await supabase.rpc('user_has_permission', {
      uid: user.id,
      perm: 'events.manage_all',
    })

    const { data: hostCheck } = await supabase
      .from('event_hosts')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .maybeSingle()

    const isManager = !!hasEventPerm || event.created_by === user.id || !!hostCheck
    if (!isManager) throw new Error('Only event hosts or admins can manage participation')

    if (action === 'reset_participation') {
      await deleteByEvent(supabase, 'event_raffle_winners', eventId)
      await deleteByEvent(supabase, 'event_raffle_entries', eventId)
      await deleteByEvent(supabase, 'event_checkins', eventId)
      await deleteByEvent(supabase, 'event_guest_rsvps', eventId)
      await deleteByEvent(supabase, 'event_rsvps', eventId)
      return json({ ok: true, action })
    }

    if (action === 'remove_rsvp') {
      const kind = String(body.kind || '')
      if (kind === 'guest') {
        const guestToken = String(body.guest_token || '')
        const rsvpId = String(body.rsvp_id || '')
        if (!guestToken || !rsvpId) throw new Error('Missing guest RSVP details')
        await deleteByEventColumn(supabase, 'event_raffle_winners', eventId, 'guest_token', guestToken)
        await deleteByEventColumn(supabase, 'event_raffle_entries', eventId, 'guest_token', guestToken)
        await deleteByEventColumn(supabase, 'event_checkins', eventId, 'guest_token', guestToken)
        await deleteByIdAndEvent(supabase, 'event_guest_rsvps', eventId, rsvpId)
        return json({ ok: true, action, kind })
      }

      if (kind === 'member') {
        const userId = String(body.user_id || '')
        if (!userId) throw new Error('Missing member RSVP details')
        await deleteByEventColumn(supabase, 'event_raffle_winners', eventId, 'user_id', userId)
        await deleteByEventColumn(supabase, 'event_raffle_entries', eventId, 'user_id', userId)
        await deleteByEventColumn(supabase, 'event_checkins', eventId, 'user_id', userId)
        await deleteByEventColumn(supabase, 'event_rsvps', eventId, 'user_id', userId)
        return json({ ok: true, action, kind })
      }

      throw new Error('Unsupported RSVP kind')
    }

    const entryId = String(body.entry_id || '')
    if (!entryId) throw new Error('entry_id is required')

    const { data: entry, error: entryError } = await supabase
      .from('event_raffle_entries')
      .select('id, user_id, guest_token')
      .eq('id', entryId)
      .eq('event_id', eventId)
      .maybeSingle()
    if (entryError) throw entryError
    if (!entry) throw new Error('Raffle entry not found')

    if (entry.guest_token) {
      await deleteByEventColumn(supabase, 'event_raffle_winners', eventId, 'guest_token', entry.guest_token)
    }
    if (entry.user_id) {
      await deleteByEventColumn(supabase, 'event_raffle_winners', eventId, 'user_id', entry.user_id)
    }
    await deleteByIdAndEvent(supabase, 'event_raffle_entries', eventId, entryId)
    return json({ ok: true, action })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const status = message === 'Unauthorized' || message === 'Authorization required' ? 401 : 400
    return json({ error: message }, status)
  }
})

async function deleteByEvent(supabase: ReturnType<typeof createClient>, table: string, eventId: string) {
  const { error } = await supabase.from(table).delete().eq('event_id', eventId)
  if (error) throw error
}

async function deleteByEventColumn(supabase: ReturnType<typeof createClient>, table: string, eventId: string, column: string, value: string) {
  const { error } = await supabase.from(table).delete().eq('event_id', eventId).eq(column, value)
  if (error) throw error
}

async function deleteByIdAndEvent(supabase: ReturnType<typeof createClient>, table: string, eventId: string, id: string) {
  const { error } = await supabase.from(table).delete().eq('event_id', eventId).eq('id', id)
  if (error) throw error
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}