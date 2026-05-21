-- ════════════════════════════════════════════════════════════
-- Migration 092 — Public event going count (aggregate only)
-- Privacy-safe integer for anonymous public event pages.
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.public_event_going_count(p_event_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    (SELECT COUNT(*)::int
     FROM public.event_rsvps
     WHERE event_id = p_event_id
       AND status = 'going')
    +
    (SELECT COUNT(*)::int
     FROM public.event_guest_rsvps
     WHERE event_id = p_event_id
       AND (status = 'going' OR paid = TRUE))
  );
$$;

GRANT EXECUTE ON FUNCTION public.public_event_going_count(uuid) TO anon, authenticated;
