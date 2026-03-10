-- Migration 049: Add earned_banners array to profiles
-- Tracks all banner keys a user has been awarded (allows picking between owned banners)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS earned_banners TEXT[] DEFAULT '{}'::TEXT[];

-- Seed: any user who already has a cover_gradient has earned that banner
UPDATE profiles
SET earned_banners = ARRAY[cover_gradient]
WHERE cover_gradient IS NOT NULL
  AND (earned_banners IS NULL OR NOT (cover_gradient = ANY(earned_banners)));
