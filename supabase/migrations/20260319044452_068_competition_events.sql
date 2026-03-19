-- ═══════════════════════════════════════════════════════════════
-- Migration 068 — Competition Events
-- Phase 5A-4: Competition phases, entries, votes, prize pool
-- ═══════════════════════════════════════════════════════════════

-- ── New columns on events ────────────────────────────────────
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS competition_config JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS total_prize_pool_cents INT DEFAULT 0;

-- competition_config schema:
-- {
--   entry_type: 'file' | 'link' | 'text' | 'any',
--   entry_fee_cents: number,
--   house_pct: number (0-25),
--   min_entries: number,
--   extension_days: number (how many days to extend if min not met),
--   entries_visible_before_voting: boolean,
--   voter_eligibility: 'all_members' | 'rsvped_only' | 'competitors_only',
--   vote_tally_visible: boolean,
--   max_file_size_mb: number (default 10 for images/PDFs, 50 for video),
-- }

-- ── Competition Phases ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS competition_phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    phase_num INT NOT NULL CHECK (phase_num BETWEEN 1 AND 4),
    name TEXT NOT NULL,
    description TEXT,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'extended', 'cancelled')),
    extended_once BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (event_id, phase_num)
);

CREATE INDEX idx_comp_phases_event ON competition_phases(event_id);

-- ── Competition Entries ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS competition_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    file_url TEXT,
    file_name TEXT,
    file_size_bytes BIGINT,
    mime_type TEXT,
    external_url TEXT,
    entry_type TEXT NOT NULL CHECK (entry_type IN ('file', 'link', 'text')),
    moderated BOOLEAN DEFAULT FALSE,
    moderated_by UUID REFERENCES auth.users(id),
    moderation_reason TEXT,
    vote_count INT DEFAULT 0,
    submitted_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (event_id, user_id)
);

CREATE INDEX idx_comp_entries_event ON competition_entries(event_id);

-- ── Competition Votes ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS competition_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    voter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    entry_id UUID NOT NULL REFERENCES competition_entries(id) ON DELETE CASCADE,
    voted_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (event_id, voter_id)
);

CREATE INDEX idx_comp_votes_event ON competition_votes(event_id);
CREATE INDEX idx_comp_votes_entry ON competition_votes(entry_id);

-- ── Prize Pool Contributions ─────────────────────────────────
CREATE TABLE IF NOT EXISTS prize_pool_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    contributor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount_cents INT NOT NULL CHECK (amount_cents > 0),
    stripe_payment_intent_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_prize_pool_event ON prize_pool_contributions(event_id);

-- ── Competition Winners ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS competition_winners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    entry_id UUID NOT NULL REFERENCES competition_entries(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    place INT NOT NULL CHECK (place BETWEEN 1 AND 3),
    prize_amount_cents INT DEFAULT 0,
    stripe_payout_id TEXT,
    payout_status TEXT DEFAULT 'pending' CHECK (payout_status IN ('pending', 'processing', 'paid', 'failed')),
    needs_1099 BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (event_id, place)
);

CREATE INDEX idx_comp_winners_event ON competition_winners(event_id);

-- ── Storage Bucket for Competition Entries ───────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('competition-entries', 'competition-entries', false, 52428800)  -- 50MB max
ON CONFLICT (id) DO NOTHING;

-- ── RLS Policies ─────────────────────────────────────────────

-- Competition Phases: anyone authenticated can read, admins manage
ALTER TABLE competition_phases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comp_phases_select" ON competition_phases
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "comp_phases_admin_all" ON competition_phases
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Competition Entries: authenticated read, own insert, admins manage
ALTER TABLE competition_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comp_entries_select" ON competition_entries
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "comp_entries_insert" ON competition_entries
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "comp_entries_own_update" ON competition_entries
    FOR UPDATE USING (auth.uid() = user_id AND moderated = false);

CREATE POLICY "comp_entries_admin_all" ON competition_entries
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Competition Votes: authenticated read, own insert
ALTER TABLE competition_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comp_votes_select" ON competition_votes
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "comp_votes_insert" ON competition_votes
    FOR INSERT WITH CHECK (auth.uid() = voter_id);

CREATE POLICY "comp_votes_admin_all" ON competition_votes
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Prize Pool Contributions: authenticated read, own insert
ALTER TABLE prize_pool_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prize_pool_select" ON prize_pool_contributions
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "prize_pool_insert" ON prize_pool_contributions
    FOR INSERT WITH CHECK (auth.uid() = contributor_id);

CREATE POLICY "prize_pool_admin_all" ON prize_pool_contributions
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Competition Winners: authenticated read, admins manage
ALTER TABLE competition_winners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comp_winners_select" ON competition_winners
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "comp_winners_admin_all" ON competition_winners
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Storage: competition-entries bucket policies
CREATE POLICY "comp_entry_upload" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'competition-entries'
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "comp_entry_read" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'competition-entries'
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "comp_entry_delete" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'competition-entries'
        AND (
            auth.uid()::text = (storage.foldername(name))[1]
            OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
        )
    );

-- ── Server-side function to block self-voting ────────────────
CREATE OR REPLACE FUNCTION check_no_self_vote()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM competition_entries
        WHERE id = NEW.entry_id AND user_id = NEW.voter_id
    ) THEN
        RAISE EXCEPTION 'Self-voting is not allowed';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_no_self_vote
    BEFORE INSERT ON competition_votes
    FOR EACH ROW EXECUTE FUNCTION check_no_self_vote();

-- ── Server-side function to increment vote count ─────────────
CREATE OR REPLACE FUNCTION increment_vote_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE competition_entries
    SET vote_count = vote_count + 1
    WHERE id = NEW.entry_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_increment_vote
    AFTER INSERT ON competition_votes
    FOR EACH ROW EXECUTE FUNCTION increment_vote_count();

-- ── Server-side function to update prize pool total ──────────
CREATE OR REPLACE FUNCTION update_prize_pool_total()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE events
    SET total_prize_pool_cents = (
        SELECT COALESCE(SUM(amount_cents), 0)
        FROM prize_pool_contributions
        WHERE event_id = NEW.event_id
    )
    WHERE id = NEW.event_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_prize_pool
    AFTER INSERT ON prize_pool_contributions
    FOR EACH ROW EXECUTE FUNCTION update_prize_pool_total();
