// Supabase Edge Function: verify-connect-status
// Actively checks the Stripe Connect account status for the authenticated user
// and syncs connect_onboarding_complete in their profile.
//
// This is called by connect-return.html after the user returns from Stripe onboarding,
// to avoid depending solely on the account.updated webhook (which requires special
// Stripe Dashboard configuration to receive Connected account events).

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
    // Authenticate the calling user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No authorization header')

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) throw new Error('Invalid token')

    // Get their current Connect account ID from the profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_connect_account_id, connect_onboarding_complete')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      throw new Error('Profile not found')
    }

    if (!profile.stripe_connect_account_id) {
      // No Connect account exists yet
      return new Response(
        JSON.stringify({ complete: false, reason: 'no_account' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Short-circuit if already marked complete in DB
    if (profile.connect_onboarding_complete) {
      return new Response(
        JSON.stringify({ complete: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Retrieve the Connect account directly from Stripe to get real-time status
    console.log('Fetching Connect account from Stripe:', profile.stripe_connect_account_id)
    const account = await stripe.accounts.retrieve(profile.stripe_connect_account_id)

    console.log(
      'Stripe account status — charges_enabled:', account.charges_enabled,
      'payouts_enabled:', account.payouts_enabled,
      'details_submitted:', account.details_submitted
    )

    const isComplete = account.charges_enabled || account.payouts_enabled || false

    if (isComplete) {
      // Mark as complete and enroll in payouts
      console.log('Marking connect_onboarding_complete = true for user:', user.id)
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          connect_onboarding_complete: true,
          payout_enrolled: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (updateError) {
        console.error('Error updating profile:', updateError)
        throw new Error('Failed to update profile: ' + updateError.message)
      }

      // Ensure birthday payout enrollment exists
      await supabase
        .from('payout_enrollments')
        .upsert({
          user_id: user.id,
          payout_type: 'birthday',
          enrolled: true,
        }, { onConflict: 'user_id,payout_type' })
    }

    return new Response(
      JSON.stringify({
        complete: isComplete,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('verify-connect-status error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
