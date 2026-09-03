-- Event disclaimer clauses (creator-configured; RSVP ack once per party)
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS disclaimers JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN events.disclaimers IS
  'Creator disclaimer clauses: [{id, title, body, required, is_default}] ordered array';
