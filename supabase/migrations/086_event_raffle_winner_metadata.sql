-- ============================================================
-- 086: Events — raffle winner metadata for categorized prizes
-- Adds durable category/item assignment fields to winners while
-- keeping prize_description as the backwards-compatible display text.
-- ============================================================

ALTER TABLE event_raffle_winners
    ADD COLUMN IF NOT EXISTS prize_id TEXT NULL,
    ADD COLUMN IF NOT EXISTS category_id TEXT NULL,
    ADD COLUMN IF NOT EXISTS category_label TEXT NULL,
    ADD COLUMN IF NOT EXISTS draw_mode TEXT NULL,
    ADD COLUMN IF NOT EXISTS prize_image_url TEXT NULL,
    ADD COLUMN IF NOT EXISTS prize_emoji TEXT NULL,
    ADD COLUMN IF NOT EXISTS selection_status TEXT DEFAULT 'assigned';

ALTER TABLE event_raffle_winners
    DROP CONSTRAINT IF EXISTS event_raffle_winners_selection_status_check;

ALTER TABLE event_raffle_winners
    ADD CONSTRAINT event_raffle_winners_selection_status_check
    CHECK (selection_status IN ('assigned', 'pending_choice', 'claimed'));

CREATE INDEX IF NOT EXISTS idx_raffle_winners_event_category
    ON event_raffle_winners(event_id, category_id);

CREATE INDEX IF NOT EXISTS idx_raffle_winners_event_prize
    ON event_raffle_winners(event_id, prize_id);