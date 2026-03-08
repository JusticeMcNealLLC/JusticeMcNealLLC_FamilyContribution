-- Migration 013: Add payment_type column to invoices
-- Distinguishes monthly subscription payments from one-time extra deposits

-- Add the column with a default of 'subscription' (existing rows are all either subscription or need backfill)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_type TEXT NOT NULL DEFAULT 'subscription';

-- Index for quick filtering
CREATE INDEX IF NOT EXISTS idx_invoices_payment_type ON invoices(payment_type);

-- Backfill: Extra deposits have a stripe_invoice_id that starts with 'pi_' (payment intent)
-- or 'ed_' (fallback), whereas real subscription invoices start with 'in_'.
UPDATE invoices
SET payment_type = 'extra_deposit'
WHERE stripe_invoice_id LIKE 'pi_%'
   OR stripe_invoice_id LIKE 'ed_%';

COMMENT ON COLUMN invoices.payment_type IS 'subscription = recurring monthly, extra_deposit = one-time Stripe payment';
