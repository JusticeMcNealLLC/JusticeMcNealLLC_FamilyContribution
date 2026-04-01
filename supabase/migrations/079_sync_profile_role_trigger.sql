-- ============================================================
-- 079: Sync profiles.role via trigger on member_roles (PA-RM-01, Step 2)
-- Keeps profiles.role column in sync so is_admin() + all existing
-- RLS policies continue to work during the permission transition.
-- ============================================================

-- ── 1. Trigger Function ─────────────────────────────────────
-- Fires AFTER INSERT or DELETE on member_roles.
-- Checks if the affected user now holds any role with
-- the 'admin.dashboard' permission → sets profiles.role accordingly.

CREATE OR REPLACE FUNCTION public.sync_profile_role()
RETURNS TRIGGER AS $$
DECLARE
    target_uid UUID;
    has_admin  BOOLEAN;
BEGIN
    -- Determine which user was affected
    IF TG_OP = 'DELETE' THEN
        target_uid := OLD.user_id;
    ELSE
        target_uid := NEW.user_id;
    END IF;

    -- Does this user now have any role with admin.dashboard?
    SELECT EXISTS (
        SELECT 1
        FROM public.member_roles mr
        JOIN public.role_permissions rp ON rp.role_id = mr.role_id
        WHERE mr.user_id = target_uid
          AND rp.permission = 'admin.dashboard'
    ) INTO has_admin;

    -- Keep profiles.role in sync
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

-- ── 2. Attach Trigger ───────────────────────────────────────

DROP TRIGGER IF EXISTS trg_sync_profile_role ON member_roles;
CREATE TRIGGER trg_sync_profile_role
    AFTER INSERT OR DELETE ON member_roles
    FOR EACH ROW EXECUTE FUNCTION public.sync_profile_role();
