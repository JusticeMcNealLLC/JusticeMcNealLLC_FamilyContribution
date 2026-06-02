-- ============================================================
-- 094: Event SMS Notifications — schema + RLS (Phase 1)
--
-- Shared SMS tables + per-event recipients for Event SMS Support.
-- Permission: events.manage_notifications
--
-- No UI, Edge Functions, or Twilio wiring in this migration.
-- ============================================================

-- ── 1. Access helper ────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.can_manage_event_notifications(p_event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT auth.uid() IS NOT NULL
        AND (
            public.has_permission('events.manage_all')
            OR public.has_permission('events.manage_notifications')
            OR EXISTS (
                SELECT 1
                FROM public.events e
                WHERE e.id = p_event_id
                  AND e.created_by = auth.uid()
            )
            OR EXISTS (
                SELECT 1
                FROM public.event_hosts eh
                WHERE eh.event_id = p_event_id
                  AND eh.user_id = auth.uid()
            )
        );
$$;

REVOKE ALL ON FUNCTION public.can_manage_event_notifications(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_event_notifications(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.has_event_sms_admin_access()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT auth.uid() IS NOT NULL
        AND (
            public.has_permission('events.manage_all')
            OR public.has_permission('events.manage_notifications')
        );
$$;

REVOKE ALL ON FUNCTION public.has_event_sms_admin_access() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_event_sms_admin_access() TO authenticated;

-- ── 2. Shared updated_at trigger ────────────────────────────

CREATE OR REPLACE FUNCTION public.set_row_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- ── 3. sms_phone_contacts ───────────────────────────────────

CREATE TABLE IF NOT EXISTS public.sms_phone_contacts (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_e164  text NOT NULL,
    user_id     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT sms_phone_contacts_phone_nonempty CHECK (char_length(trim(phone_e164)) > 0),
    CONSTRAINT sms_phone_contacts_phone_e164_unique UNIQUE (phone_e164)
);

CREATE INDEX IF NOT EXISTS idx_sms_phone_contacts_phone
    ON public.sms_phone_contacts (phone_e164);

CREATE INDEX IF NOT EXISTS idx_sms_phone_contacts_user
    ON public.sms_phone_contacts (user_id)
    WHERE user_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_sms_phone_contacts_updated_at ON public.sms_phone_contacts;
CREATE TRIGGER trg_sms_phone_contacts_updated_at
    BEFORE UPDATE ON public.sms_phone_contacts
    FOR EACH ROW
    EXECUTE FUNCTION public.set_row_updated_at();

ALTER TABLE public.sms_phone_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY sms_phone_contacts_select_own ON public.sms_phone_contacts
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY sms_phone_contacts_service_all ON public.sms_phone_contacts
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ── 4. sms_global_suppressions ──────────────────────────────

CREATE TABLE IF NOT EXISTS public.sms_global_suppressions (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_e164      text NOT NULL,
    reason          text NOT NULL,
    source          text NOT NULL,
    twilio_from     text,
    suppressed_at   timestamptz NOT NULL DEFAULT now(),
    released_at     timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT sms_global_suppressions_phone_nonempty CHECK (char_length(trim(phone_e164)) > 0),
    CONSTRAINT sms_global_suppressions_reason_check CHECK (
        reason IN ('twilio_stop', 'twilio_start_revoked', 'admin', 'invalid_phone', 'delivery_callback')
    ),
    CONSTRAINT sms_global_suppressions_source_check CHECK (
        source IN ('inbound_webhook', 'admin_ui', 'delivery_callback')
    )
);

CREATE INDEX IF NOT EXISTS idx_sms_global_suppressions_phone
    ON public.sms_global_suppressions (phone_e164);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sms_global_suppressions_active_unique
    ON public.sms_global_suppressions (phone_e164, COALESCE(twilio_from, ''))
    WHERE released_at IS NULL;

DROP TRIGGER IF EXISTS trg_sms_global_suppressions_updated_at ON public.sms_global_suppressions;
CREATE TRIGGER trg_sms_global_suppressions_updated_at
    BEFORE UPDATE ON public.sms_global_suppressions
    FOR EACH ROW
    EXECUTE FUNCTION public.set_row_updated_at();

ALTER TABLE public.sms_global_suppressions ENABLE ROW LEVEL SECURITY;

CREATE POLICY sms_global_suppressions_select_admin ON public.sms_global_suppressions
    FOR SELECT
    USING (public.has_event_sms_admin_access());

CREATE POLICY sms_global_suppressions_service_all ON public.sms_global_suppressions
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ── 5. event_sms_recipients ─────────────────────────────────

CREATE TABLE IF NOT EXISTS public.event_sms_recipients (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id            uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    contact_id          uuid NOT NULL REFERENCES public.sms_phone_contacts(id) ON DELETE CASCADE,
    display_name        text,
    email               text,
    user_id             uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    guest_rsvp_id       uuid REFERENCES public.event_guest_rsvps(id) ON DELETE SET NULL,
    event_rsvp_id       uuid REFERENCES public.event_rsvps(id) ON DELETE SET NULL,
    opted_in            boolean NOT NULL DEFAULT false,
    opted_in_at         timestamptz,
    opted_out_at        timestamptz,
    consent_source      text NOT NULL,
    consent_text_version text,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT event_sms_recipients_consent_source_check CHECK (
        consent_source IN ('guest_rsvp', 'member_rsvp', 'member_profile', 'admin_manual')
    ),
    CONSTRAINT event_sms_recipients_one_per_event_contact UNIQUE (event_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_event_sms_recipients_event
    ON public.event_sms_recipients (event_id);

CREATE INDEX IF NOT EXISTS idx_event_sms_recipients_contact
    ON public.event_sms_recipients (contact_id);

CREATE INDEX IF NOT EXISTS idx_event_sms_recipients_user
    ON public.event_sms_recipients (user_id)
    WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_event_sms_recipients_event_opted_in
    ON public.event_sms_recipients (event_id, opted_in);

DROP TRIGGER IF EXISTS trg_event_sms_recipients_updated_at ON public.event_sms_recipients;
CREATE TRIGGER trg_event_sms_recipients_updated_at
    BEFORE UPDATE ON public.event_sms_recipients
    FOR EACH ROW
    EXECUTE FUNCTION public.set_row_updated_at();

ALTER TABLE public.event_sms_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY event_sms_recipients_select_own ON public.event_sms_recipients
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY event_sms_recipients_select_manager ON public.event_sms_recipients
    FOR SELECT
    USING (public.can_manage_event_notifications(event_id));

CREATE POLICY event_sms_recipients_update_own ON public.event_sms_recipients
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY event_sms_recipients_service_all ON public.event_sms_recipients
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY sms_phone_contacts_select_event_manager ON public.sms_phone_contacts
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM public.event_sms_recipients r
            WHERE r.contact_id = sms_phone_contacts.id
              AND public.can_manage_event_notifications(r.event_id)
        )
    );

-- ── 6. sms_messages ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.sms_messages (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        uuid REFERENCES public.events(id) ON DELETE CASCADE,
    channel         text NOT NULL DEFAULT 'sms',
    body            text NOT NULL,
    message_type    text NOT NULL,
    sender_user_id  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    recipient_count int NOT NULL DEFAULT 0,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT sms_messages_channel_check CHECK (channel = 'sms'),
    CONSTRAINT sms_messages_body_nonempty CHECK (char_length(trim(body)) > 0),
    CONSTRAINT sms_messages_type_check CHECK (
        message_type IN ('rsvp_confirmation', 'reminder_24h', 'manual', 'cancellation', 'update')
    ),
    CONSTRAINT sms_messages_recipient_count_nonneg CHECK (recipient_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_sms_messages_event_created
    ON public.sms_messages (event_id, created_at DESC);

DROP TRIGGER IF EXISTS trg_sms_messages_updated_at ON public.sms_messages;
CREATE TRIGGER trg_sms_messages_updated_at
    BEFORE UPDATE ON public.sms_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.set_row_updated_at();

ALTER TABLE public.sms_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY sms_messages_select_manager ON public.sms_messages
    FOR SELECT
    USING (
        event_id IS NOT NULL
        AND public.can_manage_event_notifications(event_id)
    );

CREATE POLICY sms_messages_service_all ON public.sms_messages
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ── 7. sms_message_deliveries ───────────────────────────────

CREATE TABLE IF NOT EXISTS public.sms_message_deliveries (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id              uuid NOT NULL REFERENCES public.sms_messages(id) ON DELETE CASCADE,
    event_sms_recipient_id  uuid REFERENCES public.event_sms_recipients(id) ON DELETE SET NULL,
    phone_e164              text NOT NULL,
    twilio_message_sid      text,
    status                  text NOT NULL DEFAULT 'queued',
    error_code              text,
    error_message           text,
    status_updated_at       timestamptz NOT NULL DEFAULT now(),
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT sms_message_deliveries_phone_nonempty CHECK (char_length(trim(phone_e164)) > 0),
    CONSTRAINT sms_message_deliveries_status_check CHECK (
        status IN ('queued', 'sent', 'delivered', 'failed', 'undelivered', 'opted_out', 'skipped', 'invalid_phone')
    )
);

CREATE INDEX IF NOT EXISTS idx_sms_message_deliveries_message
    ON public.sms_message_deliveries (message_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sms_message_deliveries_twilio_sid
    ON public.sms_message_deliveries (twilio_message_sid)
    WHERE twilio_message_sid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sms_message_deliveries_status
    ON public.sms_message_deliveries (status);

CREATE OR REPLACE FUNCTION public.sms_message_deliveries_set_timestamps()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
        NEW.status_updated_at = now();
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sms_message_deliveries_timestamps ON public.sms_message_deliveries;
CREATE TRIGGER trg_sms_message_deliveries_timestamps
    BEFORE UPDATE ON public.sms_message_deliveries
    FOR EACH ROW
    EXECUTE FUNCTION public.sms_message_deliveries_set_timestamps();

ALTER TABLE public.sms_message_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY sms_message_deliveries_select_manager ON public.sms_message_deliveries
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM public.sms_messages m
            WHERE m.id = sms_message_deliveries.message_id
              AND m.event_id IS NOT NULL
              AND public.can_manage_event_notifications(m.event_id)
        )
    );

CREATE POLICY sms_message_deliveries_service_all ON public.sms_message_deliveries
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ── 8. sms_inbound_messages ─────────────────────────────────

CREATE TABLE IF NOT EXISTS public.sms_inbound_messages (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_e164          text NOT NULL,
    body                text NOT NULL,
    twilio_message_sid  text,
    parsed_command      text,
    received_at         timestamptz NOT NULL DEFAULT now(),
    raw_payload         jsonb,
    created_at          timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT sms_inbound_messages_phone_nonempty CHECK (char_length(trim(phone_e164)) > 0),
    CONSTRAINT sms_inbound_messages_body_nonempty CHECK (char_length(trim(body)) > 0),
    CONSTRAINT sms_inbound_messages_parsed_command_check CHECK (
        parsed_command IS NULL
        OR parsed_command IN ('STOP', 'START', 'UNSTOP', 'HELP')
    )
);

CREATE INDEX IF NOT EXISTS idx_sms_inbound_messages_phone_received
    ON public.sms_inbound_messages (phone_e164, received_at DESC);

ALTER TABLE public.sms_inbound_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY sms_inbound_messages_select_admin ON public.sms_inbound_messages
    FOR SELECT
    USING (public.has_event_sms_admin_access());

CREATE POLICY sms_inbound_messages_service_all ON public.sms_inbound_messages
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ── 9. Permission seed: events.manage_notifications ────────
-- Label (admin UI): Manage Event Notifications

INSERT INTO role_permissions (role_id, permission) VALUES
    ('00000000-0000-0000-0000-000000000001', 'events.manage_notifications'),
    ('00000000-0000-0000-0000-000000000003', 'events.manage_notifications')
ON CONFLICT DO NOTHING;
