-- Add location_nickname column to events table
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS location_nickname text;
