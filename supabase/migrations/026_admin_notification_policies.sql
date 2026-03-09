-- ─── Migration 026: Admin Notification Policies ─────────────────────
-- Allow admins to read all push_subscriptions and notifications
-- for the admin notifications management page.
-- ──────────────────────────────────────────────────────────────────────

-- Admin can read all push subscriptions
CREATE POLICY push_admin_select
    ON push_subscriptions FOR SELECT
    USING (public.is_admin());

-- Admin can read all notifications
CREATE POLICY notif_admin_select
    ON notifications FOR SELECT
    USING (public.is_admin());

-- Admin can insert notifications (for test sends)
CREATE POLICY notif_admin_insert
    ON notifications FOR INSERT
    WITH CHECK (public.is_admin());
