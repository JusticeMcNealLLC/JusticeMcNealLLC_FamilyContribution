-- ============================================================
-- 085: Admin-controlled featured event for portal hero banner
--
-- Adds is_featured BOOLEAN to events table.
-- A DB trigger enforces only one event can be featured at a time:
-- when any event is set to is_featured = TRUE, all other events
-- are automatically set to is_featured = FALSE.
--
-- Admin UI: manage sheet Overview tab toggle (events_006).
-- Portal consumer: _pickHero() in js/portal/events/list.js.
-- ============================================================

-- 1. Add column (idempotent)
ALTER TABLE events
    ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Partial index — fast lookup of the single featured event
CREATE INDEX IF NOT EXISTS idx_events_featured
    ON events (is_featured)
    WHERE is_featured = TRUE;

-- 3. Trigger function: enforce one-featured-at-a-time
--    Fires BEFORE UPDATE on any row where is_featured is being set to TRUE.
--    Clears is_featured on all other rows atomically in the same transaction.
CREATE OR REPLACE FUNCTION fn_single_featured_event()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.is_featured = TRUE AND (OLD.is_featured IS DISTINCT FROM TRUE) THEN
        UPDATE events
           SET is_featured = FALSE
         WHERE is_featured = TRUE
           AND id <> NEW.id;
    END IF;
    RETURN NEW;
END;
$$;

-- 4. Attach trigger to events table
DROP TRIGGER IF EXISTS trg_single_featured_event ON events;
CREATE TRIGGER trg_single_featured_event
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION fn_single_featured_event();
