-- =====================================================
-- Migration 083: Add username + phone to profiles
-- Phase 3 of Members Admin spec (members_001.md)
--
-- - username: optional, unique (case-insensitive), 3-20 chars
--   alphanumeric or underscore
-- - phone:    optional, free-form text (E.164 strongly
--   recommended but not enforced)
-- =====================================================

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS username TEXT,
    ADD COLUMN IF NOT EXISTS phone    TEXT;

COMMENT ON COLUMN public.profiles.username IS
    'Optional public handle, 3-20 chars [a-zA-Z0-9_], unique case-insensitive';
COMMENT ON COLUMN public.profiles.phone IS
    'Optional contact phone, E.164 recommended (e.g. +15551234567)';

-- Format constraint (only enforced when value is non-null)
ALTER TABLE public.profiles
    DROP CONSTRAINT IF EXISTS profiles_username_format_chk;
ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_username_format_chk
    CHECK (username IS NULL OR username ~ '^[A-Za-z0-9_]{3,20}$');

-- Case-insensitive uniqueness (NULLs are allowed and not unique)
DROP INDEX IF EXISTS public.profiles_username_lower_uniq;
CREATE UNIQUE INDEX profiles_username_lower_uniq
    ON public.profiles (LOWER(username))
    WHERE username IS NOT NULL;

-- Lookup index for phone (admin search)
CREATE INDEX IF NOT EXISTS profiles_phone_idx
    ON public.profiles (phone)
    WHERE phone IS NOT NULL;

-- =====================================================
-- DONE. RLS already permits the owner + admins to UPDATE
-- their profile (migrations 002, 012). Frontend will
-- expose these in the Settings tab of the Member modal
-- and in the Profile page.
-- =====================================================
