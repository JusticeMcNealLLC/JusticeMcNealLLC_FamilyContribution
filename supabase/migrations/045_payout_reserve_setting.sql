-- Migration 045: Add payout_reserve_cents app setting
-- Defines the minimum USD balance (in cents) to keep in the Stripe platform
-- account at all times. Payouts are blocked if sending one would drop the
-- available balance below this threshold.
-- Default: $200 (20000 cents). Configurable from the admin payouts panel.

INSERT INTO app_settings (key, value)
VALUES ('payout_reserve_cents', '20000'::jsonb)
ON CONFLICT (key) DO NOTHING;
