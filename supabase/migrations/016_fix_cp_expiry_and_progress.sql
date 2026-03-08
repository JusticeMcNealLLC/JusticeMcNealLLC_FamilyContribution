-- ══════════════════════════════════════════════════════════════
-- Migration 016 — Fix CP Expiry + Quest Progress Support
--
-- Problems fixed:
--   1. One-time quest CP (e.g. "Upload Photo") expires after 90 days.
--      Those should be PERMANENT — only recurring monthly CP should roll.
--   2. No quest progress tracking metadata for streak / recurring quests.
--
-- Changes:
--   • Backfill: set expires_at to far-future for all one-time / per_event quest CP
--   • Update autoCompleteQuest flow guidance (handled in JS)
--   • Add progress_current / progress_target columns to member_quests
--   • Update get_member_cp_balance to still honor expires_at
-- ══════════════════════════════════════════════════════════════

-- ─── 1. Backfill: Make one-time & per_event quest CP permanent ────
-- Set expires_at far in the future for CP earned from one_time or per_event quests
UPDATE credit_points_log cpl
SET expires_at = '9999-12-31T00:00:00Z'::timestamptz
FROM member_quests mq
JOIN quests q ON mq.quest_id = q.id
WHERE cpl.member_quest_id = mq.id
  AND q.quest_type IN ('one_time', 'per_event');

-- ─── 2. Add progress columns to member_quests ────────────────
-- progress_current: how many units done (e.g. 2 months of a 3-month streak)
-- progress_target:  total units needed (e.g. 3 for a 3-month streak)
ALTER TABLE member_quests ADD COLUMN IF NOT EXISTS progress_current integer DEFAULT 0;
ALTER TABLE member_quests ADD COLUMN IF NOT EXISTS progress_target integer DEFAULT 0;
-- Optional: a human-readable progress note (e.g. "Next payment: Apr 1, 2026")
ALTER TABLE member_quests ADD COLUMN IF NOT EXISTS progress_note text;

-- ─── 3. get_member_cp_balance stays the same ─────────────────
-- It already filters on `expires_at > now()`.
-- Since permanent CP has expires_at = '9999-12-31', they'll always be counted.
-- No function change needed!
