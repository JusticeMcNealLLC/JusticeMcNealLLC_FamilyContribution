-- ============================================================
-- 081: Fix events RLS — allow events.create for INSERT
--
-- Problem: events INSERT policy only checked events.manage_all,
-- making the events.create permission orphaned.  Users with
-- events.create (but not manage_all) could never create events.
--
-- This also re-applies the events UPDATE/DELETE policies with
-- has_permission() so the fix works regardless of whether
-- migration 080 was previously applied.
--
-- Includes the sync trigger from 079 (idempotent) to ensure
-- profiles.role stays in sync for any remaining legacy checks.
-- ============================================================

-- ── 1. Sync Trigger (idempotent, from 079) ─────────────────
-- Keeps profiles.role = 'admin'/'member' in sync with RBAC roles.

CREATE OR REPLACE FUNCTION public.sync_profile_role()
RETURNS TRIGGER AS $$
DECLARE
    target_uid UUID;
    has_admin  BOOLEAN;
BEGIN
    IF TG_OP = 'DELETE' THEN
        target_uid := OLD.user_id;
    ELSE
        target_uid := NEW.user_id;
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM public.member_roles mr
        JOIN public.role_permissions rp ON rp.role_id = mr.role_id
        WHERE mr.user_id = target_uid
          AND rp.permission = 'admin.dashboard'
    ) INTO has_admin;

    UPDATE public.profiles
    SET role = CASE WHEN has_admin THEN 'admin' ELSE 'member' END
    WHERE id = target_uid;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_sync_profile_role ON member_roles;
CREATE TRIGGER trg_sync_profile_role
    AFTER INSERT OR DELETE ON member_roles
    FOR EACH ROW EXECUTE FUNCTION public.sync_profile_role();

-- ── 2. Back-fill profiles.role for existing role assignments ─
-- If the sync trigger wasn't running before, existing non-owner
-- users with admin.dashboard permission still have role = 'member'.
-- This one-time UPDATE fixes that.

UPDATE public.profiles p
SET role = 'admin'
WHERE p.role != 'admin'
  AND EXISTS (
      SELECT 1
      FROM public.member_roles mr
      JOIN public.role_permissions rp ON rp.role_id = mr.role_id
      WHERE mr.user_id = p.id
        AND rp.permission = 'admin.dashboard'
  );

-- ── 3. Fix events INSERT policy ─────────────────────────────
-- Now accepts events.create (create new events) OR
-- events.manage_all (full event admin).

DROP POLICY IF EXISTS "events_insert_admin" ON events;
CREATE POLICY "events_insert_admin" ON events
    FOR INSERT WITH CHECK (
        public.has_permission('events.create')
        OR public.has_permission('events.manage_all')
    );

-- ── 4. Ensure UPDATE/DELETE use has_permission() ────────────
-- Safe to re-run — DROP IF EXISTS handles both old and new policies.

DROP POLICY IF EXISTS "events_update_admin" ON events;
CREATE POLICY "events_update_admin" ON events
    FOR UPDATE USING (public.has_permission('events.manage_all'));

DROP POLICY IF EXISTS "events_delete_admin" ON events;
CREATE POLICY "events_delete_admin" ON events
    FOR DELETE USING (public.has_permission('events.manage_all'));
