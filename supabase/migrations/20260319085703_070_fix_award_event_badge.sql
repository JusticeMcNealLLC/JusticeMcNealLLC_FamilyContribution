-- ═══════════════════════════════════════════════════════════════
-- Migration 070 — Fix award_event_badge function
-- member_badges has no 'awarded_by' column; only member_cosmetics does
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION award_event_badge(p_user_id UUID, p_badge_key TEXT)
RETURNS VOID AS $$
BEGIN
    -- Insert into member_badges table (no awarded_by column)
    INSERT INTO member_badges (user_id, badge_key)
    VALUES (p_user_id, p_badge_key)
    ON CONFLICT (user_id, badge_key) DO NOTHING;

    -- Insert into unified member_cosmetics table (has awarded_by)
    INSERT INTO member_cosmetics (user_id, cosmetic_key, awarded_by)
    VALUES (p_user_id, p_badge_key, 'system')
    ON CONFLICT (user_id, cosmetic_key) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
