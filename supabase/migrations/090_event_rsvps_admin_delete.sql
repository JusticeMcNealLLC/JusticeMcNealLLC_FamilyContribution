-- Allow event admins/managers to remove member RSVP records from managed events.
-- The original policy only allowed members to delete their own RSVP, which blocked
-- the admin cleanup controls for test member RSVPs.

DROP POLICY IF EXISTS "rsvps_delete_managed_events" ON event_rsvps;

CREATE POLICY "rsvps_delete_managed_events" ON event_rsvps
    FOR DELETE USING (
        public.has_permission('events.manage_all')
        OR EXISTS (
            SELECT 1
            FROM events
            WHERE events.id = event_rsvps.event_id
              AND events.created_by = auth.uid()
        )
        OR EXISTS (
            SELECT 1
            FROM event_hosts
            WHERE event_hosts.event_id = event_rsvps.event_id
              AND event_hosts.user_id = auth.uid()
        )
    );