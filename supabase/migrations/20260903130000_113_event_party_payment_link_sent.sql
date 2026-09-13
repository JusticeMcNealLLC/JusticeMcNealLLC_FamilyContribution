-- 113: Idempotency for payment magic-link SMS (§13.11 line 448)
ALTER TABLE event_parties
    ADD COLUMN IF NOT EXISTS payment_link_sent_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN event_parties.payment_link_sent_at IS
    'When payment magic-link SMS was last sent; used for first-send idempotency and resend cooldown';
