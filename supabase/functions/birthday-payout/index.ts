// Supabase Edge Function: birthday-payout
// Designed for daily cron invocation.
// Checks for members whose birthday is today, then creates payouts.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno&no-check'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

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

    // ── Check global + birthday toggles ────────────────────
    const { data: settings } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', ['payouts_enabled', 'birthday_payouts_enabled', 'birthday_payout_amount_cents'])

    const settingsMap: Record<string, any> = {}
    for (const s of settings || []) settingsMap[s.key] = s.value

    if (settingsMap.payouts_enabled !== true) {
      return jsonResponse({ skipped: true, reason: 'Payouts disabled globally' })
    }
    if (settingsMap.birthday_payouts_enabled !== true) {
      return jsonResponse({ skipped: true, reason: 'Birthday payouts disabled' })
    }

    const amountCents = typeof settingsMap.birthday_payout_amount_cents === 'number'
      ? settingsMap.birthday_payout_amount_cents
      : 1000

    // ── Find today's birthday members ──────────────────────
    const today = new Date()
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    // birthday column is DATE format YYYY-MM-DD. We match on month + day.
    // Use Postgres text extraction: to_char(birthday, 'MM-DD')
    const { data: birthdayMembers, error: memberErr } = await supabase
      .rpc('get_birthday_payout_candidates', { target_mmdd: `${mm}-${dd}` })

    // If the RPC doesn't exist yet, fall back to a manual filter
    let candidates = birthdayMembers
    if (memberErr) {
      console.log('RPC not found, using manual query:', memberErr.message)
      const { data: allEnrolled } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, birthday, stripe_connect_account_id, connect_onboarding_complete, payout_enrolled')
        .eq('payout_enrolled', true)
        .eq('connect_onboarding_complete', true)
        .not('stripe_connect_account_id', 'is', null)
        .not('birthday', 'is', null)

      candidates = (allEnrolled || []).filter(p => {
        if (!p.birthday) return false
        const parts = p.birthday.split('-')
        return parts[1] === mm && parts[2] === dd
      })
    }

    if (!candidates || candidates.length === 0) {
      return jsonResponse({ processed: 0, message: 'No birthdays today' })
    }

    // ── Check enrollment + avoid duplicate payouts ─────────
    const results: any[] = []

    for (const member of candidates) {
      try {
        // Check birthday enrollment
        const { data: enrollment } = await supabase
          .from('payout_enrollments')
          .select('enrolled')
          .eq('user_id', member.id)
          .eq('payout_type', 'birthday')
          .single()

        if (enrollment && !enrollment.enrolled) {
          results.push({ user_id: member.id, status: 'skipped', reason: 'opted_out' })
          continue
        }

        // Check if birthday payout already sent today
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
        const { data: existing } = await supabase
          .from('payouts')
          .select('id')
          .eq('user_id', member.id)
          .eq('payout_type', 'birthday')
          .gte('created_at', todayStart)
          .limit(1)

        if (existing && existing.length > 0) {
          results.push({ user_id: member.id, status: 'skipped', reason: 'already_sent' })
          continue
        }

        // Create Stripe Transfer
        const transfer = await stripe.transfers.create({
          amount: amountCents,
          currency: 'usd',
          destination: member.stripe_connect_account_id,
          description: `Happy Birthday, ${member.first_name}! 🎂`,
          metadata: {
            supabase_user_id: member.id,
            payout_type: 'birthday',
          },
        })

        // Record in payouts ledger
        await supabase.from('payouts').insert({
          user_id: member.id,
          amount_cents: amountCents,
          payout_type: 'birthday',
          reason: `Happy Birthday! 🎂`,
          status: 'completed',
          stripe_transfer_id: transfer.id,
          completed_at: new Date().toISOString(),
        })

        results.push({ user_id: member.id, status: 'completed', transfer_id: transfer.id })
      } catch (err) {
        console.error(`Failed payout for ${member.id}:`, err)

        // Record failed payout
        await supabase.from('payouts').insert({
          user_id: member.id,
          amount_cents: amountCents,
          payout_type: 'birthday',
          reason: 'Happy Birthday! 🎂',
          status: 'failed',
          error_message: err.message,
        })

        results.push({ user_id: member.id, status: 'failed', error: err.message })
      }
    }

    return jsonResponse({ processed: results.length, results })
  } catch (error) {
    console.error('Birthday payout cron error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

function jsonResponse(data: any) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  })
}
