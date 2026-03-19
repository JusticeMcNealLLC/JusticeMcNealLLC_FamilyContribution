-- Migration 062: Add Lottie X/Y position offset columns to cosmetics
-- Allows admin to reposition the Lottie overlay on banners

ALTER TABLE cosmetics ADD COLUMN IF NOT EXISTS lottie_x INTEGER DEFAULT 0;
ALTER TABLE cosmetics ADD COLUMN IF NOT EXISTS lottie_y INTEGER DEFAULT 0;
