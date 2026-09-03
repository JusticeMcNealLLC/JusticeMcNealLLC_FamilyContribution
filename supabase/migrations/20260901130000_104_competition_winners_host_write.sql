-- 104: Allow event creators/hosts to insert competition_winners (finalize by votes)

CREATE POLICY comp_winners_host_write ON competition_winners
    FOR INSERT
    WITH CHECK (public.can_manage_event_competition(event_id));

COMMENT ON POLICY comp_winners_host_write ON competition_winners IS
  'Event creator, event_hosts, or events.manage_all may finalize competition winners';
