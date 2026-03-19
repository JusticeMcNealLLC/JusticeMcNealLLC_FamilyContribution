// ─── Edge Function: geocode-address ─────────────────────────────────
// Server-side proxy for the US Census Bureau Geocoder.
// The Census API doesn't send CORS headers, so browsers can't call it
// directly. This function makes the request server-side and returns
// the result with proper CORS headers.
// ─────────────────────────────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const url = new URL(req.url)
        const address = url.searchParams.get('address')

        if (!address) {
            return new Response(
                JSON.stringify({ error: 'Missing "address" query parameter' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Call US Census Bureau Geocoder (server-side — no CORS issue)
        const censusUrl = `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${encodeURIComponent(address)}&benchmark=Public_AR_Current&format=json`

        const censusResp = await fetch(censusUrl)

        if (!censusResp.ok) {
            return new Response(
                JSON.stringify({ error: 'Census geocoder returned error', status: censusResp.status }),
                { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const data = await censusResp.json()
        const matches = data?.result?.addressMatches

        if (matches && matches.length > 0) {
            const m = matches[0]
            return new Response(
                JSON.stringify({
                    found: true,
                    lat: m.coordinates.y,
                    lng: m.coordinates.x,
                    display: m.matchedAddress,
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // No matches
        return new Response(
            JSON.stringify({ found: false }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (err) {
        return new Response(
            JSON.stringify({ error: err.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
