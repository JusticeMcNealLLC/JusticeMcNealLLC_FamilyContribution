-- LLC transport method when LLC provides travel (car | plane)
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS transportation_method TEXT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'events_transportation_method_check'
  ) THEN
    ALTER TABLE events
      ADD CONSTRAINT events_transportation_method_check
      CHECK (transportation_method IS NULL OR transportation_method IN ('car', 'plane'));
  END IF;
END $$;

COMMENT ON COLUMN events.transportation_method IS
  'When transportation_mode is llc_provides: car | plane. Null when off, self-arranged, or legacy.';
