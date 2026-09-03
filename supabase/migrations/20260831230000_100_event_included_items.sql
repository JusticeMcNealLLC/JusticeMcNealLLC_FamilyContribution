-- Included catalog on events (creator-defined RSVP option items)
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS included_items JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN events.included_items IS
  'Creator included catalog: [{id, name, required, option_type, choices}] ordered array';
