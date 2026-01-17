-- =====================================================
-- FIX: Update trigger function to use fully qualified table name
-- The trigger runs in auth schema context, so we need public.profiles
-- =====================================================

-- Drop the existing trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate the function with explicit schema reference
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, role, is_active)
    VALUES (
        NEW.id,
        NEW.email,
        'member',
        true
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- DONE! Now try creating a user again.
-- =====================================================
