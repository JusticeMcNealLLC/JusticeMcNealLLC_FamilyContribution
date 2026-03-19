-- ─── Migration 071: Add UPDATE policy for push_subscriptions ────────────
-- The upsert (ON CONFLICT ... DO UPDATE) needs an UPDATE policy.
-- Previously only SELECT, INSERT, DELETE policies existed, causing a
-- 42501 RLS violation on re-login / subscription refresh.
-- ────────────────────────────────────────────────────────────────────────

CREATE POLICY push_subs_update ON push_subscriptions
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK  (auth.uid() = user_id);
