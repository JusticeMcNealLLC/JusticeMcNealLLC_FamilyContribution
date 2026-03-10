-- 037_profiles_member_read.sql
-- Allow any active member to read all active profiles.
-- Without this, regular members could only read their own profile row,
-- which prevents the family tree from building the personMap and resolving edges.

-- Security-definer helper (bypasses RLS so no recursion)
CREATE OR REPLACE FUNCTION public.is_active_member()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND is_active = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant active members SELECT on all profiles rows
-- (Postgres ORs multiple FOR SELECT policies, so own-profile + admin policies still apply)
DO $pol$ BEGIN
  CREATE POLICY "active members read all profiles"
    ON public.profiles FOR SELECT
    USING (public.is_active_member());
EXCEPTION WHEN duplicate_object THEN NULL; END $pol$;
