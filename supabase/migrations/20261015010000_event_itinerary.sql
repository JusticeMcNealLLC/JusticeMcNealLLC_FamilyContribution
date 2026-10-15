-- Structured event itinerary calendar (creator-defined day/activity schedule).
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS itinerary JSONB NOT NULL DEFAULT '{"enabled": false, "days": []}'::jsonb;

COMMENT ON COLUMN events.itinerary IS
  'Creator itinerary calendar: {enabled, days:[{id,date,title,activities:[{id,title,details}]}]}';
