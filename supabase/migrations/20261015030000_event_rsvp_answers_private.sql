-- Keep creator-defined RSVP answers private to event managers.
-- The initial RSVP-question migration added answer columns to the public
-- roster tables, whose existing SELECT policies are intentionally broad.
-- Move the values to a manager-scoped table before dropping those columns.

CREATE TABLE IF NOT EXISTS public.event_rsvp_answers (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id            UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    event_rsvp_id       UUID REFERENCES public.event_rsvps(id) ON DELETE CASCADE,
    event_guest_rsvp_id UUID REFERENCES public.event_guest_rsvps(id) ON DELETE CASCADE,
    answers             JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT event_rsvp_answers_one_owner CHECK (
        (event_rsvp_id IS NOT NULL)::integer + (event_guest_rsvp_id IS NOT NULL)::integer = 1
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS event_rsvp_answers_member_uidx
    ON public.event_rsvp_answers(event_rsvp_id);

CREATE UNIQUE INDEX IF NOT EXISTS event_rsvp_answers_guest_uidx
    ON public.event_rsvp_answers(event_guest_rsvp_id);

CREATE INDEX IF NOT EXISTS event_rsvp_answers_event_idx
    ON public.event_rsvp_answers(event_id);

ALTER TABLE public.event_rsvp_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS event_rsvp_answers_service_all ON public.event_rsvp_answers;
CREATE POLICY event_rsvp_answers_service_all ON public.event_rsvp_answers
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS event_rsvp_answers_manager_select ON public.event_rsvp_answers;
CREATE POLICY event_rsvp_answers_manager_select ON public.event_rsvp_answers
    FOR SELECT USING (
        public.has_permission('events.manage_all')
        OR EXISTS (
            SELECT 1 FROM public.events e
            WHERE e.id = event_rsvp_answers.event_id
              AND e.created_by = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.event_hosts h
            WHERE h.event_id = event_rsvp_answers.event_id
              AND h.user_id = auth.uid()
        )
    );

INSERT INTO public.event_rsvp_answers (event_id, event_rsvp_id, answers)
SELECT event_id, id, rsvp_answers
FROM public.event_rsvps
WHERE rsvp_answers IS NOT NULL
  AND rsvp_answers <> '{}'::jsonb
ON CONFLICT (event_rsvp_id) DO UPDATE
SET answers = EXCLUDED.answers,
    updated_at = NOW();

INSERT INTO public.event_rsvp_answers (event_id, event_guest_rsvp_id, answers)
SELECT event_id, id, rsvp_answers
FROM public.event_guest_rsvps
WHERE rsvp_answers IS NOT NULL
  AND rsvp_answers <> '{}'::jsonb
ON CONFLICT (event_guest_rsvp_id) DO UPDATE
SET answers = EXCLUDED.answers,
    updated_at = NOW();

ALTER TABLE public.event_rsvps DROP COLUMN IF EXISTS rsvp_answers;
ALTER TABLE public.event_guest_rsvps DROP COLUMN IF EXISTS rsvp_answers;

COMMENT ON TABLE public.event_rsvp_answers IS
    'Private creator-defined RSVP answers; readable only by event managers.';
