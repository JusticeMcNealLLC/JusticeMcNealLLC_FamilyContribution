// Supabase Edge Function: reconcile-event-party-payments
// §13.10 line 441 — Fix installments stuck in processing vs Stripe PI truth

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno&no-check'
import { reconcileStuckProcessingInstallments } from '../_shared/event-party-reconcile.ts'

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

function assertServiceRole(req: Request): void {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  if (!supabaseServiceKey || token !== supabaseServiceKey) {
    throw new Error('Unauthorized: service role required')
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    assertServiceRole(req)
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body = await req.json().catch(() => ({}))
    const staleMinutes = Number(body.stale_minutes) > 0 ? Number(body.stale_minutes) : undefined
    const limit = Number(body.limit) > 0 ? Number(body.limit) : undefined

    const summary = await reconcileStuckProcessingInstallments(supabase, stripe, {
      staleMinutes,
      limit,
    })

    console.log('reconcile-event-party-payments', JSON.stringify({
      checked: summary.checked,
      fixed_succeeded: summary.fixed_succeeded,
      fixed_failed: summary.fixed_failed,
      skipped: summary.skipped,
      errors: summary.errors,
    }))

    return json(summary)
  } catch (error) {
    console.error('reconcile-event-party-payments error:', error)
    const msg = (error as Error).message || 'Reconcile failed'
    const status = msg.startsWith('Unauthorized') ? 401 : 400
    return json({ error: msg }, status)
  }
})
