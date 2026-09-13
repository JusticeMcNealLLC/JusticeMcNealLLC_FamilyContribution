-- 116: Paid events — public going count only includes paid RSVPs
-- Unpaid Checkout prep rows (status=going, paid=false) must not show as "going".

CREATE OR REPLACE FUNCTION public.public_event_going_count(p_event_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN (
      SELECT pricing_mode FROM public.events WHERE id = p_event_id LIMIT 1
    ) = 'paid' THEN (
      (SELECT COUNT(*)::int
       FROM public.event_rsvps
       WHERE event_id = p_event_id
         AND status = 'going'
         AND paid = TRUE)
      +
      (SELECT COUNT(*)::int
       FROM public.event_guest_rsvps
       WHERE event_id = p_event_id
         AND paid = TRUE)
    )
    ELSE (
      (SELECT COUNT(*)::int
       FROM public.event_rsvps
       WHERE event_id = p_event_id
         AND status = 'going')
      +
      (SELECT COUNT(*)::int
       FROM public.event_guest_rsvps
       WHERE event_id = p_event_id
         AND (status = 'going' OR paid = TRUE))
    )
  END;
$$;

COMMENT ON FUNCTION public.public_event_going_count(uuid) IS
  'Public attendance integer. Paid events: paid=true only. Free/other: status going (guests going OR paid).';

GRANT EXECUTE ON FUNCTION public.public_event_going_count(uuid) TO anon, authenticated;
