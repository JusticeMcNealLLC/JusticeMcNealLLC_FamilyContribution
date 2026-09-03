-- 103: Allow event creators/hosts to manage competition_phases (submission window setup)

CREATE OR REPLACE FUNCTION public.can_manage_event_competition(p_event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT auth.uid() IS NOT NULL
        AND (
            public.has_permission('events.manage_all')
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

REVOKE ALL ON FUNCTION public.can_manage_event_competition(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_event_competition(uuid) TO authenticated;

CREATE POLICY comp_phases_host_write ON competition_phases
    FOR ALL
    USING (public.can_manage_event_competition(event_id))
    WITH CHECK (public.can_manage_event_competition(event_id));

COMMENT ON FUNCTION public.can_manage_event_competition(uuid) IS
  'Event creator, event_hosts, or events.manage_all may manage competition phases';
