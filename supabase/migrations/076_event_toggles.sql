-- Add toggle columns to events table for RSVP, QR check-in, and transportation
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='rsvp_enabled') THEN
        ALTER TABLE events ADD COLUMN rsvp_enabled BOOLEAN DEFAULT TRUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='checkin_enabled') THEN
        ALTER TABLE events ADD COLUMN checkin_enabled BOOLEAN DEFAULT TRUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='transportation_enabled') THEN
        ALTER TABLE events ADD COLUMN transportation_enabled BOOLEAN DEFAULT TRUE;
    END IF;
END $$;
