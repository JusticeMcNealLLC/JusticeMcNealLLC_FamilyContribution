-- 105: Allow multiple winners at the same place (tie-breaker splits)

ALTER TABLE competition_winners DROP CONSTRAINT IF EXISTS competition_winners_event_id_place_key;

CREATE UNIQUE INDEX IF NOT EXISTS competition_winners_event_entry_unique
    ON competition_winners (event_id, entry_id);

COMMENT ON INDEX competition_winners_event_entry_unique IS
  'Each entry wins at most once; multiple entries may share the same place when tied';
