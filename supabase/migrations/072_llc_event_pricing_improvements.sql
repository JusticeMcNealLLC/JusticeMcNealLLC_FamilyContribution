-- ══════════════════════════════════════════════════════════
-- Migration 072 — LLC Event Pricing Improvements
-- 1. show_cost_breakdown toggle (hide/show breakdown to attendees)
-- ══════════════════════════════════════════════════════════

-- Add toggle to control whether cost breakdown is visible to attendees
-- Default TRUE so existing LLC events continue showing their breakdown
ALTER TABLE events
    ADD COLUMN IF NOT EXISTS show_cost_breakdown BOOLEAN DEFAULT TRUE;

-- Backfill: all existing events keep breakdown visible
UPDATE events SET show_cost_breakdown = TRUE WHERE show_cost_breakdown IS NULL;
