-- 096: event_parties + event_seats + party_id on legacy RSVPs
-- Spec: docs/product/improvements/pages/events/002_event_seat_party_model_migration_draft.md

CREATE TABLE IF NOT EXISTS event_parties (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id                UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    payer_kind              TEXT NOT NULL CHECK (payer_kind IN ('member', 'guest')),
    payer_user_id           UUID REFERENCES profiles(id) ON DELETE SET NULL,
    payer_guest_rsvp_id     UUID REFERENCES event_guest_rsvps(id) ON DELETE SET NULL,
    status                  TEXT NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft', 'pending_payment', 'active', 'cancelled')),
    disclaimer_acks         JSONB NOT NULL DEFAULT '[]'::jsonb,
    amenity_vote_option_id  TEXT NULL,
    amenity_vote_status     TEXT NOT NULL DEFAULT 'none'
                            CHECK (amenity_vote_status IN ('none', 'provisional', 'counted', 'removed')),
    invite_token            TEXT UNIQUE NOT NULL DEFAULT encode(extensions.gen_random_bytes(16), 'hex'),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT event_parties_payer_member CHECK (
        payer_kind <> 'member'
        OR (payer_user_id IS NOT NULL AND payer_guest_rsvp_id IS NULL)
    ),
    CONSTRAINT event_parties_payer_guest CHECK (
        payer_kind <> 'guest'
        OR (payer_guest_rsvp_id IS NOT NULL AND payer_user_id IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_event_parties_event ON event_parties(event_id);
CREATE INDEX IF NOT EXISTS idx_event_parties_payer_user ON event_parties(payer_user_id)
    WHERE payer_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_event_parties_payer_guest ON event_parties(payer_guest_rsvp_id)
    WHERE payer_guest_rsvp_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_event_parties_invite_token ON event_parties(invite_token);

CREATE TABLE IF NOT EXISTS event_seats (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id                UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    party_id                UUID NOT NULL REFERENCES event_parties(id) ON DELETE CASCADE,
    role                    TEXT NOT NULL CHECK (role IN ('adult', 'kid')),
    display_name            TEXT NOT NULL,
    email                   TEXT NULL,
    phone                   TEXT NULL,
    options                 JSONB NOT NULL DEFAULT '{}'::jsonb,
    options_complete        BOOLEAN NOT NULL DEFAULT FALSE,
    info_invite_token       TEXT UNIQUE,
    linked_user_id          UUID REFERENCES profiles(id) ON DELETE SET NULL,
    linked_guest_rsvp_id    UUID REFERENCES event_guest_rsvps(id) ON DELETE SET NULL,
    sort_order              INT NOT NULL DEFAULT 0,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_seats_event ON event_seats(event_id);
CREATE INDEX IF NOT EXISTS idx_event_seats_party ON event_seats(party_id);
CREATE INDEX IF NOT EXISTS idx_event_seats_info_invite ON event_seats(info_invite_token)
    WHERE info_invite_token IS NOT NULL;

ALTER TABLE event_rsvps
    ADD COLUMN IF NOT EXISTS party_id UUID REFERENCES event_parties(id) ON DELETE SET NULL;

ALTER TABLE event_guest_rsvps
    ADD COLUMN IF NOT EXISTS party_id UUID REFERENCES event_parties(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_event_rsvps_party ON event_rsvps(party_id)
    WHERE party_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_event_guest_rsvps_party ON event_guest_rsvps(party_id)
    WHERE party_id IS NOT NULL;

ALTER TABLE event_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_seats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS event_parties_service_all ON event_parties;
CREATE POLICY event_parties_service_all ON event_parties
    FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS event_seats_service_all ON event_seats;
CREATE POLICY event_seats_service_all ON event_seats
    FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS event_parties_auth_select ON event_parties;
CREATE POLICY event_parties_auth_select ON event_parties
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS event_seats_auth_select ON event_seats;
CREATE POLICY event_seats_auth_select ON event_seats
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS event_parties_payer_update ON event_parties;
CREATE POLICY event_parties_payer_update ON event_parties
    FOR UPDATE USING (
        payer_kind = 'member'
        AND payer_user_id = auth.uid()
        AND status <> 'cancelled'
    );

COMMENT ON TABLE event_parties IS 'Payment/legal unit for an event RSVP group; disclaimer ack + amenity vote once per party';
COMMENT ON TABLE event_seats IS 'Individual adult/kid seats in a party; options JSON; info_invite_token for flow B';
COMMENT ON COLUMN event_parties.invite_token IS 'Magic link for My trip payments page';
COMMENT ON COLUMN event_seats.info_invite_token IS 'Fill sizes/options only; party still pays';
