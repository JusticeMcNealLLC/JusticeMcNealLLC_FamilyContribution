// ─── Edge Function: send-event-reminders ────────────────────────────
// Cron-triggered function that sends push notifications for upcoming events.
// Windows: 7 days, 3 days (72h), and day-of (morning of event).
// Respects user notification_preferences.event_reminders toggle.
// ─────────────────────────────────────────────────────────────────────

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
    const now = new Date()

    // Define reminder windows (in hours from now)
    const windows = [
      { label: '7 days', hoursMin: 167, hoursMax: 169 },   // ~7 days ± 1 hour
      { label: '3 days', hoursMin: 71, hoursMax: 73 },      // ~72 hours ± 1 hour
      { label: 'today', hoursMin: 0, hoursMax: 12 },        // day-of (within 12 hours)
    ]

    let totalSent = 0

    for (const win of windows) {
      const start = new Date(now.getTime() + win.hoursMin * 60 * 60 * 1000)
      const end = new Date(now.getTime() + win.hoursMax * 60 * 60 * 1000)

      // Find events starting within this window
      const { data: events, error: evtErr } = await supabase
        .from('events')
        .select('id, title, slug, start_date, status')
        .gte('start_date', start.toISOString())
        .lte('start_date', end.toISOString())
        .in('status', ['open', 'confirmed', 'active'])

      if (evtErr) {
        console.error(`Error fetching events for ${win.label}:`, evtErr)
        continue
      }

      if (!events?.length) continue

      for (const event of events) {
        // Get member RSVPs (going)
        const { data: rsvps } = await supabase
          .from('event_rsvps')
          .select('user_id')
          .eq('event_id', event.id)
          .eq('status', 'going')

        const userIds = (rsvps || []).map(r => r.user_id).filter(Boolean)
        if (!userIds.length) continue

        // Check notification preferences — only send to users with event_reminders enabled
        const { data: prefs } = await supabase
          .from('notification_preferences')
          .select('user_id')
          .in('user_id', userIds)
          .eq('event_reminders', false)

        const optedOutIds = new Set((prefs || []).map(p => p.user_id))

        // Users who have NOT opted out (including those without a prefs row, since default is TRUE)
        const eligibleUserIds = userIds.filter(uid => !optedOutIds.has(uid))

        // Build message
        const eventDate = new Date(event.start_date)
        const dateStr = eventDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
        const timeStr = eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

        let message = ''
        if (win.label === '7 days') {
          message = `"${event.title}" is in 1 week — ${dateStr} at ${timeStr}`
        } else if (win.label === '3 days') {
          message = `"${event.title}" is in 3 days — ${dateStr} at ${timeStr}`
        } else {
          message = `"${event.title}" is today at ${timeStr} — don't forget!`
        }

        // Send push notification to each eligible user via the push function
        for (const userId of eligibleUserIds) {
          try {
            // Call the send-push-notification function internally
            const pushResponse = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({
                user_id: userId,
                type: 'event',
                message,
                link: `/events/?e=${event.slug}`,
              }),
            })

            if (pushResponse.ok) totalSent++
          } catch (pushErr) {
            console.error(`Push failed for user ${userId}:`, pushErr)
          }
        }

        // Also insert notification records for in-app display
        const notifRecords = eligibleUserIds.map(uid => ({
          user_id: uid,
          type: 'event',
          message,
          link: `/events/?e=${event.slug}`,
          read: false,
        }))

        if (notifRecords.length) {
          const { error: notifErr } = await supabase
            .from('notifications')
            .insert(notifRecords)

          if (notifErr) {
            console.error(`Error inserting reminder notifications for event ${event.id}:`, notifErr)
          }
        }

        console.log(`Reminder (${win.label}): "${event.title}" → ${eligibleUserIds.length} users`)
      }
    }

    // ── RSVP Deadline Reminders ─────────────────────────
    // Check for events with RSVP deadline within 24 hours
    const deadlineStart = now
    const deadlineEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    const { data: deadlineEvents } = await supabase
      .from('events')
      .select('id, title, slug, rsvp_deadline, status')
      .not('rsvp_deadline', 'is', null)
      .gte('rsvp_deadline', deadlineStart.toISOString())
      .lte('rsvp_deadline', deadlineEnd.toISOString())
      .in('status', ['open', 'confirmed'])

    if (deadlineEvents?.length) {
      for (const event of deadlineEvents) {
        // Find users who have NOT yet RSVPed
        const { data: allMembers } = await supabase
          .from('profiles')
          .select('id')
          .eq('status', 'approved')

        const { data: alreadyRsvped } = await supabase
          .from('event_rsvps')
          .select('user_id')
          .eq('event_id', event.id)

        const rsvpedIds = new Set((alreadyRsvped || []).map(r => r.user_id))
        const nonRsvpUsers = (allMembers || []).filter(m => !rsvpedIds.has(m.id)).map(m => m.id)

        // Check notification preferences
        const { data: prefs } = await supabase
          .from('notification_preferences')
          .select('user_id')
          .in('user_id', nonRsvpUsers)
          .eq('event_rsvp_deadline', false)

        const optedOutIds = new Set((prefs || []).map(p => p.user_id))
        const eligibleIds = nonRsvpUsers.filter(uid => !optedOutIds.has(uid))

        if (!eligibleIds.length) continue

        const deadlineDate = new Date(event.rsvp_deadline)
        const deadlineStr = deadlineDate.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
        const message = `RSVP deadline for "${event.title}" is ${deadlineStr} — don't miss out!`

        for (const userId of eligibleIds) {
          try {
            await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({
                user_id: userId,
                type: 'event',
                message,
                link: `/events/?e=${event.slug}`,
              }),
            })
            totalSent++
          } catch (_) {}
        }

        // In-app notifications
        const notifRecords = eligibleIds.map(uid => ({
          user_id: uid,
          type: 'event',
          message,
          link: `/events/?e=${event.slug}`,
          read: false,
        }))

        if (notifRecords.length) {
          await supabase.from('notifications').insert(notifRecords)
        }

        console.log(`RSVP deadline reminder: "${event.title}" → ${eligibleIds.length} users`)
      }
    }

    return new Response(
      JSON.stringify({ ok: true, sent: totalSent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (err) {
    console.error('Event reminders error:', err)
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
