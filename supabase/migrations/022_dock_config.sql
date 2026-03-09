-- Migration 022: Add dock_config column to profiles for customizable mobile nav dock
-- Stores which pages the member has placed in dock slots 2 and 4
-- Format: { "2": { "page": "quests", "href": "quests.html", "label": "Quests", "icon": "..." }, "4": { ... } }

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS dock_config jsonb DEFAULT NULL;

-- Allow members to read/update their own dock config (already covered by existing profile RLS policies)
