// Supabase Edge Function: event-og
// Provides rich Open Graph meta tags for event link previews (iMessage, Facebook, etc).
//
// How it works:
//   - Crawlers (iMessage, Facebook, Twitter, etc.) → 200 HTML with OG meta tags
//   - Real browsers → instant 302 redirect to the actual event page
//
// Supabase sandboxes HTML responses with strict CSP (default-src 'none'),
// which blocks JS, meta-refresh, images, and styles. So we can't serve an
// HTML page that redirects — we must use HTTP 302 for real users instead.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
const SITE_URL = 'https://justicemcneal.com'

// Known social/link-preview crawler User-Agent substrings
const CRAWLER_PATTERNS = [
  'facebookexternalhit', 'Facebot',
  'Twitterbot',
  'LinkedInBot',
  'Slackbot', 'Slack-ImgProxy',
  'Discordbot',
  'WhatsApp',
  'Applebot',           // Apple search / Siri
  'Googlebot',
  'bingbot',
  'TelegramBot',
  'Pinterestbot',
  'Redditbot',
  'vkShare',
  'Embedly',
  'Quora Link Preview',
  'Showyoubot',
  'outbrain',
  'Swiftbot',
  'SkypeUriPreview',
  'iMessageBot',
  'YandexBot',
]

function isCrawler(userAgent: string): boolean {
  if (!userAgent) return false
  const ua = userAgent.toLowerCase()
  return CRAWLER_PATTERNS.some(p => ua.includes(p.toLowerCase()))
}

serve(async (req) => {
  try {
    const url = new URL(req.url)
    const slug = url.searchParams.get('e')
    const ref = url.searchParams.get('ref') || ''
    const userAgent = req.headers.get('user-agent') || ''

    // Build canonical URL to the real event page
    const canonicalParams = new URLSearchParams()
    if (slug) canonicalParams.set('e', slug)
    if (ref) canonicalParams.set('ref', ref)
    const canonicalUrl = slug
      ? `${SITE_URL}/events/?${canonicalParams.toString()}`
      : `${SITE_URL}/portal/events.html`

    if (!slug) {
      return new Response(null, {
        status: 302,
        headers: { Location: canonicalUrl },
      })
    }

    // ── Real browsers: skip DB lookup, just redirect ──
    if (!isCrawler(userAgent)) {
      return new Response(null, {
        status: 302,
        headers: { Location: canonicalUrl },
      })
    }

    // ── Crawlers: fetch event, return OG HTML ──
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: event } = await supabase
      .from('events')
      .select('title, description, banner_url, start_date, end_date, location_text, event_type, category, slug, status')
      .eq('slug', slug)
      .maybeSingle()

    if (!event) {
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

    // Build OG description: date + location + snippet
    const rawDesc = event.description || ''
    const descSnippet = rawDesc.length > 200 ? rawDesc.slice(0, 197) + '...' : rawDesc
    const parts: string[] = [`${dateStr} at ${timeStr}`]
    if (event.location_text) parts.push(event.location_text)
    if (descSnippet) parts.push(descSnippet)
    const ogDescription = parts.join(' - ')

    // Fallback banner
    const ogImage = event.banner_url || `${SITE_URL}/assets/icons/icon-512x512.png`

    // Escape HTML entities
    const esc = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

    // Minimal HTML — only needs to be parsed, never rendered in a browser
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${esc(event.title)} | Justice McNeal LLC</title>
<meta property="og:type" content="website">
<meta property="og:site_name" content="Justice McNeal LLC">
<meta property="og:title" content="${esc(event.title)}">
<meta property="og:description" content="${esc(ogDescription)}">
<meta property="og:image" content="${esc(ogImage)}">
<meta property="og:url" content="${esc(canonicalUrl)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(event.title)}">
<meta name="twitter:description" content="${esc(ogDescription)}">
<meta name="twitter:image" content="${esc(ogImage)}">
<meta name="description" content="${esc(ogDescription)}">
<link rel="canonical" href="${esc(canonicalUrl)}">
</head>
<body></body>
</html>`

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300, s-maxage=300',
      },
    })
  } catch (_err) {
    return new Response(null, {
      status: 302,
      headers: { Location: `${SITE_URL}/events/` },
    })
  }
})
