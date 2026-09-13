// Supabase Edge Function: get-event-party-payments
// §13.10 / §13.11 — Public payments summary via party invite_token

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno&no-check'
import { resolveEventPartyByInviteOrJwt } from '../_shared/event-party-token.ts'

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

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function methodDisplayHints(paymentMethodId: string | null | undefined): Promise<{
  method_last4?: string
  method_brand?: string
}> {
  const pmId = String(paymentMethodId || '').trim()
  if (!pmId) return {}
  try {
    const pm = await stripe.paymentMethods.retrieve(pmId)
    if (pm.type === 'card' && pm.card) {
      return {
        method_last4: pm.card.last4 || undefined,
        method_brand: pm.card.brand || undefined,
      }
    }
    if (pm.type === 'us_bank_account' && pm.us_bank_account) {
      return {
        method_last4: pm.us_bank_account.last4 || undefined,
      }
    }
  } catch (err) {
    console.error('PM display hints retrieve failed (non-fatal):', (err as Error).message)
  }
  return {}
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const hasInvite = !!String(body.invite_token || '').trim()
    const hasGuest = !!String(body.guest_token || '').trim()
    if (!hasInvite && !hasGuest && !req.headers.get('Authorization')) {
      throw new Error('invite_token, guest_token, or Authorization required')
    }

    const party = await resolveEventPartyByInviteOrJwt(req, body)
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: event, error: evtErr } = await supabase
      .from('events')
      .select('id, title, slug')
      .eq('id', party.event_id)
      .maybeSingle()
    if (evtErr) throw new Error(evtErr.message)
    if (!event?.id) throw new Error('Event not found')

    const { data: plan, error: planErr } = await supabase
      .from('event_payment_plans')
      .select(`
        id, plan_kind, method, status,
        base_total_cents, fee_cents, total_due_cents,
        amount_paid_cents, remaining_cents,
        next_debit_at, fund_deadline, anchor_at,
        stripe_payment_method_id
      `)
      .eq('party_id', party.id)
      .maybeSingle()
    if (planErr) throw new Error(planErr.message)
    if (!plan?.id) throw new Error('Payment plan not found')

    const { data: installments, error: instErr } = await supabase
      .from('event_payment_installments')
      .select('sequence, kind, due_at, amount_cents, status')
      .eq('plan_id', plan.id)
      .order('sequence', { ascending: true })
    if (instErr) throw new Error(instErr.message)

    const { data: seats } = await supabase
      .from('event_seats')
      .select('role, display_name, options')
      .eq('party_id', party.id)
      .order('created_at', { ascending: true })

    const seatsSummary = (seats || []).map((s: any) => ({
      role: s.role,
      display_name: s.display_name || null,
      options_complete: !!(s.options && typeof s.options === 'object'
        && Object.keys(s.options).length > 0),
    }))

    const hasFailed = (installments || []).some((i: any) => String(i.status) === 'failed')
    const planStatus = String(plan.status || '')
    const hints = await methodDisplayHints(plan.stripe_payment_method_id as string | null)

    return json({
      event: {
        id: event.id,
        title: event.title,
        slug: event.slug,
      },
      party_id: party.id,
      invite_token: party.invite_token,
      plan: {
        id: plan.id,
        plan_kind: plan.plan_kind,
        method: plan.method,
        status: planStatus,
        base_total_cents: plan.base_total_cents,
        fee_cents: plan.fee_cents,
        total_due_cents: plan.total_due_cents,
        amount_paid_cents: plan.amount_paid_cents,
        remaining_cents: plan.remaining_cents,
        next_debit_at: plan.next_debit_at,
        fund_deadline: plan.fund_deadline,
        anchor_at: plan.anchor_at,
        ...(hints.method_last4 ? { method_last4: hints.method_last4 } : {}),
        ...(hints.method_brand ? { method_brand: hints.method_brand } : {}),
      },
      has_failed_installment: hasFailed,
      past_due: planStatus === 'past_due' || hasFailed,
      installments: (installments || []).map((i: any) => ({
        sequence: i.sequence,
        kind: i.kind,
        due_at: i.due_at,
        amount_cents: i.amount_cents,
        status: i.status,
      })),
      seats_summary: seatsSummary,
    })
  } catch (error) {
    console.error('get-event-party-payments error:', error)
    const msg = (error as Error).message || 'Failed to load payments'
    const status = msg === 'invalid_token' || msg === 'party_cancelled' ? 404 : 400
    return json({ error: msg }, status)
  }
})
