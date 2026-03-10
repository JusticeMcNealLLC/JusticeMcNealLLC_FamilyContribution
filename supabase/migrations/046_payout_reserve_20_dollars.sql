-- Migration 046: Lower payout reserve to $20 for testing
UPDATE app_settings SET value = '2000'::jsonb WHERE key = 'payout_reserve_cents';
