// Supabase Edge Function: raffle-guest-free
// Handles free raffle entry for non-member guests (no Stripe needed)
// Creates guest_rsvp record (if needed) for guest_token, then inserts raffle entry

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

    const { event_id, guest_name, guest_email } = await req.json()

    if (!event_id) throw new Error('event_id is required')
    if (!guest_name || !guest_name.trim()) throw new Error('guest_name is required')
    if (!guest_email || !guest_email.trim()) throw new Error('guest_email is required')

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guest_email.trim())) {
      throw new Error('Invalid email address')
    }

    // Fetch event
    const { data: event, error: evtErr } = await supabase
      .from('events')
      .select('*')
      .eq('id', event_id)
      .single()

    if (evtErr || !event) throw new Error('Event not found')

    // Validate event status
    if (!['open', 'confirmed', 'active'].includes(event.status)) {
      throw new Error('This event is not accepting entries')
    }

    // Must have raffle enabled
    if (!event.raffle_enabled) {
      throw new Error('This event does not have a raffle')
    }

    // Must not be a paid event (raffle is included with paid RSVP)
    if (event.pricing_mode === 'paid') {
      throw new Error('Raffle entry is included with paid RSVP')
    }

    // Must be a free raffle (if entry cost > 0, use checkout flow)
    if (event.raffle_entry_cost_cents && event.raffle_entry_cost_cents > 0) {
      throw new Error('This is a paid raffle — use the checkout flow instead')
    }

    // Must not be member-only
    if (event.member_only) {
      throw new Error('This is a members-only raffle. Please sign in to enter.')
    }

    // Check raffle deadline
    if (event.raffle_entry_deadline && new Date(event.raffle_entry_deadline) < new Date()) {
      throw new Error('Raffle entry deadline has passed')
    }

    const emailLower = guest_email.trim().toLowerCase()
    const nameTrimmed = guest_name.trim()

    // Get or create guest_rsvp record for guest_token
    let guestToken: string

    const { data: existingGuest } = await supabase
      .from('event_guest_rsvps')
      .select('guest_token')
      .eq('event_id', event_id)
      .eq('guest_email', emailLower)
      .maybeSingle()

    if (existingGuest) {
      guestToken = existingGuest.guest_token
    } else {
      guestToken = crypto.randomUUID()
      const { error: guestErr } = await supabase
        .from('event_guest_rsvps')
        .insert({
          event_id,
          guest_name: nameTrimmed,
          guest_email: emailLower,
          guest_token: guestToken,
          status: 'going',
          paid: false,
          amount_paid_cents: 0,
        })
      if (guestErr) {
        console.error('Guest RSVP insert error:', guestErr)
        throw new Error('Failed to register guest. Please try again.')
      }
    }

    // Check for existing raffle entry
    const { data: existingEntry } = await supabase
      .from('event_raffle_entries')
      .select('id')
      .eq('event_id', event_id)
      .eq('guest_token', guestToken)
      .maybeSingle()

    if (existingEntry) {
      return new Response(JSON.stringify({
        guest_token: guestToken,
        already_exists: true,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create raffle entry
    const { error: entryErr } = await supabase
      .from('event_raffle_entries')
      .insert({
        event_id,
        user_id: null,
        guest_token: guestToken,
        paid: true,    // "paid" = entry is valid/confirmed (free = auto-confirmed)
        amount_paid_cents: 0,
      })

    if (entryErr) {
      console.error('Raffle entry insert error:', entryErr)
      throw new Error('Failed to enter raffle. Please try again.')
    }

    return new Response(JSON.stringify({
      guest_token: guestToken,
      already_exists: false,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('raffle-guest-free error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
