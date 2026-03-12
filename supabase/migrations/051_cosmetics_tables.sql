-- ══════════════════════════════════════════════════════════════
-- Migration 051 — Cosmetics System
-- Creates:
--   cosmetics         — catalog of all earnable banners & badges
--   member_cosmetics  — per-member earned cosmetics ledger
-- Adds:
--   quests.banner_reward_key  — which banner (if any) a quest unlocks
--   profiles.active_banner_key — FK-backed replacement for free-text cover_gradient
-- ══════════════════════════════════════════════════════════════

-- ─── 1. Cosmetics Catalog ────────────────────────────────────
-- Single source of truth for all earnable cosmetics (banners + badges).
-- Rendering data (preview CSS, gradients, lottie effects) lives here
-- alongside quest linkage, replacing the hardcoded JS BANNER_CATALOG
-- and BADGE_CATALOG objects over time.
CREATE TABLE IF NOT EXISTS cosmetics (
    key             TEXT PRIMARY KEY,
    type            TEXT NOT NULL DEFAULT 'banner'
                        CHECK (type IN ('banner', 'badge')),
    name            TEXT NOT NULL,
    emoji           TEXT,                   -- for badges (e.g. '🏅')
    description     TEXT,
    rarity          TEXT NOT NULL DEFAULT 'common'
                        CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
    -- Rendering fields
    preview_class   TEXT,                   -- CSS class for animated banner preview (e.g. 'founders-banner-preview')
    gradient        TEXT,                   -- Tailwind gradient string (e.g. 'from-slate-900 to-purple-900')
    lottie_effect   TEXT,                   -- Lottie animation name (e.g. 'sparkle', 'fire')
    is_animated     BOOLEAN NOT NULL DEFAULT FALSE,
    -- Quest linkage
    is_quest_locked BOOLEAN NOT NULL DEFAULT FALSE, -- TRUE = only obtainable through a specific quest
    quest_unlock_key TEXT,                  -- auto_detect_key of the quest that unlocks this (informational)
    -- Display ordering
    sort_order      INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE cosmetics IS 'Catalog of all earnable cosmetics (banners and badges). Single source of truth for names, rarity, rendering data, and quest linkage.';
COMMENT ON COLUMN cosmetics.quest_unlock_key IS 'The auto_detect_key of the quest that awards this cosmetic. Informational — actual award happens in member_cosmetics.';

-- ─── 2. Member Cosmetics (Earned Ledger) ─────────────────────
-- Tracks every cosmetic each member has unlocked.
-- Replaces the split state: member_badges (badges) + profiles.earned_banners (banners).
CREATE TABLE IF NOT EXISTS member_cosmetics (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    cosmetic_key    TEXT NOT NULL REFERENCES cosmetics(key) ON DELETE CASCADE,
    earned_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    awarded_by      TEXT NOT NULL DEFAULT 'quest'
                        CHECK (awarded_by IN ('quest', 'admin', 'system')),
    UNIQUE(user_id, cosmetic_key)
);

COMMENT ON TABLE member_cosmetics IS 'Earned cosmetics per member. Insert here to unlock a banner or badge for a user.';

CREATE INDEX IF NOT EXISTS idx_member_cosmetics_user ON member_cosmetics(user_id);
CREATE INDEX IF NOT EXISTS idx_member_cosmetics_key  ON member_cosmetics(cosmetic_key);
CREATE INDEX IF NOT EXISTS idx_member_cosmetics_user_type
    ON member_cosmetics(user_id, cosmetic_key);

-- ─── 3. RLS — Cosmetics Catalog (public read) ────────────────
ALTER TABLE cosmetics ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read the catalog (needed for profile pages, quest details)
CREATE POLICY "cosmetics_authenticated_read"
    ON cosmetics FOR SELECT
    TO authenticated
    USING (true);

-- Only service role or admins can modify the catalog
CREATE POLICY "cosmetics_admin_write"
    ON cosmetics FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

-- ─── 4. RLS — Member Cosmetics ───────────────────────────────
ALTER TABLE member_cosmetics ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read earned cosmetics (profile pages show other members' banners/badges)
CREATE POLICY "member_cosmetics_authenticated_read"
    ON member_cosmetics FOR SELECT
    TO authenticated
    USING (true);

-- Only admins (and service role via backend) can award cosmetics
CREATE POLICY "member_cosmetics_admin_insert"
    ON member_cosmetics FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "member_cosmetics_admin_delete"
    ON member_cosmetics FOR DELETE
    USING (is_admin());

-- ─── 5. Add banner_reward_key to quests ──────────────────────
-- Companion to the existing badge_reward_key column.
-- A quest can award one badge AND/OR one banner on completion.
ALTER TABLE quests ADD COLUMN IF NOT EXISTS banner_reward_key TEXT REFERENCES cosmetics(key);

COMMENT ON COLUMN quests.banner_reward_key IS 'The cosmetics.key of the banner (if any) this quest unlocks on completion.';
COMMENT ON COLUMN quests.badge_reward_key  IS 'The badge key (in BADGE_CATALOG / cosmetics) this quest unlocks on completion.';

-- ─── 6. Add active_banner_key to profiles ────────────────────
-- FK-backed column replacing the free-text cover_gradient string.
-- Both columns coexist during migration; active_banner_key is the canonical one.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_banner_key TEXT REFERENCES cosmetics(key);

COMMENT ON COLUMN profiles.active_banner_key IS 'FK to cosmetics(key) for the member''s active banner. Replaces cover_gradient over time.';

-- ─── 7. Sync trigger: member_badges → member_cosmetics ───────
-- When existing code awards a badge via member_badges INSERT, keep
-- member_cosmetics in sync so the new system stays consistent.
CREATE OR REPLACE FUNCTION sync_badge_to_cosmetics()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only sync if the cosmetic key exists in the catalog
    IF EXISTS (SELECT 1 FROM cosmetics WHERE key = NEW.badge_key AND type = 'badge') THEN
        INSERT INTO member_cosmetics (user_id, cosmetic_key, earned_at, awarded_by)
        VALUES (NEW.user_id, NEW.badge_key, COALESCE(NEW.earned_at, now()), 'system')
        ON CONFLICT (user_id, cosmetic_key) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_badge_to_cosmetics ON member_badges;
CREATE TRIGGER trg_sync_badge_to_cosmetics
    AFTER INSERT ON member_badges
    FOR EACH ROW EXECUTE FUNCTION sync_badge_to_cosmetics();
