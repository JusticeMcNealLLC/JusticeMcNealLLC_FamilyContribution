// backfill-receipt-urls: one-shot function to fill missing receipt URLs
// for extra_deposit invoices that were recorded before the webhook captured receipt_url.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2023-10-16' })

Deno.serve(async (req) => {
  try {
    // Only allow POST
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Find extra_deposit invoices with no receipt URL
    const { data: invoices, error: fetchErr } = await supabase
      .from('invoices')
      .select('id, stripe_invoice_id')
      .eq('payment_type', 'extra_deposit')
      .is('hosted_invoice_url', null)

    if (fetchErr) throw fetchErr
    if (!invoices || invoices.length === 0) {
      return new Response(JSON.stringify({ message: 'No invoices to backfill', count: 0 }))
    }

    const results: { id: string; status: string; receiptUrl?: string }[] = []

    for (const inv of invoices) {
      try {
        // stripe_invoice_id stores the PaymentIntent ID for extra deposits
        const piId = inv.stripe_invoice_id
        if (!piId || !piId.startsWith('pi_')) {
          results.push({ id: inv.id, status: 'skipped — not a pi_ id' })
          continue
        }

        const paymentIntent = await stripe.paymentIntents.retrieve(piId, {
          expand: ['latest_charge'],
        })

        const charge = paymentIntent.latest_charge as Stripe.Charge
        const receiptUrl = charge?.receipt_url || null

        if (receiptUrl) {
          const { error: updateErr } = await supabase
            .from('invoices')
            .update({ hosted_invoice_url: receiptUrl })
            .eq('id', inv.id)

          if (updateErr) {
            results.push({ id: inv.id, status: 'db update error: ' + updateErr.message })
          } else {
            results.push({ id: inv.id, status: 'backfilled', receiptUrl })
          }
        } else {
          results.push({ id: inv.id, status: 'no receipt_url on charge' })
        }
      } catch (err) {
        results.push({ id: inv.id, status: 'error: ' + (err as Error).message })
      }
    }

    return new Response(JSON.stringify({ message: 'Backfill complete', results }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 })
  }
})
