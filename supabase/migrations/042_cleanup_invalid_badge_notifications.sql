-- ─── Migration 042: Clean up stale founding_member badge notifications ───────
-- The notify_badge_earned DB trigger inserted "You earned the Founding Member
-- badge!" into the notifications table the moment the badge was first awarded.
-- Migration 041 revoked the badge from non-contributors, but the notification
-- rows were never removed.  This migration deletes those stale notifications for
-- any user who does not hold an active or trialing subscription.

DELETE FROM notifications
WHERE type = 'badge'
  AND message ILIKE '%Founding Member%'
  AND user_id NOT IN (
      SELECT user_id
      FROM subscriptions
      WHERE status IN ('active', 'trialing')
  );
