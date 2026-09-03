-- 106: Amenity voting config on events (§13.7 / §13.13)
-- Tallies aggregate from event_parties.amenity_vote_option_id where status = 'counted'

ALTER TABLE events
    ADD COLUMN IF NOT EXISTS amenity_voting JSONB NOT NULL DEFAULT '{"enabled":false,"options":[],"closes_at":null,"results_visible":"after_close"}'::jsonb;

COMMENT ON COLUMN events.amenity_voting IS 'Amenity vote config: enabled, options[], closes_at, results_visible (after_close|always|host_only)';
