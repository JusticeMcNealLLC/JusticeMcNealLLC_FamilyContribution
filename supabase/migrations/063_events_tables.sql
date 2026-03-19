-- ============================================================
-- 063: Events System — Phase 5A-1a (Free Events + QR Check-In)
-- Tables: events, event_rsvps, event_checkins, event_hosts
-- ============================================================

-- Core event record
CREATE TABLE IF NOT EXISTS events (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by        UUID REFERENCES profiles(id),
    event_type        TEXT NOT NULL CHECK (event_type IN ('llc', 'member', 'competition')),
    title             TEXT NOT NULL,
    slug              TEXT UNIQUE NOT NULL,
    description       TEXT,
    gated_notes       TEXT,
    banner_url        TEXT,
    start_date        TIMESTAMPTZ NOT NULL,
    end_date          TIMESTAMPTZ,
    timezone          TEXT DEFAULT 'America/New_York',
    location_text     TEXT,
    location_lat      FLOAT,
    location_lng      FLOAT,
    max_participants  INT,
    min_participants  INT,
    status            TEXT DEFAULT 'draft' CHECK (status IN ('draft','open','confirmed','active','completed','cancelled')),
    rsvp_deadline     TIMESTAMPTZ,

    -- Visibility & pricing
    member_only       BOOLEAN DEFAULT FALSE,
    pricing_mode      TEXT DEFAULT 'free' CHECK (pricing_mode IN ('free','paid','free_paid_raffle')),
    rsvp_cost_cents   INT DEFAULT 0,
    raffle_entry_cost_cents INT DEFAULT 0,

    -- Info gating
    gate_time         BOOLEAN DEFAULT FALSE,
    gate_location     BOOLEAN DEFAULT FALSE,
    gate_notes        BOOLEAN DEFAULT FALSE,

    -- Check-in mode
    checkin_mode      TEXT DEFAULT 'attendee_ticket' CHECK (checkin_mode IN ('attendee_ticket','venue_scan')),
    venue_qr_token    TEXT UNIQUE,

    -- LLC-specific (Phase 5A-2)
    llc_cut_pct       FLOAT DEFAULT 0,
    invest_eligible   BOOLEAN DEFAULT FALSE,
    location_required BOOLEAN DEFAULT FALSE,
    cost_breakdown_locked BOOLEAN DEFAULT FALSE,

    -- Raffle / giveaway (Phase 5A-1b)
    raffle_enabled    BOOLEAN DEFAULT FALSE,
    raffle_type       TEXT CHECK (raffle_type IN ('digital','physical')),
    raffle_draw_trigger TEXT DEFAULT 'manual' CHECK (raffle_draw_trigger IN ('manual','auto')),
    raffle_prizes     JSONB,

    -- Competition (Phase 5A-4)
    winner_tier_config JSONB,

    created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- RSVPs (members)
CREATE TABLE IF NOT EXISTS event_rsvps (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id                    UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id                     UUID REFERENCES profiles(id),
    status                      TEXT DEFAULT 'going' CHECK (status IN ('going','maybe','not_going')),
    paid                        BOOLEAN DEFAULT FALSE,
    stripe_payment_intent_id    TEXT,
    amount_paid_cents           INT DEFAULT 0,
    refunded                    BOOLEAN DEFAULT FALSE,
    refund_amount_cents         INT DEFAULT 0,
    accepted_no_refund_policy   BOOLEAN DEFAULT FALSE,
    accepted_no_refund_at       TIMESTAMPTZ,
    qr_token                    TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
    created_at                  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- Check-ins (QR scan attendance)
CREATE TABLE IF NOT EXISTS event_checkins (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES profiles(id) NULL,
    guest_token     TEXT NULL,
    checked_in_by   UUID REFERENCES profiles(id) NULL,
    checkin_mode    TEXT DEFAULT 'attendee_ticket' CHECK (checkin_mode IN ('attendee_ticket','venue_scan')),
    checked_in_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Add unique constraints separately so we can use WHERE clauses
CREATE UNIQUE INDEX IF NOT EXISTS event_checkins_user_uniq ON event_checkins(event_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS event_checkins_guest_uniq ON event_checkins(event_id, guest_token) WHERE guest_token IS NOT NULL;

-- Co-hosts / sub-coordinators
CREATE TABLE IF NOT EXISTS event_hosts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id    UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id     UUID REFERENCES profiles(id),
    role        TEXT DEFAULT 'checkin_staff' CHECK (role IN ('checkin_staff','co_host')),
    granted_by  UUID REFERENCES profiles(id),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_slug ON events(slug);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_event ON event_rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_user ON event_rsvps(user_id);
CREATE INDEX IF NOT EXISTS idx_event_checkins_event ON event_checkins(event_id);
CREATE INDEX IF NOT EXISTS idx_event_hosts_event ON event_hosts(event_id);

-- ── RLS Policies ────────────────────────────────────────

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_hosts ENABLE ROW LEVEL SECURITY;

-- Events: anyone can read published events, admins can do everything
CREATE POLICY "events_select_published" ON events FOR SELECT
    USING (status != 'draft' OR created_by = auth.uid());

CREATE POLICY "events_insert_admin" ON events FOR INSERT
    WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "events_update_admin" ON events FOR UPDATE
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "events_delete_admin" ON events FOR DELETE
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- RSVPs: users can manage their own, readable by authenticated users
CREATE POLICY "rsvps_select_auth" ON event_rsvps FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "rsvps_insert_own" ON event_rsvps FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "rsvps_update_own" ON event_rsvps FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "rsvps_delete_own" ON event_rsvps FOR DELETE
    USING (user_id = auth.uid());

-- Check-ins: readable by authenticated, writable by event creator/hosts/admins
CREATE POLICY "checkins_select_auth" ON event_checkins FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "checkins_insert_host" ON event_checkins FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM events WHERE id = event_id AND created_by = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM event_hosts WHERE event_id = event_checkins.event_id AND user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
        -- venue_scan: user checks themselves in
        OR user_id = auth.uid()
    );

-- Hosts: readable by auth, managed by event creator/admin
CREATE POLICY "hosts_select_auth" ON event_hosts FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "hosts_insert_creator" ON event_hosts FOR INSERT
    WITH CHECK (
        EXISTS (SELECT 1 FROM events WHERE id = event_id AND created_by = auth.uid())
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "hosts_delete_creator" ON event_hosts FOR DELETE
    USING (
        EXISTS (SELECT 1 FROM events WHERE id = event_id AND created_by = auth.uid())
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ── Storage Bucket for Event Banners ─────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('event-banners', 'event-banners', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "event_banners_read" ON storage.objects FOR SELECT
    USING (bucket_id = 'event-banners');

CREATE POLICY "event_banners_upload" ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'event-banners'
        AND auth.uid() IS NOT NULL
        AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "event_banners_delete" ON storage.objects FOR DELETE
    USING (
        bucket_id = 'event-banners'
        AND auth.uid() IS NOT NULL
        AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );
