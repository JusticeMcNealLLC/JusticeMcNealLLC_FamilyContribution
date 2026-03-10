-- Migration 047: Add paid_at and period_start columns to invoices
-- These are needed by the quests streak-detection logic to determine
-- which billing period each payment covers.
--
-- paid_at      — unix timestamp from invoice.status_transitions.paid_at
-- period_start — start of the billing period from the subscription line item

ALTER TABLE invoices
    ADD COLUMN IF NOT EXISTS paid_at       TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS period_start  TIMESTAMPTZ;

-- Back-fill existing rows: use created_at as best approximation for old records
UPDATE invoices SET paid_at = created_at WHERE paid_at IS NULL;
UPDATE invoices SET period_start = created_at WHERE period_start IS NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_paid_at      ON invoices(paid_at);
CREATE INDEX IF NOT EXISTS idx_invoices_period_start ON invoices(period_start);

COMMENT ON COLUMN invoices.paid_at      IS 'When Stripe marked the invoice paid (invoice.status_transitions.paid_at)';
COMMENT ON COLUMN invoices.period_start IS 'Start of the billing period covered by this invoice (subscription line item period.start)';
