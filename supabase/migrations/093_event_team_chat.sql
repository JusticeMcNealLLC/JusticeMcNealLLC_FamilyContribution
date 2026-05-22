-- ============================================================
-- 093: Event Team Chat v1 — private per-event team thread
--
-- Tables: event_chats, event_chat_messages
-- Helper: can_access_event_team_chat(event_id)
-- Access: event creator, event_hosts, events.manage_all
-- No anon access. No UI in this migration.
-- ============================================================

-- ── 1. Access helper ────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.can_access_event_team_chat(p_event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT auth.uid() IS NOT NULL
        AND (
            EXISTS (
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
            OR public.has_permission('events.manage_all')
        );
$$;

REVOKE ALL ON FUNCTION public.can_access_event_team_chat(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_event_team_chat(uuid) TO authenticated;

-- ── 2. event_chats ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.event_chats (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id    uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    chat_type   text NOT NULL DEFAULT 'team',
    title       text,
    created_at  timestamptz NOT NULL DEFAULT now(),
    created_by  uuid REFERENCES auth.users(id),
    CONSTRAINT event_chats_type_team CHECK (chat_type = 'team'),
    CONSTRAINT event_chats_one_team_per_event UNIQUE (event_id, chat_type)
);

CREATE INDEX IF NOT EXISTS idx_event_chats_event ON public.event_chats(event_id);

ALTER TABLE public.event_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY event_chats_select_team ON public.event_chats
    FOR SELECT
    USING (public.can_access_event_team_chat(event_id));

CREATE POLICY event_chats_insert_team ON public.event_chats
    FOR INSERT
    WITH CHECK (
        created_by = auth.uid()
        AND (
            public.has_permission('events.manage_all')
            OR EXISTS (
                SELECT 1
                FROM public.events e
                WHERE e.id = event_id
                  AND e.created_by = auth.uid()
            )
        )
    );

CREATE POLICY event_chats_update_team ON public.event_chats
    FOR UPDATE
    USING (
        public.has_permission('events.manage_all')
        OR EXISTS (
            SELECT 1
            FROM public.events e
            WHERE e.id = event_id
              AND e.created_by = auth.uid()
        )
    )
    WITH CHECK (
        public.has_permission('events.manage_all')
        OR EXISTS (
            SELECT 1
            FROM public.events e
            WHERE e.id = event_id
              AND e.created_by = auth.uid()
        )
    );

-- ── 3. event_chat_messages ──────────────────────────────────

CREATE TABLE IF NOT EXISTS public.event_chat_messages (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id     uuid NOT NULL REFERENCES public.event_chats(id) ON DELETE CASCADE,
    event_id    uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    sender_id   uuid NOT NULL REFERENCES auth.users(id),
    body        text NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz,
    deleted_at  timestamptz,
    deleted_by  uuid REFERENCES auth.users(id),
    CONSTRAINT event_chat_messages_body_nonempty CHECK (
        char_length(trim(body)) > 0
        AND char_length(body) <= 4000
    )
);

CREATE INDEX IF NOT EXISTS idx_event_chat_messages_chat_created
    ON public.event_chat_messages(chat_id, created_at);

CREATE INDEX IF NOT EXISTS idx_event_chat_messages_event_created
    ON public.event_chat_messages(event_id, created_at);

-- Keep event_id aligned with parent chat
CREATE OR REPLACE FUNCTION public.event_chat_messages_enforce_event_id()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_chat_event_id uuid;
BEGIN
    SELECT c.event_id INTO v_chat_event_id
    FROM public.event_chats c
    WHERE c.id = NEW.chat_id;

    IF v_chat_event_id IS NULL THEN
        RAISE EXCEPTION 'chat_id does not exist';
    END IF;

    IF NEW.event_id IS DISTINCT FROM v_chat_event_id THEN
        RAISE EXCEPTION 'event_id must match event_chats.event_id for chat_id';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_event_chat_messages_enforce_event_id ON public.event_chat_messages;
CREATE TRIGGER trg_event_chat_messages_enforce_event_id
    BEFORE INSERT OR UPDATE OF chat_id, event_id ON public.event_chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.event_chat_messages_enforce_event_id();

-- Touch updated_at when body changes
CREATE OR REPLACE FUNCTION public.event_chat_messages_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.body IS DISTINCT FROM OLD.body THEN
        NEW.updated_at = now();
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_event_chat_messages_set_updated_at ON public.event_chat_messages;
CREATE TRIGGER trg_event_chat_messages_set_updated_at
    BEFORE UPDATE ON public.event_chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.event_chat_messages_set_updated_at();

ALTER TABLE public.event_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY event_chat_messages_select_team ON public.event_chat_messages
    FOR SELECT
    USING (public.can_access_event_team_chat(event_id));

CREATE POLICY event_chat_messages_insert_team ON public.event_chat_messages
    FOR INSERT
    WITH CHECK (
        sender_id = auth.uid()
        AND public.can_access_event_team_chat(event_id)
    );

-- Sender may edit own active message body; managers/creator may soft-delete
CREATE POLICY event_chat_messages_update_team ON public.event_chat_messages
    FOR UPDATE
    USING (
        public.can_access_event_team_chat(event_id)
        AND (
            (
                sender_id = auth.uid()
                AND deleted_at IS NULL
            )
            OR public.has_permission('events.manage_all')
            OR EXISTS (
                SELECT 1
                FROM public.events e
                WHERE e.id = event_id
                  AND e.created_by = auth.uid()
            )
        )
    )
    WITH CHECK (
        public.can_access_event_team_chat(event_id)
        AND (
            (
                sender_id = auth.uid()
                AND deleted_at IS NULL
            )
            OR public.has_permission('events.manage_all')
            OR EXISTS (
                SELECT 1
                FROM public.events e
                WHERE e.id = event_id
                  AND e.created_by = auth.uid()
            )
        )
    );

-- ── 4. Realtime (messages only) ─────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE public.event_chat_messages;
