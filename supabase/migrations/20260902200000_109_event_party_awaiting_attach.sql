-- 109: Flow E — awaiting_attach party status + guest attach_requested
-- Spec: §13.9 Flow E (guest form first → payer Add guest)

ALTER TABLE event_parties
    DROP CONSTRAINT IF EXISTS event_parties_status_check;

ALTER TABLE event_parties
    ADD CONSTRAINT event_parties_status_check
    CHECK (status IN ('draft', 'pending_payment', 'active', 'cancelled', 'awaiting_attach'));

ALTER TABLE event_guest_rsvps
    ADD COLUMN IF NOT EXISTS attach_requested BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_event_guest_rsvps_attach_requested
    ON event_guest_rsvps(event_id)
    WHERE attach_requested = true;

CREATE INDEX IF NOT EXISTS idx_event_parties_awaiting_attach
    ON event_parties(event_id)
    WHERE status = 'awaiting_attach';

COMMENT ON COLUMN event_guest_rsvps.attach_requested IS
    'Flow E: guest asked someone else to pay; party status awaiting_attach is source of truth';
COMMENT ON CONSTRAINT event_parties_status_check ON event_parties IS
    'Includes awaiting_attach for Flow E pending guest parties';
