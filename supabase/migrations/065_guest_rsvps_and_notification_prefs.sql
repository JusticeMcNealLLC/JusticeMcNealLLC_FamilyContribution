-- ════════════════════════════════════════════════════════════
-- Migration 065 — Guest RSVPs + Notification Preferences
-- Phase 5A-1c: Public guest flow + event notification prefs
-- ════════════════════════════════════════════════════════════

-- ── Guest RSVPs (non-member public event attendees) ─────
CREATE TABLE IF NOT EXISTS event_guest_rsvps (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id            UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    guest_name          TEXT NOT NULL,
    guest_email         TEXT NOT NULL,
    guest_token         TEXT UNIQUE NOT NULL,     -- unique token for QR code + check-in + ticket retrieval
    status              TEXT DEFAULT 'going',
    paid                BOOLEAN DEFAULT FALSE,
    stripe_payment_intent_id TEXT,
    amount_paid_cents   INT DEFAULT 0,
    accepted_no_refund_policy BOOLEAN DEFAULT FALSE,
    accepted_no_refund_at     TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, guest_email)
);

CREATE INDEX IF NOT EXISTS idx_guest_rsvps_event ON event_guest_rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_guest_rsvps_token ON event_guest_rsvps(guest_token);
CREATE INDEX IF NOT EXISTS idx_guest_rsvps_email ON event_guest_rsvps(guest_email);

ALTER TABLE event_guest_rsvps ENABLE ROW LEVEL SECURITY;

-- Service role (webhook) can do everything
CREATE POLICY guest_rsvps_service_all ON event_guest_rsvps
    FOR ALL USING (auth.role() = 'service_role');

-- Authenticated users can read guest RSVPs for events (for attendee lists)
CREATE POLICY guest_rsvps_auth_read ON event_guest_rsvps
    FOR SELECT USING (auth.role() = 'authenticated');

-- Admins can delete guest RSVPs
CREATE POLICY guest_rsvps_admin_delete ON event_guest_rsvps
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ── Notification Preferences (per-category toggles) ─────
CREATE TABLE IF NOT EXISTS notification_preferences (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    -- Event categories
    event_new           BOOLEAN DEFAULT TRUE,   -- New events posted
    event_reminders     BOOLEAN DEFAULT TRUE,   -- 7-day, 72h, day-of reminders
    event_rsvp_updates  BOOLEAN DEFAULT TRUE,   -- Updates to events I've RSVP'd to
    event_rsvp_deadline BOOLEAN DEFAULT TRUE,   -- RSVP deadline approaching
    raffle_results      BOOLEAN DEFAULT TRUE,   -- Raffle draws and winners
    competition_updates BOOLEAN DEFAULT TRUE,   -- Phase changes, voting, results
    checkin_alerts      BOOLEAN DEFAULT TRUE,   -- QR scan confirmations
    -- Global
    push_enabled        BOOLEAN DEFAULT TRUE,   -- Master push toggle
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users manage their own preferences
CREATE POLICY notif_prefs_own_select ON notification_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY notif_prefs_own_insert ON notification_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY notif_prefs_own_update ON notification_preferences
    FOR UPDATE USING (auth.uid() = user_id);

-- Service role for cron/edge functions to check prefs
CREATE POLICY notif_prefs_service_read ON notification_preferences
    FOR SELECT USING (auth.role() = 'service_role');

-- ── Add qr_token to event_guest_rsvps checkins support ──
-- Already have guest_token column on event_checkins and event_raffle_entries from earlier migrations.
-- Just need to make sure event_rsvps also has a qr_token for members (already exists from migration 063).

-- ── Anon-friendly policies for public guest flows ───────

-- Allow anonymous (public page) users to read guest RSVPs by token or email
-- This enables: "Already RSVP'd?" email lookup + guest ticket display from URL token
CREATE POLICY guest_rsvps_anon_select ON event_guest_rsvps
    FOR SELECT USING (auth.role() = 'anon');

-- Allow anonymous guest self-check-in (venue scan mode)
CREATE POLICY checkins_guest_insert ON event_checkins
    FOR INSERT WITH CHECK (
        user_id IS NULL
        AND guest_token IS NOT NULL
    );

-- Allow anonymous users to read their own check-in status (by guest_token)
CREATE POLICY checkins_guest_select ON event_checkins
    FOR SELECT USING (
        guest_token IS NOT NULL
        AND user_id IS NULL
    );

-- ── Add raffle_winner_count column to events ────────────
-- Stores how many winners to draw (might not exist yet)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'events' AND column_name = 'raffle_winner_count'
    ) THEN
        ALTER TABLE events ADD COLUMN raffle_winner_count INT DEFAULT 1;
    END IF;
END $$;
