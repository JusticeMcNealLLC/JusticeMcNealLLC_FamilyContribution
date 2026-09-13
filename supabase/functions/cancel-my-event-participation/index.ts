// Member self-cancel for paid / installment RSVPs (no Stripe refunds)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { cancelPartyParticipation } from '../_shared/cancel-party-participation.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

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

    const body = await req.json().catch(() => ({}))
    const eventId = String(body.event_id || '').trim()
    if (!eventId) throw new Error('event_id is required')

    const { data: memberRow, error: rsvpErr } = await supabase
      .from('event_rsvps')
      .select('id, party_id, paid, status')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (rsvpErr) throw new Error(rsvpErr.message)
    if (!memberRow?.id) throw new Error('No RSVP found to cancel')

    const partyIds: string[] = []
    if (memberRow.party_id) partyIds.push(String(memberRow.party_id))

    const cancelResult = await cancelPartyParticipation(supabase, {
      eventId,
      partyIds,
      payerUserId: user.id,
    })

    await supabase.from('event_raffle_winners').delete().eq('event_id', eventId).eq('user_id', user.id)
    await supabase.from('event_raffle_entries').delete().eq('event_id', eventId).eq('user_id', user.id)
    await supabase.from('event_checkins').delete().eq('event_id', eventId).eq('user_id', user.id)
    const { error: delErr } = await supabase
      .from('event_rsvps')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', user.id)
    if (delErr) throw new Error(delErr.message)

    return json({
      ok: true,
      refunds: false,
      cancelled_party_ids: cancelResult.cancelledPartyIds,
      cancelled_plan_ids: cancelResult.cancelledPlanIds,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const status = message === 'Unauthorized' || message === 'Authorization required' ? 401 : 400
    return json({ error: message }, status)
  }
})
