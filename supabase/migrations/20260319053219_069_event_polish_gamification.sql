-- ═══════════════════════════════════════════════════════════════
-- Migration 069 — Event Polish & Gamification
-- Phase 5A-5: Badges, scrapbook, notifications, admin dashboard
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Seed Event Badge Cosmetics ────────────────────────────

INSERT INTO cosmetics (key, type, name, emoji, description, rarity, sort_order) VALUES
    ('event_participant', 'badge', 'Event Participant', '🎉', 'Attended a family event and checked in', 'common', 200),
    ('trip_veteran',      'badge', 'Trip Veteran',      '🏔️', 'Checked in to 3+ LLC trips or outings', 'rare', 201),
    ('never_miss',        'badge', 'Never Miss a Beat', '🎵', 'Checked in to 5+ events total', 'rare', 202),
    ('comp_winner',       'badge', 'Competition Winner', '🏆', 'Won 1st place in a competition event', 'epic', 203),
    ('top_competitor',    'badge', 'Top Competitor',     '🥇', 'Placed top 3 in a competition event', 'rare', 204),
    ('fundraiser_champ',  'badge', 'Fundraiser Champion','💰', 'Contributed to a competition prize pool', 'common', 205),
    ('event_organizer',   'badge', 'Event Organizer',    '📋', 'Created an event with 5+ checked-in attendees', 'rare', 206)
ON CONFLICT (key) DO NOTHING;

-- ── 2. Event Photos (Scrapbook) ──────────────────────────────

CREATE TABLE IF NOT EXISTS event_photos (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_url    TEXT NOT NULL,
    caption     TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_event_photos_event ON event_photos(event_id);

ALTER TABLE event_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_photos_select" ON event_photos
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "event_photos_insert" ON event_photos
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "event_photos_update" ON event_photos
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "event_photos_delete" ON event_photos
    FOR DELETE USING (
        auth.uid() = user_id
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Storage bucket for event scrapbook photos (public for display)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('event-photos', 'event-photos', true, 10485760)  -- 10MB max
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "evt_photo_upload" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'event-photos'
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "evt_photo_read" ON storage.objects
    FOR SELECT USING (bucket_id = 'event-photos');

CREATE POLICY "evt_photo_delete" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'event-photos'
        AND (
            auth.uid()::text = (storage.foldername(name))[1]
            OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
        )
    );

-- ── 3. Helper: Idempotent Badge Award ────────────────────────

CREATE OR REPLACE FUNCTION award_event_badge(p_user_id UUID, p_badge_key TEXT)
RETURNS VOID AS $$
BEGIN
    -- Insert into legacy member_badges table
    INSERT INTO member_badges (user_id, badge_key, awarded_by)
    VALUES (p_user_id, p_badge_key, 'system')
    ON CONFLICT (user_id, badge_key) DO NOTHING;

    -- Insert into unified member_cosmetics table
    INSERT INTO member_cosmetics (user_id, cosmetic_key, awarded_by)
    VALUES (p_user_id, p_badge_key, 'system')
    ON CONFLICT (user_id, cosmetic_key) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 4. Helper: Mass-Award Banner to Event Attendees ──────────

CREATE OR REPLACE FUNCTION award_event_banner_to_attendees(p_event_id UUID, p_banner_key TEXT)
RETURNS INT AS $$
DECLARE
    v_count INT := 0;
    v_checkin RECORD;
BEGIN
    FOR v_checkin IN
        SELECT DISTINCT user_id FROM event_checkins
        WHERE event_id = p_event_id AND user_id IS NOT NULL
    LOOP
        INSERT INTO member_cosmetics (user_id, cosmetic_key, awarded_by)
        VALUES (v_checkin.user_id, p_banner_key, 'admin')
        ON CONFLICT (user_id, cosmetic_key) DO NOTHING;
        v_count := v_count + 1;
    END LOOP;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 5. Trigger: Auto-Award Badges on Check-In ───────────────

CREATE OR REPLACE FUNCTION on_event_checkin_badge()
RETURNS TRIGGER AS $$
DECLARE
    v_checkin_count INT;
    v_llc_trip_count INT;
    v_prefs RECORD;
BEGIN
    -- Only for member check-ins (not guests)
    IF NEW.user_id IS NULL THEN RETURN NEW; END IF;

    -- Award "Event Participant" badge
    PERFORM award_event_badge(NEW.user_id, 'event_participant');

    -- Check "Never Miss a Beat" — 5+ events checked in
    SELECT COUNT(DISTINCT event_id) INTO v_checkin_count
    FROM event_checkins WHERE user_id = NEW.user_id;
    IF v_checkin_count >= 5 THEN
        PERFORM award_event_badge(NEW.user_id, 'never_miss');
    END IF;

    -- Check "Trip Veteran" — 3+ LLC events checked in
    SELECT COUNT(DISTINCT ec.event_id) INTO v_llc_trip_count
    FROM event_checkins ec
    JOIN events e ON e.id = ec.event_id
    WHERE ec.user_id = NEW.user_id AND e.event_type = 'llc';
    IF v_llc_trip_count >= 3 THEN
        PERFORM award_event_badge(NEW.user_id, 'trip_veteran');
    END IF;

    -- Create check-in notification (respecting preferences)
    SELECT * INTO v_prefs FROM notification_preferences WHERE user_id = NEW.user_id;
    IF v_prefs IS NULL OR v_prefs.checkin_alerts != false THEN
        INSERT INTO notifications (user_id, type, message, link)
        VALUES (NEW.user_id, 'event', '✅ You''re checked in! Enjoy the event.', '/portal/events.html');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_checkin_badge
    AFTER INSERT ON event_checkins
    FOR EACH ROW EXECUTE FUNCTION on_event_checkin_badge();

-- ── 6. Trigger: Notify Creator on RSVP ──────────────────────

CREATE OR REPLACE FUNCTION on_rsvp_notify_creator()
RETURNS TRIGGER AS $$
DECLARE
    v_event events%ROWTYPE;
    v_name TEXT;
    v_prefs RECORD;
BEGIN
    IF NEW.status != 'going' THEN RETURN NEW; END IF;

    SELECT * INTO v_event FROM events WHERE id = NEW.event_id;
    IF v_event IS NULL OR v_event.created_by = NEW.user_id THEN RETURN NEW; END IF;

    -- Check creator's notification preferences
    SELECT * INTO v_prefs FROM notification_preferences WHERE user_id = v_event.created_by;
    IF v_prefs IS NOT NULL AND v_prefs.event_rsvp_updates = false THEN RETURN NEW; END IF;

    SELECT COALESCE(first_name || ' ' || last_name, 'Someone') INTO v_name
    FROM profiles WHERE id = NEW.user_id;

    INSERT INTO notifications (user_id, type, message, actor_id, actor_name, link)
    VALUES (
        v_event.created_by, 'event',
        v_name || ' RSVP''d to your event "' || v_event.title || '"',
        NEW.user_id, v_name, '/portal/events.html'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_rsvp_notify
    AFTER INSERT ON event_rsvps
    FOR EACH ROW EXECUTE FUNCTION on_rsvp_notify_creator();

-- ── 7. Trigger: Notify Member on Document Upload ─────────────

CREATE OR REPLACE FUNCTION on_document_notify_member()
RETURNS TRIGGER AS $$
DECLARE
    v_event events%ROWTYPE;
    v_prefs RECORD;
BEGIN
    -- Only for per-member documents
    IF NEW.for_user_id IS NULL THEN RETURN NEW; END IF;

    SELECT * INTO v_event FROM events WHERE id = NEW.event_id;

    -- Check member's notification preferences
    SELECT * INTO v_prefs FROM notification_preferences WHERE user_id = NEW.for_user_id;
    IF v_prefs IS NOT NULL AND v_prefs.event_rsvp_updates = false THEN RETURN NEW; END IF;

    INSERT INTO notifications (user_id, type, message, link)
    VALUES (
        NEW.for_user_id, 'event',
        '📄 A document ("' || NEW.label || '") was uploaded for you — "' || COALESCE(v_event.title, 'Event') || '"',
        '/portal/events.html'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_doc_notify
    AFTER INSERT ON event_documents
    FOR EACH ROW EXECUTE FUNCTION on_document_notify_member();

-- ── 8. Trigger: Competition Phase Change Notifications ───────

CREATE OR REPLACE FUNCTION on_comp_phase_notify()
RETURNS TRIGGER AS $$
DECLARE
    v_event events%ROWTYPE;
    v_rsvp RECORD;
    v_msg TEXT;
    v_prefs RECORD;
BEGIN
    -- Only fire when status changes to 'active'
    IF NEW.status = OLD.status THEN RETURN NEW; END IF;
    IF NEW.status != 'active' THEN RETURN NEW; END IF;

    SELECT * INTO v_event FROM events WHERE id = NEW.event_id;

    v_msg := CASE NEW.phase_num
        WHEN 1 THEN '📋 Registration is open for "' || v_event.title || '"!'
        WHEN 2 THEN '🎨 Competition is active for "' || v_event.title || '"! Submit your entry.'
        WHEN 3 THEN '🗳️ Voting is open for "' || v_event.title || '"! Cast your vote.'
        WHEN 4 THEN '🏆 Results are in for "' || v_event.title || '"!'
        ELSE '📢 Phase update for "' || v_event.title || '"'
    END;

    -- Notify all RSVPed members (respecting preferences)
    FOR v_rsvp IN SELECT user_id FROM event_rsvps WHERE event_id = NEW.event_id AND status = 'going' LOOP
        SELECT * INTO v_prefs FROM notification_preferences WHERE user_id = v_rsvp.user_id;
        IF v_prefs IS NULL OR v_prefs.competition_updates != false THEN
            INSERT INTO notifications (user_id, type, message, link)
            VALUES (v_rsvp.user_id, 'event', v_msg, '/portal/events.html');
        END IF;
    END LOOP;

    -- Also notify registered competitors who may not have RSVP'd
    FOR v_rsvp IN
        SELECT ce.user_id FROM competition_entries ce
        WHERE ce.event_id = NEW.event_id
        AND NOT EXISTS (
            SELECT 1 FROM event_rsvps er
            WHERE er.event_id = NEW.event_id AND er.user_id = ce.user_id AND er.status = 'going'
        )
    LOOP
        SELECT * INTO v_prefs FROM notification_preferences WHERE user_id = v_rsvp.user_id;
        IF v_prefs IS NULL OR v_prefs.competition_updates != false THEN
            INSERT INTO notifications (user_id, type, message, link)
            VALUES (v_rsvp.user_id, 'event', v_msg, '/portal/events.html');
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_comp_phase_notify
    AFTER UPDATE ON competition_phases
    FOR EACH ROW EXECUTE FUNCTION on_comp_phase_notify();

-- ── 9. Trigger: Competition Winner Badge + Notification ──────

CREATE OR REPLACE FUNCTION on_comp_winner_badge()
RETURNS TRIGGER AS $$
DECLARE
    v_event events%ROWTYPE;
BEGIN
    SELECT * INTO v_event FROM events WHERE id = NEW.event_id;

    -- Award "Competition Winner" badge for 1st place
    IF NEW.place = 1 THEN
        PERFORM award_event_badge(NEW.user_id, 'comp_winner');
    END IF;

    -- Award "Top Competitor" badge for any top 3 finish
    PERFORM award_event_badge(NEW.user_id, 'top_competitor');

    -- Notify winner
    INSERT INTO notifications (user_id, type, message, link)
    VALUES (
        NEW.user_id, 'event',
        '🏆 You placed #' || NEW.place || ' in "' || COALESCE(v_event.title, 'competition') || '"! Prize: $' || ROUND(NEW.prize_amount_cents / 100.0, 2),
        '/portal/events.html'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_comp_winner_badge
    AFTER INSERT ON competition_winners
    FOR EACH ROW EXECUTE FUNCTION on_comp_winner_badge();

-- ── 10. Trigger: Fundraiser Champion Badge ───────────────────

CREATE OR REPLACE FUNCTION on_prize_pool_badge()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM award_event_badge(NEW.contributor_id, 'fundraiser_champ');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_prize_pool_badge
    AFTER INSERT ON prize_pool_contributions
    FOR EACH ROW EXECUTE FUNCTION on_prize_pool_badge();

-- ── 11. Trigger: Raffle Winner Notifications ─────────────────

CREATE OR REPLACE FUNCTION on_raffle_winner_notify()
RETURNS TRIGGER AS $$
DECLARE
    v_event events%ROWTYPE;
    v_name TEXT;
    v_checkin RECORD;
    v_prefs RECORD;
BEGIN
    SELECT * INTO v_event FROM events WHERE id = NEW.event_id;

    -- Get winner name
    IF NEW.user_id IS NOT NULL THEN
        SELECT COALESCE(first_name || ' ' || last_name, 'Someone') INTO v_name
        FROM profiles WHERE id = NEW.user_id;

        -- Notify the winner
        SELECT * INTO v_prefs FROM notification_preferences WHERE user_id = NEW.user_id;
        IF v_prefs IS NULL OR v_prefs.raffle_results != false THEN
            INSERT INTO notifications (user_id, type, message, link)
            VALUES (
                NEW.user_id, 'event',
                '🏆 Congrats! You won ' || CASE WHEN NEW.place = 1 THEN '1st' WHEN NEW.place = 2 THEN '2nd' WHEN NEW.place = 3 THEN '3rd' ELSE NEW.place || 'th' END || ' place in the "' || COALESCE(v_event.title, 'event') || '" raffle! Prize: ' || COALESCE(NEW.prize_description, 'TBD'),
                '/portal/events.html'
            );
        END IF;
    ELSE
        v_name := 'A guest';
    END IF;

    -- Notify all checked-in attendees about the draw
    FOR v_checkin IN
        SELECT DISTINCT user_id FROM event_checkins
        WHERE event_id = NEW.event_id AND user_id IS NOT NULL AND user_id != COALESCE(NEW.user_id, '00000000-0000-0000-0000-000000000000'::UUID)
    LOOP
        SELECT * INTO v_prefs FROM notification_preferences WHERE user_id = v_checkin.user_id;
        IF v_prefs IS NULL OR v_prefs.raffle_results != false THEN
            INSERT INTO notifications (user_id, type, message, link)
            VALUES (
                v_checkin.user_id, 'event',
                '🎉 ' || v_name || ' just won the "' || COALESCE(v_event.title, 'event') || '" raffle!',
                '/portal/events.html'
            );
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_raffle_winner_notify
    AFTER INSERT ON event_raffle_winners
    FOR EACH ROW EXECUTE FUNCTION on_raffle_winner_notify();

-- ── 12. Trigger: New Event Published → Notify All Members ────

CREATE OR REPLACE FUNCTION on_event_published()
RETURNS TRIGGER AS $$
DECLARE
    v_member RECORD;
    v_prefs RECORD;
BEGIN
    -- Only trigger on status change to 'open' from 'draft'
    IF NEW.status = 'open' AND (OLD.status IS NULL OR OLD.status = 'draft') THEN
        FOR v_member IN
            SELECT id FROM profiles
            WHERE role IN ('member', 'admin') AND id != NEW.created_by
        LOOP
            SELECT * INTO v_prefs FROM notification_preferences WHERE user_id = v_member.id;
            IF v_prefs IS NULL OR v_prefs.event_new != false THEN
                INSERT INTO notifications (user_id, type, message, link)
                VALUES (
                    v_member.id, 'event',
                    '📅 New event: "' || NEW.title || '"! Check it out.',
                    '/portal/events.html'
                );
            END IF;
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_event_published
    AFTER UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION on_event_published();

-- ── 13. Trigger: Event Complete → Organizer Badge ────────────

CREATE OR REPLACE FUNCTION on_event_complete_badge()
RETURNS TRIGGER AS $$
DECLARE
    v_count INT;
BEGIN
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        SELECT COUNT(*) INTO v_count FROM event_checkins WHERE event_id = NEW.id AND user_id IS NOT NULL;
        IF v_count >= 5 THEN
            PERFORM award_event_badge(NEW.created_by, 'event_organizer');
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_event_complete_badge
    AFTER UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION on_event_complete_badge();
