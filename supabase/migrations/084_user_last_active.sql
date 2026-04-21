-- =====================================================
-- Migration 084: Expose auth metadata to admins
-- Phase 3 of Members Admin spec (members_001.md)
--
-- Provides admins with:
--   - last_sign_in_at  (for "Last Active" display + sort)
--   - email_confirmed_at (to distinguish invited_unconfirmed
--     from pending-but-confirmed members)
--
-- auth.users is not exposed via PostgREST. We expose a
-- SECURITY DEFINER function that bounces through is_admin().
-- =====================================================

CREATE OR REPLACE FUNCTION public.admin_user_auth_meta()
RETURNS TABLE (
    user_id            UUID,
    last_sign_in_at    TIMESTAMPTZ,
    email_confirmed_at TIMESTAMPTZ,
    user_created_at    TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
STABLE
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'admin_user_auth_meta: not authorized';
    END IF;

    RETURN QUERY
    SELECT u.id            AS user_id,
           u.last_sign_in_at,
           u.email_confirmed_at,
           u.created_at    AS user_created_at
      FROM auth.users u;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_user_auth_meta() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_user_auth_meta() TO authenticated;

COMMENT ON FUNCTION public.admin_user_auth_meta() IS
    'Admin-only. Returns auth metadata (last_sign_in_at, email_confirmed_at, created_at) for every user. Used by the Members admin page for status derivation, attention flags, and "Last Active" sorting.';

-- =====================================================
-- DONE. From the client:
--   const { data, error } = await supabase
--       .rpc('admin_user_auth_meta');
-- =====================================================
