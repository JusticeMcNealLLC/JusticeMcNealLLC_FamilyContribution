-- =====================================================
-- Add Stripe fee tracking to invoices
-- Tracks: stripe_fee_cents (Stripe's cut) and
--         net_amount_cents (what the LLC actually received)
-- =====================================================

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS stripe_fee_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS net_amount_cents INTEGER NOT NULL DEFAULT 0;

-- For existing rows where fees haven't been backfilled yet,
-- net defaults to 0. The backfill script will update these.
-- Going forward, the webhook populates both columns.

COMMENT ON COLUMN invoices.stripe_fee_cents IS 'Stripe processing fee in cents (e.g. 2.9% + 30c)';
COMMENT ON COLUMN invoices.net_amount_cents IS 'Amount actually received by LLC after Stripe fees';

-- =====================================================
-- Update helper functions to support net calculations
-- =====================================================

-- Family total NET received (for admin financial reporting)
CREATE OR REPLACE FUNCTION get_family_net_total()
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT COALESCE(
        (SELECT SUM(net_amount_cents) FROM invoices WHERE status = 'paid' AND net_amount_cents > 0),
        0
    ) + COALESCE(
        (SELECT SUM(amount_cents) FROM manual_deposits),
        0
    );
$$;

-- Total Stripe fees collected
CREATE OR REPLACE FUNCTION get_total_stripe_fees()
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT COALESCE(SUM(stripe_fee_cents), 0) FROM invoices WHERE status = 'paid';
$$;
