// ─── Edge Function: send-push-notification ──────────────────────────
// Called by DB trigger (pg_net) when a new notification is inserted.
// Looks up the user's push subscriptions and sends Web Push to each.
// Uses npm:web-push for reliable RFC 8291 encryption + VAPID signing.
// ─────────────────────────────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

// ─── VAPID Config ───────────────────────────────────────────────────
const VAPID_PUBLIC_KEY  = 'BKqi3z9_x6AakHy0napGUG8MIe-CTtEriDWv-hGzgvRW971O0GJgQuGbWIPyhVl_ElOxrQWsH-CCUJPf-BLY2i0'
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || 'yK4Rk8zMhECTIv12IQKS7U9xEK8hSOLDSwxgo3hlOQg'
const VAPID_SUBJECT     = 'mailto:admin@justicemcneal.com'

// Configure web-push
if (VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
}

// ─── Notification type → emoji ──────────────────────────────────────
const NOTIF_ICONS: Record<string, string> = {
    like: '❤️', comment: '💬', follow: '👤', mention: '📣',
    quest: '🎯', milestone: '🏆', badge: '🏅', deposit: '💰',
    payout: '💸', event: '📅', welcome: '👋', system: '🔔',
    reply: '↩️', comment_like: '💜',
}

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── Main handler ───────────────────────────────────────────────────
serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        if (!VAPID_PRIVATE_KEY) {
            console.error('VAPID_PRIVATE_KEY not set')
            return new Response(JSON.stringify({ error: 'VAPID key not configured' }), {
                status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        const body = await req.json()
        const { user_id, type, message, actor_name, link } = body

        if (!user_id) {
            return new Response(JSON.stringify({ error: 'user_id required' }), {
                status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // Create Supabase client with service role
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseKey)

        // Get all push subscriptions for this user
        const { data: subs, error: subsError } = await supabase
            .from('push_subscriptions')
            .select('id, endpoint, p256dh, auth_key')
            .eq('user_id', user_id)

        if (subsError) {
            console.error('Error fetching subscriptions:', subsError)
            return new Response(JSON.stringify({ error: 'DB error' }), {
                status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        if (!subs?.length) {
            return new Response(JSON.stringify({ sent: 0, reason: 'no_subscriptions' }), {
                status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // Build push payload
        const icon = NOTIF_ICONS[type] || '🔔'
        const title = actor_name ? `${icon} ${actor_name}` : `${icon} Justice McNeal Portal`
        const pushPayload = JSON.stringify({
            title,
            body: message || 'New notification',
            icon: '/assets/icons/icon-192.svg',
            badge: '/assets/icons/icon-192.svg',
            tag: `notif-${type}-${Date.now()}`,
            data: { url: link || '/portal/feed.html' },
        })

        // Send to all subscriptions in parallel
        const results = await Promise.allSettled(
            subs.map(async (sub) => {
                const pushSub = {
                    endpoint: sub.endpoint,
                    keys: { p256dh: sub.p256dh, auth: sub.auth_key }
                }
                try {
                    await webpush.sendNotification(pushSub, pushPayload, { TTL: 86400 })
                    return { success: true, id: sub.id }
                } catch (err: any) {
                    // 404 or 410 = subscription expired
                    if (err.statusCode === 404 || err.statusCode === 410) {
                        return { success: false, id: sub.id, expired: true }
                    }
                    console.error(`Push failed for ${sub.id}:`, err.message || err)
                    return { success: false, id: sub.id, error: err.message }
                }
            })
        )

        // Clean up expired subscriptions
        const expiredIds: string[] = []
        for (const result of results) {
            if (result.status === 'fulfilled' && result.value.expired) {
                expiredIds.push(result.value.id)
            }
        }
        if (expiredIds.length) {
            await supabase.from('push_subscriptions').delete().in('id', expiredIds)
            console.log(`Cleaned up ${expiredIds.length} expired subscriptions`)
        }

        const sent = results.filter(
            r => r.status === 'fulfilled' && r.value.success
        ).length

        console.log(`Push sent: ${sent}/${subs.length} for user ${user_id}`)

        return new Response(JSON.stringify({ sent, total: subs.length }), {
            status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

    } catch (e) {
        console.error('Push notification error:', e)
        return new Response(JSON.stringify({ error: (e as Error).message }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})
