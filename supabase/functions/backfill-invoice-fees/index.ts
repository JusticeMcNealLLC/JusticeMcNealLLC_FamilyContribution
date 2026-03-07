// Supabase Edge Function: backfill-invoice-fees
// One-time function to pull Stripe fee data for all existing invoices
// Run manually via: curl -X POST <function-url> -H "Authorization: Bearer <service-role-key>"

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno&no-check'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string

serve(async (req) => {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get all invoices that haven't been backfilled yet (net_amount_cents = 0 or stripe_fee_cents = 0)
    const { data: invoices, error: fetchErr } = await supabase
      .from('invoices')
      .select('id, stripe_invoice_id, amount_paid_cents, stripe_fee_cents, net_amount_cents')
      .eq('status', 'paid')
      .or('net_amount_cents.eq.0,stripe_fee_cents.eq.0')
      .order('created_at', { ascending: true })

    if (fetchErr) throw fetchErr

    if (!invoices || invoices.length === 0) {
      return new Response(JSON.stringify({ message: 'No invoices need backfilling', updated: 0 }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    console.log(`Found ${invoices.length} invoices to backfill`)

    let updated = 0
    let failed = 0
    const errors: string[] = []

    for (const inv of invoices) {
      try {
        // Retrieve the Stripe invoice to get the charge ID
        const stripeInvoice = await stripe.invoices.retrieve(inv.stripe_invoice_id)

        if (!stripeInvoice.charge) {
          console.log(`Invoice ${inv.stripe_invoice_id}: no charge found, skipping`)
          continue
        }

        // Retrieve the charge with expanded balance_transaction
        const charge = await stripe.charges.retrieve(stripeInvoice.charge as string, {
          expand: ['balance_transaction'],
        })

        const bt = charge.balance_transaction as Stripe.BalanceTransaction
        if (!bt || typeof bt !== 'object') {
          console.log(`Invoice ${inv.stripe_invoice_id}: no balance_transaction, skipping`)
          continue
        }

        const stripeFee = bt.fee || 0
        const netAmount = bt.net || (inv.amount_paid_cents - stripeFee)

        console.log(`Invoice ${inv.stripe_invoice_id}: gross=${inv.amount_paid_cents}, fee=${stripeFee}, net=${netAmount}`)

        // Update the invoice
        const { error: updateErr } = await supabase
          .from('invoices')
          .update({
            stripe_fee_cents: stripeFee,
            net_amount_cents: netAmount,
          })
          .eq('id', inv.id)

        if (updateErr) {
          console.error(`Failed to update invoice ${inv.id}:`, updateErr)
          failed++
          errors.push(`${inv.stripe_invoice_id}: ${updateErr.message}`)
        } else {
          updated++
        }

        // Small delay to avoid Stripe rate limits
        await new Promise(resolve => setTimeout(resolve, 200))

      } catch (invErr: any) {
        console.error(`Error processing invoice ${inv.stripe_invoice_id}:`, invErr)
        failed++
        errors.push(`${inv.stripe_invoice_id}: ${invErr.message}`)
      }
    }

    const result = {
      message: 'Backfill complete',
      total: invoices.length,
      updated,
      failed,
      errors: errors.length > 0 ? errors : undefined,
    }

    console.log('Backfill result:', result)

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error('Backfill error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    )
  }
})
