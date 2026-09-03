-- 107: Guest contact phone on event_guest_rsvps (§13.8 MVP)
-- Required at RSVP write time; normalized in edge functions.

ALTER TABLE event_guest_rsvps
    ADD COLUMN IF NOT EXISTS guest_phone TEXT NULL;

COMMENT ON COLUMN event_guest_rsvps.guest_phone IS 'Required contact phone for guest RSVPs (E.164 or raw; normalized at write)';
