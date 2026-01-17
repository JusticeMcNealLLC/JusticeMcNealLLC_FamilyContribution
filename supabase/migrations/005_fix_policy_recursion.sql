-- =====================================================
-- FIX: Infinite recursion in RLS policies
-- The admin check was querying profiles which triggered itself
-- Solution: Use a security definer function to check admin status
-- =====================================================

-- Create a function to check if user is admin (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can read all subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Admins can read all invoices" ON invoices;

-- Recreate policies using the function
CREATE POLICY "Admins can read all profiles"
    ON profiles FOR SELECT
    USING (public.is_admin());

CREATE POLICY "Admins can read all subscriptions"
    ON subscriptions FOR SELECT
    USING (public.is_admin());

CREATE POLICY "Admins can read all invoices"
    ON invoices FOR SELECT
    USING (public.is_admin());

-- =====================================================
-- DONE! The recursion issue should now be fixed.
-- =====================================================
