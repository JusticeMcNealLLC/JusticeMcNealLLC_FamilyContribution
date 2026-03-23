// Supabase Edge Function: event-og
// Generates rich Open Graph link previews for shared event links.
//
// Problem: Supabase converts text/html responses to text/plain + sandbox CSP.
// Discovery: text/xml passes through Supabase UNSANDBOXED.
// Solution: Serve valid XHTML as text/xml. Crawlers parse OG meta tags from it.
//           Browsers get JS redirect to the real event page.

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

    // Build canonical URL
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

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch event data
    const { data: event } = await supabase
      .from('events')
      .select('title, description, banner_url, start_date, end_date, location_text, slug')
      .eq('slug', slug)
      .maybeSingle()

    if (!event) {
      return new Response(null, {
        status: 302,
        headers: { Location: canonicalUrl },
      })
    }

    // Look up inviter name from ref
    let inviterName = ''
    if (ref && !ref.startsWith('g_')) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('first_name')
        .ilike('id', `${ref}%`)
        .limit(1)

      if (profiles && profiles.length > 0 && profiles[0].first_name) {
        inviterName = profiles[0].first_name
      }
    }

    // Format date
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

    // Build OG fields
    const ogTitle = inviterName
      ? `${inviterName} invited you to ${event.title}`
      : `You're invited to ${event.title}!`

    const descParts: string[] = [`${dateStr} at ${timeStr}`]
    if (event.location_text) descParts.push(event.location_text)
    const rawDesc = event.description || ''
    if (rawDesc) descParts.push(rawDesc.length > 150 ? rawDesc.slice(0, 147) + '...' : rawDesc)
    const ogDescription = descParts.join(' \u2014 ')

    const ogImage = event.banner_url || `${SITE_URL}/assets/icons/icon-512.png`

    // XML-safe escape
    const esc = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')

    // Valid XHTML served as text/xml — Supabase passes this through unsandboxed.
    // Crawlers (iMessage, Facebook, Twitter) parse OG meta from it.
    // Browsers render it as XML/XHTML and execute the JS redirect.
    const xhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">
<head>
<title>${esc(ogTitle)} | Justice McNeal LLC</title>
<meta name="description" content="${esc(ogDescription)}" />
<meta property="og:title" content="${esc(ogTitle)}" />
<meta property="og:description" content="${esc(ogDescription)}" />
<meta property="og:image" content="${esc(ogImage)}" />
<meta property="og:url" content="${esc(canonicalUrl)}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Justice McNeal LLC" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(ogTitle)}" />
<meta name="twitter:description" content="${esc(ogDescription)}" />
<meta name="twitter:image" content="${esc(ogImage)}" />
<script type="text/javascript"><![CDATA[
window.location.replace("${canonicalUrl.replace(/"/g, '\\"')}");
]]></script>
</head>
<body>
<p>Redirecting to <a href="${esc(canonicalUrl)}">event page</a>...</p>
</body>
</html>`

    return new Response(xhtml, {
      status: 200,
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=300, s-maxage=300',
      },
    })
  } catch (_err) {
    const slug = new URL(req.url).searchParams.get('e')
    return new Response(null, {
      status: 302,
      headers: { Location: slug ? `${SITE_URL}/events/?e=${slug}` : `${SITE_URL}/events/` },
    })
  }
})
