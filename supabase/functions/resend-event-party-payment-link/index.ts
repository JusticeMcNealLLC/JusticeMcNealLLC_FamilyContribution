// Supabase Edge Function: resend-event-party-payment-link
// §13.11 — Resend payment magic-link SMS (host or payer invite_token)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { notifyPartyPaymentLink } from '../_shared/event-payment-sms.ts'
import { userCanManageEventNotifications } from '../_shared/sms.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') as string

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body = await req.json().catch(() => ({}))
    const inviteToken = String(body.invite_token || '').trim()
    const partyIdBody = String(body.party_id || '').trim()

    let partyId: string | null = null

    if (inviteToken) {
      const { data, error } = await supabase
        .from('event_parties')
        .select('id')
        .eq('invite_token', inviteToken)
        .maybeSingle()
      if (error) throw new Error(error.message)
      if (!data?.id) throw new Error('invalid_token')
      partyId = String(data.id)
    } else {
      const authHeader = req.headers.get('Authorization') || ''
      if (!authHeader) throw new Error('Authorization or invite_token required')
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      })
      const { data: userData, error: userErr } = await userClient.auth.getUser()
      if (userErr || !userData?.user) throw new Error('Not signed in')

      if (!partyIdBody) throw new Error('party_id required')
      const { data: party, error: partyErr } = await supabase
        .from('event_parties')
        .select('id, event_id')
        .eq('id', partyIdBody)
        .maybeSingle()
      if (partyErr) throw new Error(partyErr.message)
      if (!party?.id) throw new Error('Payment party not found')

      const canManage = await userCanManageEventNotifications(
        supabase,
        userData.user.id,
        String(party.event_id),
      )
      if (!canManage) throw new Error('Not authorized')
      partyId = String(party.id)
    }

    const origin = req.headers.get('origin') || Deno.env.get('PUBLIC_SITE_ORIGIN') || 'https://justicemcneal.com'
    const result = await notifyPartyPaymentLink(supabase, {
      partyId: partyId!,
      origin,
      force: true,
    })

    if (result.reason === 'rate_limited') {
      return json({ error: 'Please wait a minute before resending.', ...result }, 429)
    }
    if (!result.ok && !result.skipped) {
      return json({ error: result.reason || 'Send failed', ...result }, 400)
    }

    return json({
      ok: true,
      skipped: !!result.skipped,
      reason: result.reason || null,
      dry_run: !!result.dry_run,
      phone_masked: result.phone_masked || null,
      payments_url: result.payments_url || null,
    })
  } catch (error) {
    console.error('resend-event-party-payment-link error:', error)
    return json({ error: (error as Error).message || 'Resend failed' }, 400)
  }
})
