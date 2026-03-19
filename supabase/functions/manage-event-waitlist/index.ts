// Supabase Edge Function: manage-event-waitlist
// Handles: offering spots to next waitlisted user, expiring offers, auto-advance
// Called by: cron job or manually when a spot opens

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body = await req.json()
    const { action, event_id } = body
    // action: 'offer_next' | 'expire_offers' | 'advance_all'

    if (!action) throw new Error('action is required')

    // ─── Expire Stale Offers ───────────────────────────────
    if (action === 'expire_offers' || action === 'advance_all') {
      // Find all offers that have expired
      const now = new Date().toISOString()
      const query = supabase
        .from('event_waitlist')
        .select('*')
        .eq('status', 'offered')
        .lt('offer_expires_at', now)

      if (event_id) query.eq('event_id', event_id)

      const { data: expiredOffers } = await query
      const expired = expiredOffers || []

      for (const offer of expired) {
        // Mark as expired
        await supabase
          .from('event_waitlist')
          .update({ status: 'expired' })
          .eq('id', offer.id)

        // Auto-offer to next person in same event
        await offerNextSpot(supabase, offer.event_id)
      }

      if (action === 'expire_offers') {
        return new Response(
          JSON.stringify({ success: true, expired_count: expired.length }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // ─── Offer Next Spot ───────────────────────────────────
    if (action === 'offer_next') {
      if (!event_id) throw new Error('event_id required for offer_next')
      const result = await offerNextSpot(supabase, event_id)
      return new Response(
        JSON.stringify({ success: true, ...result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ─── Advance All Events ────────────────────────────────
    if (action === 'advance_all') {
      // Find all active events with waitlists that have capacity
      const { data: events } = await supabase
        .from('events')
        .select('id, max_participants')
        .in('status', ['open', 'confirmed', 'active'])
        .not('max_participants', 'is', null)

      let advanced = 0
      for (const evt of events || []) {
        // Count current going RSVPs
        const { count: goingCount } = await supabase
          .from('event_rsvps')
          .select('id', { count: 'exact', head: true })
          .eq('event_id', evt.id)
          .eq('status', 'going')

        // Check if there's capacity
        if ((goingCount || 0) < evt.max_participants) {
          // Check if there's anyone waiting (not already offered)
          const { data: hasWaiting } = await supabase
            .from('event_waitlist')
            .select('id')
            .eq('event_id', evt.id)
            .eq('status', 'waiting')
            .limit(1)

          if (hasWaiting && hasWaiting.length > 0) {
            await offerNextSpot(supabase, evt.id)
            advanced++
          }
        }
      }

      return new Response(
        JSON.stringify({ success: true, advanced_count: advanced }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    throw new Error(`Unknown action: ${action}`)

  } catch (err: any) {
    console.error('manage-event-waitlist error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// ─── Helper: Offer spot to next waitlisted user ──────────

async function offerNextSpot(supabase: any, eventId: string) {
  // Check if there's already an active offer
  const { data: activeOffer } = await supabase
    .from('event_waitlist')
    .select('id')
    .eq('event_id', eventId)
    .eq('status', 'offered')
    .gt('offer_expires_at', new Date().toISOString())
    .limit(1)

  if (activeOffer && activeOffer.length > 0) {
    return { offered: false, reason: 'active_offer_exists' }
  }

  // Find next waiting person by position
  const { data: next } = await supabase
    .from('event_waitlist')
    .select('*')
    .eq('event_id', eventId)
    .eq('status', 'waiting')
    .order('position', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!next) {
    return { offered: false, reason: 'no_one_waiting' }
  }

  // Set 24-hour offer window
  const offerExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  await supabase
    .from('event_waitlist')
    .update({
      status: 'offered',
      offered_at: new Date().toISOString(),
      offer_expires_at: offerExpires,
    })
    .eq('id', next.id)

  // Send push notification
  try {
    const { data: event } = await supabase
      .from('events')
      .select('title')
      .eq('id', eventId)
      .single()

    // Get user's push subscriptions
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', next.user_id)

    if (subs && subs.length > 0) {
      // Trigger push notification via edge function
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push-notification`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: next.user_id,
          title: '🎉 A spot opened up!',
          body: `A spot is available for "${event?.title}". Claim it within 24 hours!`,
          url: `/portal/events.html`,
        }),
      })
    }
  } catch (pushErr) {
    console.error('Failed to send waitlist notification:', pushErr)
    // Non-fatal — continue
  }

  return { offered: true, user_id: next.user_id, expires_at: offerExpires }
}
