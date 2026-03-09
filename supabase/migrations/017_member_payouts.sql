-- =====================================================
-- Migration 017: Member Payouts System
-- Stripe Connect infrastructure for birthday gifts,
-- competition prizes, bonuses, and more.
-- =====================================================

-- ─── Add Connect columns to profiles ─────────────────
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT,
    ADD COLUMN IF NOT EXISTS payout_enrolled BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS connect_onboarding_complete BOOLEAN NOT NULL DEFAULT false;

-- Index for birthday cron lookups
CREATE INDEX IF NOT EXISTS idx_profiles_birthday ON profiles(birthday);
CREATE INDEX IF NOT EXISTS idx_profiles_payout_enrolled ON profiles(payout_enrolled);

-- ─── App Settings table (admin-controlled config) ────
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES profiles(id)
);

-- Seed default payout settings
INSERT INTO app_settings (key, value) VALUES
    ('payouts_enabled', 'true'::jsonb),
    ('birthday_payouts_enabled', 'true'::jsonb),
    ('birthday_payout_amount_cents', '1000'::jsonb),
    ('competition_payouts_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ─── Payout Enrollments (per-member, per-type) ──────
CREATE TABLE IF NOT EXISTS payout_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    payout_type TEXT NOT NULL CHECK (payout_type IN ('birthday', 'competition', 'bonus', 'profit_share', 'referral', 'quest_reward', 'custom')),
    enrolled BOOLEAN NOT NULL DEFAULT true,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, payout_type)
);

CREATE INDEX IF NOT EXISTS idx_payout_enrollments_user ON payout_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_payout_enrollments_type ON payout_enrollments(payout_type);

-- ─── Payouts ledger (universal) ─────────────────────
CREATE TABLE IF NOT EXISTS payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    payout_type TEXT NOT NULL CHECK (payout_type IN ('birthday', 'competition', 'bonus', 'profit_share', 'referral', 'quest_reward', 'custom')),
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'processing', 'completed', 'failed')),
    stripe_transfer_id TEXT,
    stripe_payout_id TEXT,
    error_message TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payouts_user ON payouts(user_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_type ON payouts(payout_type);
CREATE INDEX IF NOT EXISTS idx_payouts_created_at ON payouts(created_at DESC);

-- ─── RLS Policies ──────────────────────────────────

-- App Settings: admins can read/write, members can read
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read settings"
    ON app_settings FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can update settings"
    ON app_settings FOR UPDATE
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can insert settings"
    ON app_settings FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Payout Enrollments: members manage own, admins see all
ALTER TABLE payout_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view own enrollments"
    ON payout_enrollments FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Members can insert own enrollments"
    ON payout_enrollments FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Members can update own enrollments"
    ON payout_enrollments FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

-- Payouts: members see own, admins see all
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view own payouts"
    ON payouts FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can insert payouts"
    ON payouts FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can update payouts"
    ON payouts FOR UPDATE
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Service role bypass for edge functions (payouts created by cron)
-- Edge functions use service_role key which bypasses RLS automatically
