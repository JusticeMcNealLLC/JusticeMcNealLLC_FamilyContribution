-- ════════════════════════════════════════════════════════════
-- Migration 067 — LLC Events (Documents & Map) — Phase 5A-3
-- Tables: event_documents, event_locations
-- Storage: event-documents bucket
-- Columns: transportation_mode, transportation_estimate_cents on events
-- ════════════════════════════════════════════════════════════

-- ── New columns on events table ─────────────────────────

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='transportation_mode') THEN
        ALTER TABLE events ADD COLUMN transportation_mode TEXT DEFAULT 'llc_provides' CHECK (transportation_mode IN ('llc_provides','self_arranged'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='transportation_estimate_cents') THEN
        ALTER TABLE events ADD COLUMN transportation_estimate_cents INT;
    END IF;
END $$;

-- ── Event Documents ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS event_documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    uploaded_by     UUID NOT NULL REFERENCES profiles(id),
    -- Per-member doc: target_user_id IS NOT NULL; group doc: target_user_id IS NULL
    target_user_id  UUID REFERENCES profiles(id),
    doc_type        TEXT NOT NULL CHECK (doc_type IN ('plane_ticket','group_ticket','itinerary','receipt','other')),
    label           TEXT NOT NULL,
    file_path       TEXT NOT NULL,
    file_name       TEXT NOT NULL,
    file_size_bytes INT,
    mime_type       TEXT,
    distributed     BOOLEAN DEFAULT FALSE,
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_docs_event ON event_documents(event_id);
CREATE INDEX IF NOT EXISTS idx_event_docs_target ON event_documents(event_id, target_user_id);

ALTER TABLE event_documents ENABLE ROW LEVEL SECURITY;

-- Authenticated users can see docs for events they're RSVPed to, or group docs
CREATE POLICY event_docs_select_member ON event_documents
    FOR SELECT USING (
        auth.uid() IS NOT NULL
        AND (
            -- Group docs: any RSVPed member can see
            (target_user_id IS NULL AND EXISTS (
                SELECT 1 FROM event_rsvps WHERE event_id = event_documents.event_id AND user_id = auth.uid() AND status = 'going'
            ))
            OR
            -- Per-member docs: only the target member can see
            target_user_id = auth.uid()
            OR
            -- Hosts/admins can see all
            EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
            OR
            EXISTS (SELECT 1 FROM events WHERE id = event_documents.event_id AND created_by = auth.uid())
            OR
            EXISTS (SELECT 1 FROM event_hosts WHERE event_id = event_documents.event_id AND user_id = auth.uid())
        )
    );

-- Only admins/hosts can insert
CREATE POLICY event_docs_insert_admin ON event_documents
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
        OR EXISTS (SELECT 1 FROM events WHERE id = event_documents.event_id AND created_by = auth.uid())
        OR EXISTS (SELECT 1 FROM event_hosts WHERE event_id = event_documents.event_id AND user_id = auth.uid())
    );

-- Only admins/hosts can update (mark distributed, etc.)
CREATE POLICY event_docs_update_admin ON event_documents
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
        OR EXISTS (SELECT 1 FROM events WHERE id = event_documents.event_id AND created_by = auth.uid())
        OR EXISTS (SELECT 1 FROM event_hosts WHERE event_id = event_documents.event_id AND user_id = auth.uid())
    );

-- Only admins/hosts can delete
CREATE POLICY event_docs_delete_admin ON event_documents
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
        OR EXISTS (SELECT 1 FROM events WHERE id = event_documents.event_id AND created_by = auth.uid())
        OR EXISTS (SELECT 1 FROM event_hosts WHERE event_id = event_documents.event_id AND user_id = auth.uid())
    );

CREATE POLICY event_docs_service ON event_documents
    FOR ALL USING (auth.role() = 'service_role');

-- ── Event Locations (Live Map) ──────────────────────────

CREATE TABLE IF NOT EXISTS event_locations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES profiles(id),
    latitude        DOUBLE PRECISION NOT NULL,
    longitude       DOUBLE PRECISION NOT NULL,
    sharing_active  BOOLEAN DEFAULT TRUE,
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_locations_event ON event_locations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_locations_active ON event_locations(event_id, sharing_active);

ALTER TABLE event_locations ENABLE ROW LEVEL SECURITY;

-- RSVPed members can see locations for their events
CREATE POLICY event_locations_select ON event_locations
    FOR SELECT USING (
        auth.uid() IS NOT NULL
        AND (
            EXISTS (
                SELECT 1 FROM event_rsvps
                WHERE event_id = event_locations.event_id AND user_id = auth.uid() AND status = 'going'
            )
            OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
        )
    );

-- Members can insert/update their own location
CREATE POLICY event_locations_insert_own ON event_locations
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY event_locations_update_own ON event_locations
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY event_locations_delete_own ON event_locations
    FOR DELETE USING (user_id = auth.uid());

CREATE POLICY event_locations_service ON event_locations
    FOR ALL USING (auth.role() = 'service_role');

-- Enable Realtime for event_locations
ALTER PUBLICATION supabase_realtime ADD TABLE event_locations;

-- ── Storage Bucket for Event Documents ──────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'event-documents',
    'event-documents',
    false,
    20971520, -- 20 MB
    ARRAY['application/pdf','image/png','image/jpeg','image/webp','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: only authenticated users can read their own docs or group docs
CREATE POLICY "event_docs_storage_read" ON storage.objects FOR SELECT
    USING (
        bucket_id = 'event-documents'
        AND auth.uid() IS NOT NULL
    );

-- Only admins can upload
CREATE POLICY "event_docs_storage_upload" ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'event-documents'
        AND auth.uid() IS NOT NULL
        AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Only admins can delete
CREATE POLICY "event_docs_storage_delete" ON storage.objects FOR DELETE
    USING (
        bucket_id = 'event-documents'
        AND auth.uid() IS NOT NULL
        AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );
