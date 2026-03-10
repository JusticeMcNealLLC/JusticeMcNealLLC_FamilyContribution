-- ─── Migration 041: Revoke founding_member badge from non-contributors ─────
-- The founding_member badge was previously awarded to anyone who joined during
-- the founding window, regardless of whether they ever activated a contribution.
-- This migration removes the badge from members who do NOT have an active or
-- trialing subscription so it is properly gated behind "Activate Your Contribution".
-- Members who activate a contribution in the future will re-earn it automatically
-- through the auto-detection engine on their next visit to the quests page.

DELETE FROM member_badges
WHERE badge_key = 'founding_member'
  AND user_id NOT IN (
      SELECT user_id
      FROM subscriptions
      WHERE status IN ('active', 'trialing')
  );

-- Also clear the displayed_badge on profiles where founding_member was the
-- displayed badge but the user no longer holds it.
UPDATE profiles
SET displayed_badge = NULL
WHERE displayed_badge = 'founding_member'
  AND id NOT IN (
      SELECT user_id
      FROM subscriptions
      WHERE status IN ('active', 'trialing')
  );
