-- Migration 031: Leadership Titles for Meet the Team (Phase 3A)
-- Adds title column to profiles for leadership roles

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS title TEXT DEFAULT NULL;

COMMENT ON COLUMN profiles.title IS 'Leadership title: President, Vice President, Treasurer, Secretary, etc.';
