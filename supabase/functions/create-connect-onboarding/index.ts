// Supabase Edge Function: create-connect-onboarding
// Creates (or retrieves) a Stripe Connect Express account for a member
// and returns an Account Link URL for onboarding.

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
    // Authenticate
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No authorization header')

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) throw new Error('Invalid token')

    // Check global payouts toggle
    const { data: setting } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'payouts_enabled')
      .single()

    if (!setting || setting.value !== true) {
      throw new Error('Payouts are currently disabled by the administrator')
    }

    // Get member profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_connect_account_id, first_name, last_name, connect_onboarding_complete')
      .eq('id', user.id)
      .single()

    let connectAccountId = profile?.stripe_connect_account_id

    // Create Connect Express account if none exists
    if (!connectAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: user.email,
        capabilities: {
          transfers: { requested: true },
        },
        metadata: {
          supabase_user_id: user.id,
        },
        business_profile: {
          product_description: 'Family contribution payouts',
        },
      })

      connectAccountId = account.id

      // Save to profile
      await supabase
        .from('profiles')
        .update({
          stripe_connect_account_id: connectAccountId,
          payout_enrolled: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      // Auto-enroll in birthday payouts
      await supabase
        .from('payout_enrollments')
        .upsert({
          user_id: user.id,
          payout_type: 'birthday',
          enrolled: true,
        }, { onConflict: 'user_id,payout_type' })
    }

    // Parse request body for return/refresh URLs
    const { return_url, refresh_url } = await req.json().catch(() => ({}))
    const siteUrl = 'https://justicemcneal.com'

    // Generate Account Link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: connectAccountId,
      type: 'account_onboarding',
      return_url: return_url || `${siteUrl}/portal/connect-return.html?status=complete`,
      refresh_url: refresh_url || `${siteUrl}/portal/connect-return.html?status=refresh`,
    })

    return new Response(
      JSON.stringify({
        url: accountLink.url,
        account_id: connectAccountId,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Connect onboarding error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
