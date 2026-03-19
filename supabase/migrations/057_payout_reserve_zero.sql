-- Migration 057: Set payout reserve to $0
-- Stripe auto-payouts sweep the balance to the bank daily.
-- The reserve check will still block if balance < payout amount,
-- but $0 means we won't hold back extra beyond the payout itself.
UPDATE app_settings SET value = '0'::jsonb WHERE key = 'payout_reserve_cents';
