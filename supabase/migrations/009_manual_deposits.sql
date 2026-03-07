-- =====================================================
-- Manual Deposits Table
-- Records one-time or manual deposits attributed to
-- specific members (outside of Stripe subscriptions)
-- =====================================================

-- 1. MANUAL_DEPOSITS TABLE
CREATE TABLE IF NOT EXISTS manual_deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
    deposit_date DATE NOT NULL,
    deposit_type TEXT NOT NULL DEFAULT 'manual'
        CHECK (deposit_type IN ('manual', 'transfer', 'cash', 'other')),
    notes TEXT,
    recorded_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_manual_deposits_member ON manual_deposits(member_id);
CREATE INDEX idx_manual_deposits_date ON manual_deposits(deposit_date DESC);
CREATE INDEX idx_manual_deposits_recorded_by ON manual_deposits(recorded_by);

-- =====================================================
-- ENABLE RLS
-- =====================================================

ALTER TABLE manual_deposits ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- Members can see their own deposits
-- Admins can see all deposits and insert/update/delete
-- =====================================================

-- All members can read their own deposits
CREATE POLICY "Members can read own deposits"
    ON manual_deposits FOR SELECT
    USING (auth.uid() = member_id);

-- Admins can read ALL deposits
CREATE POLICY "Admins can read all deposits"
    ON manual_deposits FOR SELECT
    USING (public.is_admin());

-- Admins can insert deposits
CREATE POLICY "Admins can insert deposits"
    ON manual_deposits FOR INSERT
    WITH CHECK (public.is_admin());

-- Admins can update deposits
CREATE POLICY "Admins can update deposits"
    ON manual_deposits FOR UPDATE
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Admins can delete deposits
CREATE POLICY "Admins can delete deposits"
    ON manual_deposits FOR DELETE
    USING (public.is_admin());

-- =====================================================
-- HELPER FUNCTION: Get total contributions for a member
-- (Stripe invoices + manual deposits combined)
-- =====================================================

CREATE OR REPLACE FUNCTION get_member_total_contributions(target_member_id UUID)
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT COALESCE(
        (SELECT SUM(amount_paid_cents) FROM invoices WHERE user_id = target_member_id AND status = 'paid'),
        0
    ) + COALESCE(
        (SELECT SUM(amount_cents) FROM manual_deposits WHERE member_id = target_member_id),
        0
    );
$$;

-- =====================================================
-- UPDATE family contribution total to include manual deposits
-- =====================================================

CREATE OR REPLACE FUNCTION get_family_contribution_total()
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT COALESCE(
        (SELECT SUM(amount_paid_cents) FROM invoices WHERE status = 'paid'),
        0
    ) + COALESCE(
        (SELECT SUM(amount_cents) FROM manual_deposits),
        0
    );
$$;

-- =====================================================
-- DONE! Manual deposits table ready.
-- deposit_type options:
--   'manual'   - Admin manually records a deposit
--   'transfer' - Member transferred personal investments into LLC
--   'cash'     - Cash deposit
--   'other'    - Any other type
-- =====================================================
