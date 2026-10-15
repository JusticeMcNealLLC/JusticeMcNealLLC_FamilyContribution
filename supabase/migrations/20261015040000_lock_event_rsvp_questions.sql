-- Keep the RSVP question catalog stable once responses exist.
-- The portal also disables the editor client-side; this protects direct API
-- updates and keeps stored answer IDs meaningful.

CREATE OR REPLACE FUNCTION public.prevent_event_rsvp_question_changes_after_rsvp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.rsvp_questions IS DISTINCT FROM OLD.rsvp_questions
       AND (
           EXISTS (SELECT 1 FROM public.event_rsvps WHERE event_id = OLD.id)
           OR EXISTS (SELECT 1 FROM public.event_guest_rsvps WHERE event_id = OLD.id)
       ) THEN
        RAISE EXCEPTION 'RSVP questions cannot be changed after RSVPs exist';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS event_rsvp_questions_lock ON public.events;
CREATE TRIGGER event_rsvp_questions_lock
    BEFORE UPDATE OF rsvp_questions ON public.events
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_event_rsvp_question_changes_after_rsvp();

REVOKE ALL ON FUNCTION public.prevent_event_rsvp_question_changes_after_rsvp() FROM PUBLIC;
