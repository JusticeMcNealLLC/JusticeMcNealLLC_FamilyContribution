-- ══════════════════════════════════════════════════════════════
-- Migration 014 — Quest & Task System (Phase 2B)
-- Tables: quests, member_quests, credit_points_log, member_badges
-- Functions: get_member_cp_balance(), get_member_cp_tier()
-- ══════════════════════════════════════════════════════════════

-- ─── 1. Quests Table ─────────────────────────────────────────
-- Admin-defined tasks that members can complete for Credit Points.
CREATE TABLE IF NOT EXISTS quests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    description text,
    instructions text,                          -- detailed how-to (shown in quest detail)
    emoji text DEFAULT '🎯',
    cp_reward integer NOT NULL DEFAULT 10,       -- Credit Points earned on completion
    quest_type text NOT NULL DEFAULT 'one_time'  -- 'one_time' | 'recurring_monthly' | 'per_event'
        CHECK (quest_type IN ('one_time', 'recurring_monthly', 'per_event')),
    category text DEFAULT 'general'              -- 'general' | 'finance' | 'profile' | 'fidelity' | 'streak'
        CHECK (category IN ('general', 'finance', 'profile', 'fidelity', 'streak')),
    auto_detect_key text,                        -- for auto-completion: 'activate_subscription', 'upload_photo', 'complete_onboarding', etc.
    requires_proof boolean DEFAULT false,         -- whether member must upload proof
    is_active boolean DEFAULT true,               -- admin can deactivate quests
    sort_order integer DEFAULT 0,                 -- display ordering
    created_by uuid REFERENCES profiles(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- ─── 2. Member Quests Table ──────────────────────────────────
-- Tracks each member's progress on assigned/available quests.
CREATE TABLE IF NOT EXISTS member_quests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    quest_id uuid NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'available'
        CHECK (status IN ('available', 'in_progress', 'submitted', 'completed', 'rejected')),
    proof_url text,                              -- uploaded screenshot/proof
    proof_note text,                             -- member's note about proof
    admin_note text,                             -- admin feedback on submission
    verified_by uuid REFERENCES profiles(id),
    started_at timestamptz,
    submitted_at timestamptz,
    completed_at timestamptz,
    -- For recurring quests: which period this applies to
    period_key text,                             -- e.g. '2026-03' for monthly recurring
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    -- A member can only have one entry per quest per period
    UNIQUE (quest_id, user_id, period_key)
);

-- ─── 3. Credit Points Log ────────────────────────────────────
-- Every CP award/deduction. Rolling 3-month window uses expires_at.
CREATE TABLE IF NOT EXISTS credit_points_log (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    points integer NOT NULL,                     -- positive = earned, negative = deduction
    reason text NOT NULL,                        -- human-readable: "Completed: Upload Profile Picture"
    quest_id uuid REFERENCES quests(id) ON DELETE SET NULL,
    member_quest_id uuid REFERENCES member_quests(id) ON DELETE SET NULL,
    expires_at timestamptz NOT NULL DEFAULT (now() + interval '90 days'),
    created_at timestamptz DEFAULT now()
);

-- ─── 4. Member Badges Table ──────────────────────────────────
-- Permanent achievements. Members choose one to display.
CREATE TABLE IF NOT EXISTS member_badges (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    badge_key text NOT NULL,                     -- e.g. 'founding_member', 'streak_master', 'shutterbug'
    earned_at timestamptz DEFAULT now(),
    is_displayed boolean DEFAULT false,          -- only one per user should be true
    created_at timestamptz DEFAULT now(),
    UNIQUE (user_id, badge_key)
);

-- ─── 5. Add displayed_badge to profiles ──────────────────────
-- Quick access to a member's currently displayed badge key.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS displayed_badge text;

-- ─── 6. Indexes ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_member_quests_user ON member_quests(user_id);
CREATE INDEX IF NOT EXISTS idx_member_quests_quest ON member_quests(quest_id);
CREATE INDEX IF NOT EXISTS idx_member_quests_status ON member_quests(status);
CREATE INDEX IF NOT EXISTS idx_cp_log_user ON credit_points_log(user_id);
CREATE INDEX IF NOT EXISTS idx_cp_log_expires ON credit_points_log(expires_at);
CREATE INDEX IF NOT EXISTS idx_member_badges_user ON member_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_quests_active ON quests(is_active);

-- ─── 7. Updated-at Triggers ──────────────────────────────────
CREATE TRIGGER set_quests_updated_at
    BEFORE UPDATE ON quests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_member_quests_updated_at
    BEFORE UPDATE ON member_quests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── 8. RLS Policies ────────────────────────────────────────

-- QUESTS — everyone can read active quests, only admin can write
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active quests"
    ON quests FOR SELECT
    USING (is_active = true OR is_admin());

CREATE POLICY "Admins can manage quests"
    ON quests FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

-- MEMBER_QUESTS — users see own, admin sees all
ALTER TABLE member_quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quests"
    ON member_quests FOR SELECT
    USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "Users can update own quests"
    ON member_quests FOR UPDATE
    USING (user_id = auth.uid() OR is_admin())
    WITH CHECK (user_id = auth.uid() OR is_admin());

CREATE POLICY "Users can insert own quests"
    ON member_quests FOR INSERT
    WITH CHECK (user_id = auth.uid() OR is_admin());

CREATE POLICY "Admins can delete member quests"
    ON member_quests FOR DELETE
    USING (is_admin());

-- CREDIT_POINTS_LOG — users see own, admin sees all
ALTER TABLE credit_points_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own CP log"
    ON credit_points_log FOR SELECT
    USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "System/admin can insert CP"
    ON credit_points_log FOR INSERT
    WITH CHECK (is_admin() OR user_id = auth.uid());

-- MEMBER_BADGES — users see own, admin sees all
ALTER TABLE member_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own badges"
    ON member_badges FOR SELECT
    USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "System/admin can insert badges"
    ON member_badges FOR INSERT
    WITH CHECK (is_admin() OR user_id = auth.uid());

CREATE POLICY "Users can update own badges"
    ON member_badges FOR UPDATE
    USING (user_id = auth.uid() OR is_admin())
    WITH CHECK (user_id = auth.uid() OR is_admin());

-- ─── 9. Helper Functions ─────────────────────────────────────

-- Get a member's active CP balance (only non-expired points in last 90 days)
CREATE OR REPLACE FUNCTION get_member_cp_balance(target_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT COALESCE(SUM(points), 0)::integer
    FROM credit_points_log
    WHERE user_id = target_user_id
      AND expires_at > now();
$$;

-- Get a member's CP tier name based on rolling balance
CREATE OR REPLACE FUNCTION get_member_cp_tier(target_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT CASE
        WHEN COALESCE(SUM(points), 0) >= 500 THEN 'diamond'
        WHEN COALESCE(SUM(points), 0) >= 250 THEN 'gold'
        WHEN COALESCE(SUM(points), 0) >= 100 THEN 'silver'
        ELSE 'bronze'
    END
    FROM credit_points_log
    WHERE user_id = target_user_id
      AND expires_at > now();
$$;

-- ─── 10. Seed Data — Initial Quests ─────────────────────────
INSERT INTO quests (title, description, instructions, emoji, cp_reward, quest_type, category, auto_detect_key, requires_proof, sort_order) VALUES
(
    'Activate Your Contribution',
    'Start your monthly subscription to the family fund.',
    'Go to the Dashboard and click "Manage Contribution" to set up your monthly payment. Once your first payment processes, this quest completes automatically!',
    '✅', 50, 'one_time', 'finance', 'activate_subscription', false, 1
),
(
    'Upload Profile Picture',
    'Add a profile photo so the family knows who you are.',
    'Go to Settings → Click your avatar → Upload a photo. JPG, PNG, or WebP formats accepted.',
    '📸', 20, 'one_time', 'profile', 'upload_photo', false, 2
),
(
    'Complete Onboarding',
    'Finish all onboarding steps: name, birthday, and photo.',
    'Go to Settings and make sure your first name, last name, birthday, and profile picture are all filled in.',
    '🎓', 30, 'one_time', 'profile', 'complete_onboarding', false, 3
),
(
    'On-Time Payment',
    'Pay your monthly subscription on time this month.',
    'Simply keep your payment method up to date! When your subscription renews successfully, you earn CP automatically.',
    '💰', 10, 'recurring_monthly', 'finance', 'on_time_payment', false, 4
),
(
    '3-Month Streak',
    'Maintain 3 consecutive on-time payments.',
    'Keep your subscription active and payments current for 3 months in a row. Tracked automatically!',
    '🔥', 25, 'one_time', 'streak', 'streak_3', false, 5
),
(
    '6-Month Streak',
    'Maintain 6 consecutive on-time payments.',
    'Keep your subscription active and payments current for 6 months in a row.',
    '⚡', 50, 'one_time', 'streak', 'streak_6', false, 6
),
(
    'Increase Your Contribution',
    'Raise your monthly contribution amount above the minimum.',
    'Go to Dashboard → Manage Contribution → Select a higher amount. Any increase above $30/month qualifies.',
    '📈', 30, 'one_time', 'finance', 'increase_contribution', false, 7
),
(
    'Open Fidelity Account',
    'Create a personal Fidelity brokerage account.',
    'Visit fidelity.com and open a free brokerage account. Once set up, submit proof (screenshot of your account dashboard) for admin verification.',
    '🏦', 50, 'one_time', 'fidelity', null, true, 8
),
(
    'Apply for Fidelity Card',
    'Apply for the Fidelity Rewards Visa Signature Card.',
    'The Fidelity Rewards Visa earns 2% cashback on ALL purchases. Apply at fidelity.com/cash-management/visa-signature-card. Submit a screenshot of your approval or application status.',
    '💳', 50, 'one_time', 'fidelity', null, true, 9
),
(
    'Link Cashback to LLC',
    'Link your Fidelity card cashback to the LLC brokerage account.',
    'In your Fidelity account settings, set your 2% cashback to deposit into the LLC''s Fidelity brokerage account. This means every dollar you spend passively grows the family fund! Submit a screenshot showing the linked account.',
    '🔗', 100, 'one_time', 'fidelity', null, true, 10
),
(
    'Credit Score Check-In',
    'Log your current credit score on the portal.',
    'Check your credit score through your bank, Credit Karma, or any free service. Log it on your profile to track your progress over time.',
    '📊', 15, 'recurring_monthly', 'finance', null, true, 11
),
(
    'Refer a Family Member',
    'Invite and successfully onboard a new family member.',
    'Talk to a family member about joining the contribution portal. Once they''re invited by admin and complete onboarding, you both earn CP!',
    '👥', 75, 'per_event', 'general', null, true, 12
)
ON CONFLICT DO NOTHING;
