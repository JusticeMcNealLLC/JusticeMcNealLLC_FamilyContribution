-- Creator-defined RSVP questions and attendee answers.
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS rsvp_questions JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.event_rsvps
  ADD COLUMN IF NOT EXISTS rsvp_answers JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.event_guest_rsvps
  ADD COLUMN IF NOT EXISTS rsvp_answers JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.events.rsvp_questions IS
  'Creator-defined RSVP questions: [{id, prompt, type, required, choices}]';

COMMENT ON COLUMN public.event_rsvps.rsvp_answers IS
  'Normalized answers keyed by event rsvp_questions id';

COMMENT ON COLUMN public.event_guest_rsvps.rsvp_answers IS
  'Normalized answers keyed by event rsvp_questions id';
