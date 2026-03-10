-- ─── Migration 043: contributor_required flag + badge_reward_key + housekeeping ─

-- 1. Add contributor_required column so individual quests can be DB-flagged
--    as requiring an active subscription without needing an auto_detect_key.
ALTER TABLE quests ADD COLUMN IF NOT EXISTS contributor_required boolean NOT NULL DEFAULT false;

-- 2. Add badge_reward_key column so the UI can show cosmetic badge rewards
--    directly on the quest detail card.
ALTER TABLE quests ADD COLUMN IF NOT EXISTS badge_reward_key text DEFAULT NULL;

-- 3. Mark fidelity-category quests and "Refer a Family Member" as contributor-only.
UPDATE quests SET contributor_required = true
WHERE title IN (
    'Open Fidelity Account',
    'Apply for Fidelity Card',
    'Link Cashback to LLC',
    'Refer a Family Member'
);

-- 4. Deactivate "Credit Score Check-In" — soft delete so existing member_quest
--    rows are preserved but it no longer appears in the app.
UPDATE quests SET is_active = false
WHERE title = 'Credit Score Check-In';

-- 5. Assign badge rewards to quests that unlock a cosmetic badge.
UPDATE quests SET badge_reward_key = 'shutterbug'     WHERE auto_detect_key = 'upload_photo';
UPDATE quests SET badge_reward_key = 'streak_master'  WHERE auto_detect_key = 'streak_6';
-- The "Activate Your Contribution" quest unlocks the founding_member badge for
-- members who joined during the founding window (logic lives in auto-detection).
UPDATE quests SET badge_reward_key = 'founding_member' WHERE auto_detect_key = 'activate_subscription';
-- Linking cashback to the LLC unlocks the fidelity_linked badge.
UPDATE quests SET badge_reward_key = 'fidelity_linked' WHERE title = 'Link Cashback to LLC';
