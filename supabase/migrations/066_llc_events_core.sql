-- ════════════════════════════════════════════════════════════
-- Migration 066 — LLC Events (Core) — Phase 5A-2
-- Tables: event_cost_items, event_waitlist, event_refunds
-- Columns: cost_breakdown JSONB summary, rescheduled fields, etc.
-- ════════════════════════════════════════════════════════════

-- ── New columns on events table ─────────────────────────

-- Cost breakdown summary (cached totals for display)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='cost_breakdown') THEN
        ALTER TABLE events ADD COLUMN cost_breakdown JSONB;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='non_refundable_expenses_cents') THEN
        ALTER TABLE events ADD COLUMN non_refundable_expenses_cents INT DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='rescheduled_at') THEN
        ALTER TABLE events ADD COLUMN rescheduled_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='grace_window_end') THEN
        ALTER TABLE events ADD COLUMN grace_window_end TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='original_start_date') THEN
        ALTER TABLE events ADD COLUMN original_start_date TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='cancellation_note') THEN
        ALTER TABLE events ADD COLUMN cancellation_note TEXT;
    END IF;
    -- invest_eligible_acknowledged tracked per-RSVP, not at event level (invest_eligible flag already exists)
END $$;

-- Add invest_eligible_acknowledged to event_rsvps
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event_rsvps' AND column_name='invest_eligible_acknowledged') THEN
        ALTER TABLE event_rsvps ADD COLUMN invest_eligible_acknowledged BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event_rsvps' AND column_name='invest_eligible_acknowledged_at') THEN
        ALTER TABLE event_rsvps ADD COLUMN invest_eligible_acknowledged_at TIMESTAMPTZ;
    END IF;
    -- Grace window refund tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event_rsvps' AND column_name='grace_refund_eligible') THEN
        ALTER TABLE event_rsvps ADD COLUMN grace_refund_eligible BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- ── Cost Breakdown Line Items ───────────────────────────

CREATE TABLE IF NOT EXISTS event_cost_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    category        TEXT NOT NULL CHECK (category IN ('lodging','transportation','food','gear','entertainment','other')),
    total_cost_cents INT NOT NULL DEFAULT 0,
    included_in_buyin BOOLEAN DEFAULT TRUE,
    avg_per_person_cents INT DEFAULT 0,
    notes           TEXT,
    sort_order      INT DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cost_items_event ON event_cost_items(event_id);

ALTER TABLE event_cost_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY cost_items_select_auth ON event_cost_items
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY cost_items_select_anon ON event_cost_items
    FOR SELECT USING (auth.role() = 'anon');

CREATE POLICY cost_items_insert_admin ON event_cost_items
    FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY cost_items_update_admin ON event_cost_items
    FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY cost_items_delete_admin ON event_cost_items
    FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY cost_items_service ON event_cost_items
    FOR ALL USING (auth.role() = 'service_role');

-- ── Waitlist ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS event_waitlist (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES profiles(id),
    position        INT NOT NULL,
    status          TEXT DEFAULT 'waiting' CHECK (status IN ('waiting','offered','expired','claimed','removed')),
    offered_at      TIMESTAMPTZ,
    offer_expires_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_waitlist_event ON event_waitlist(event_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_event_status ON event_waitlist(event_id, status);

ALTER TABLE event_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY waitlist_select_auth ON event_waitlist
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY waitlist_insert_own ON event_waitlist
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY waitlist_update_own ON event_waitlist
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY waitlist_delete_own ON event_waitlist
    FOR DELETE USING (user_id = auth.uid());

CREATE POLICY waitlist_admin_all ON event_waitlist
    FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY waitlist_service ON event_waitlist
    FOR ALL USING (auth.role() = 'service_role');

-- ── Refunds ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS event_refunds (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id                UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id                 UUID REFERENCES profiles(id),
    guest_email             TEXT,
    original_amount_cents   INT NOT NULL,
    refund_amount_cents     INT NOT NULL,
    deduction_cents         INT DEFAULT 0,
    reason                  TEXT NOT NULL CHECK (reason IN ('event_cancelled','min_not_met','reschedule_grace','manual','admin_override')),
    stripe_refund_id        TEXT,
    stripe_payment_intent_id TEXT,
    status                  TEXT DEFAULT 'pending' CHECK (status IN ('pending','processed','failed')),
    notes                   TEXT,
    processed_at            TIMESTAMPTZ,
    created_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refunds_event ON event_refunds(event_id);
CREATE INDEX IF NOT EXISTS idx_refunds_user ON event_refunds(user_id);

ALTER TABLE event_refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY refunds_select_own ON event_refunds
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY refunds_select_admin ON event_refunds
    FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY refunds_service ON event_refunds
    FOR ALL USING (auth.role() = 'service_role');

-- ── Category column on events (idempotent) ──────────────
-- Already added in 064, but ensure it exists
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='category') THEN
        ALTER TABLE events ADD COLUMN category TEXT;
    END IF;
END $$;
