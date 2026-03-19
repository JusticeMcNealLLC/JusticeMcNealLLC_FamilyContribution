// Supabase Edge Function: rsvp-guest-free
// Handles free RSVP for non-member guests (no Stripe needed)
// Collects name + email, creates guest RSVP record + guest_token

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

    // Basic email validation
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
      throw new Error('This event is not accepting RSVPs')
    }

    // Must be a free event (or free_paid_raffle where RSVP is free)
    if (event.pricing_mode === 'paid' && event.rsvp_cost_cents > 0) {
      throw new Error('This is a paid event — use the checkout flow instead')
    }

    // Must not be member-only
    if (event.member_only) {
      throw new Error('This is a members-only event. Please sign in to RSVP.')
    }

    // Check RSVP deadline
    if (event.rsvp_deadline && new Date(event.rsvp_deadline) < new Date()) {
      throw new Error('RSVP deadline has passed')
    }

    const emailLower = guest_email.trim().toLowerCase()

    // Check for existing guest RSVP
    const { data: existingGuest } = await supabase
      .from('event_guest_rsvps')
      .select('id, guest_token, status')
      .eq('event_id', event_id)
      .eq('guest_email', emailLower)
      .maybeSingle()

    if (existingGuest) {
      // Already RSVP'd — return their existing token
      return new Response(JSON.stringify({
        guest_token: existingGuest.guest_token,
        status: existingGuest.status,
        already_exists: true,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check capacity
    if (event.max_participants) {
      const { count: memberCount } = await supabase
        .from('event_rsvps')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', event_id)
        .eq('status', 'going')

      const { count: guestCount } = await supabase
        .from('event_guest_rsvps')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', event_id)

      const totalGoing = (memberCount || 0) + (guestCount || 0)
      if (totalGoing >= event.max_participants) {
        throw new Error('This event is full')
      }
    }

    // Generate guest token
    const guestToken = crypto.randomUUID()

    // Create guest RSVP record
    const { data: guestRsvp, error: insertErr } = await supabase
      .from('event_guest_rsvps')
      .insert({
        event_id,
        guest_name: guest_name.trim(),
        guest_email: emailLower,
        guest_token: guestToken,
        status: 'going',
        paid: false,          // free event — no payment
        amount_paid_cents: 0,
      })
      .select()
      .single()

    if (insertErr) {
      console.error('Insert error:', insertErr)
      throw new Error('Failed to create RSVP. Please try again.')
    }

    return new Response(JSON.stringify({
      guest_token: guestToken,
      status: 'going',
      already_exists: false,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('rsvp-guest-free error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
