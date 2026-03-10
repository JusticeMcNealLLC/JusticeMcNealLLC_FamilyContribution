-- Migration 044: Fix connect_onboarding_complete for accounts verified on Stripe
-- Account acct_1T8sd90aINSNtE1X (Justin McNeal) is fully enabled on Stripe
-- but the webhook never fired to update the DB flag.

UPDATE profiles
SET
    connect_onboarding_complete = true,
    payout_enrolled = true,
    updated_at = now()
WHERE stripe_connect_account_id = 'acct_1T8sd90aINSNtE1X';
