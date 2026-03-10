-- Migration 030: Badge Highlights
-- Adds highlighted_badges column to profiles for the 3-badge showcase on profile banner

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS highlighted_badges TEXT[] DEFAULT '{}';

-- Allow members to update their own highlighted_badges
-- (existing RLS policies already allow update on own profile row)
