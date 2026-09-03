-- 095: Event pricing / capacity / pay-method columns
-- Spec: docs/product/improvements/pages/events/001_event_pricing_fields_migration_draft.md

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS adult_price_cents INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kids_free BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS kid_price_cents INT NULL,
  ADD COLUMN IF NOT EXISTS fund_deadline TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS ach_payments_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS card_payments_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS card_fee_bps INT NULL,
  ADD COLUMN IF NOT EXISTS capacity_mode TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS capacity_counts TEXT NOT NULL DEFAULT 'adults';

UPDATE events
SET adult_price_cents = COALESCE(rsvp_cost_cents, 0)
WHERE COALESCE(rsvp_cost_cents, 0) > 0
  AND adult_price_cents = 0;

ALTER TABLE events DROP CONSTRAINT IF EXISTS events_adult_price_cents_nonneg;
ALTER TABLE events
  ADD CONSTRAINT events_adult_price_cents_nonneg CHECK (adult_price_cents >= 0);

ALTER TABLE events DROP CONSTRAINT IF EXISTS events_kid_price_rules;
ALTER TABLE events
  ADD CONSTRAINT events_kid_price_rules CHECK (
    (kids_free = TRUE AND kid_price_cents IS NULL)
    OR (kids_free = FALSE AND kid_price_cents IS NOT NULL AND kid_price_cents >= 0)
  );

ALTER TABLE events DROP CONSTRAINT IF EXISTS events_card_fee_bps_nonneg;
ALTER TABLE events
  ADD CONSTRAINT events_card_fee_bps_nonneg CHECK (
    card_fee_bps IS NULL OR card_fee_bps >= 0
  );

ALTER TABLE events DROP CONSTRAINT IF EXISTS events_capacity_mode_check;
ALTER TABLE events
  ADD CONSTRAINT events_capacity_mode_check CHECK (
    capacity_mode IN ('none', 'soft', 'hard')
  );

ALTER TABLE events DROP CONSTRAINT IF EXISTS events_capacity_counts_check;
ALTER TABLE events
  ADD CONSTRAINT events_capacity_counts_check CHECK (
    capacity_counts IN ('adults', 'all')
  );

COMMENT ON COLUMN events.adult_price_cents IS 'Per-adult seat price in cents; prefer over rsvp_cost_cents';
COMMENT ON COLUMN events.kids_free IS 'When true, kid seats are not billed; kid_price_cents must be null';
COMMENT ON COLUMN events.kid_price_cents IS 'Per-kid price when kids_free is false';
COMMENT ON COLUMN events.fund_deadline IS 'Installment funding due date; independent of rsvp_deadline';
COMMENT ON COLUMN events.ach_payments_enabled IS 'Allow Stripe ACH / bank debit';
COMMENT ON COLUMN events.card_payments_enabled IS 'Allow card; fee pass-through via card_fee_bps or platform default';
COMMENT ON COLUMN events.card_fee_bps IS 'Optional card fee override in basis points; null = platform default';
COMMENT ON COLUMN events.capacity_mode IS 'none | soft (waitlist) | hard (block)';
COMMENT ON COLUMN events.capacity_counts IS 'adults = only adult seats count toward max_participants; all = adults+kids';
