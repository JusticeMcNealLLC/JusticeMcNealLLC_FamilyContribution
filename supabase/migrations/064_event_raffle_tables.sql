-- ============================================================
-- 064: Events — Phase 5A-1b (Paid RSVP + Raffle System)
-- Tables: event_raffle_entries, event_raffle_winners
-- Also adds: category column to events
-- ============================================================

-- ── Add missing category column ─────────────────────────
ALTER TABLE events ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'other';

-- ── Raffle entries ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_raffle_entries (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id                 UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id                  UUID REFERENCES profiles(id) NULL,
    guest_token              TEXT NULL,
    paid                     BOOLEAN DEFAULT FALSE,
    stripe_payment_intent_id TEXT,
    amount_paid_cents        INT DEFAULT 0,
    created_at               TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, user_id),
    UNIQUE(event_id, guest_token)
);

-- ── Raffle winners ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_raffle_winners (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id          UUID REFERENCES events(id) ON DELETE CASCADE,
    place             INT NOT NULL,
    user_id           UUID REFERENCES profiles(id) NULL,
    guest_token       TEXT NULL,
    prize_description TEXT,
    drawn_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, place)
);

-- ── Indexes ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_raffle_entries_event ON event_raffle_entries(event_id);
CREATE INDEX IF NOT EXISTS idx_raffle_entries_user ON event_raffle_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_raffle_winners_event ON event_raffle_winners(event_id);

-- ── RLS ─────────────────────────────────────────────────
ALTER TABLE event_raffle_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_raffle_winners ENABLE ROW LEVEL SECURITY;

-- Raffle entries: authenticated users can read all, insert own
CREATE POLICY "raffle_entries_select" ON event_raffle_entries FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "raffle_entries_insert_own" ON event_raffle_entries FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "raffle_entries_delete_admin" ON event_raffle_entries FOR DELETE
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Raffle winners: anyone authenticated can read, admins can insert/manage
CREATE POLICY "raffle_winners_select" ON event_raffle_winners FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "raffle_winners_insert_admin" ON event_raffle_winners FOR INSERT
    WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
        OR EXISTS (
            SELECT 1 FROM events WHERE id = event_id AND created_by = auth.uid()
        )
    );

CREATE POLICY "raffle_winners_delete_admin" ON event_raffle_winners FOR DELETE
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ── Allow service role webhook to insert RSVPs (paid) ───
-- The webhook uses service_role key which bypasses RLS,
-- so no additional policy is needed for webhook writes.
