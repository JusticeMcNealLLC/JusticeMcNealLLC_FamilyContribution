// Supabase Edge Function: event-og
// Returns an HTML page with proper Open Graph meta tags for event link previews.
// Social crawlers (iMessage, Facebook, Twitter, etc.) don't execute JavaScript,
// so the static GitHub Pages site can't set OG tags dynamically.
// This function fetches event data and returns a lightweight HTML page with
// correct OG tags + an instant redirect to the real event page for real users.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
const SITE_URL = 'https://justicemcneal.com'

serve(async (req) => {
  try {
    const url = new URL(req.url)
    const slug = url.searchParams.get('e')
    const ref = url.searchParams.get('ref') || ''

    if (!slug) {
      // No slug — redirect to main events page
      return new Response(null, {
        status: 302,
        headers: { Location: `${SITE_URL}/portal/events.html` },
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: event } = await supabase
      .from('events')
      .select('title, description, banner_url, start_date, end_date, location_text, event_type, category, slug, status')
      .eq('slug', slug)
      .maybeSingle()

    // Build canonical URL to the real event page
    const canonicalParams = new URLSearchParams()
    canonicalParams.set('e', slug)
    if (ref) canonicalParams.set('ref', ref)
    const canonicalUrl = `${SITE_URL}/events/?${canonicalParams.toString()}`

    if (!event) {
      // Event not found — redirect to event page (it will show its own error)
      return new Response(null, {
        status: 302,
        headers: { Location: canonicalUrl },
      })
    }

    // Format date for display
    const startDate = new Date(event.start_date)
    const dateStr = startDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
    const timeStr = startDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })

    // Build description
    const rawDesc = event.description || ''
    const descSnippet = rawDesc.length > 200 ? rawDesc.slice(0, 197) + '...' : rawDesc
    const ogDescription = event.location_text
      ? `${dateStr} at ${timeStr} · ${event.location_text}${descSnippet ? ' — ' + descSnippet : ''}`
      : `${dateStr} at ${timeStr}${descSnippet ? ' — ' + descSnippet : ''}`

    // Fallback banner
    const ogImage = event.banner_url || `${SITE_URL}/assets/icons/icon-512x512.png`

    // Escape HTML
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${esc(event.title)} | Justice McNeal LLC</title>

  <!-- Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Justice McNeal LLC">
  <meta property="og:title" content="${esc(event.title)}">
  <meta property="og:description" content="${esc(ogDescription)}">
  <meta property="og:image" content="${esc(ogImage)}">
  <meta property="og:url" content="${esc(canonicalUrl)}">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(event.title)}">
  <meta name="twitter:description" content="${esc(ogDescription)}">
  <meta name="twitter:image" content="${esc(ogImage)}">

  <!-- iMessage / Apple -->
  <meta name="apple-mobile-web-app-title" content="${esc(event.title)}">

  <!-- Instant redirect for real users (crawlers ignore JS + respect noindex) -->
  <meta name="robots" content="noindex">
  <meta http-equiv="refresh" content="0;url=${esc(canonicalUrl)}">
  <link rel="canonical" href="${esc(canonicalUrl)}">
</head>
<body style="font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8fafc">
  <div style="text-align:center;padding:24px">
    <p style="font-size:18px;font-weight:600;color:#222">${esc(event.title)}</p>
    <p style="font-size:14px;color:#717171;margin-top:8px">${esc(dateStr)}</p>
    <p style="font-size:14px;color:#717171;margin-top:16px">Redirecting…</p>
    <p style="margin-top:12px"><a href="${esc(canonicalUrl)}" style="color:#4f46e5;font-weight:600">Open Event</a></p>
  </div>
  <script>window.location.replace(${JSON.stringify(canonicalUrl)})</script>
</body>
</html>`

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300, s-maxage=300',
      },
    })
  } catch (err) {
    // On any error, redirect to the events page
    return new Response(null, {
      status: 302,
      headers: { Location: `${SITE_URL}/events/` },
    })
  }
})
