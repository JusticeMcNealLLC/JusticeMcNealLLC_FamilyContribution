-- ═══════════════════════════════════════════════════════════
-- Migration 020: Add cover_gradient column to profiles
-- ═══════════════════════════════════════════════════════════

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cover_gradient text;

-- Default existing profiles that have no cover photo to the brand gradient
-- (No update needed — null means default gradient from CSS)
