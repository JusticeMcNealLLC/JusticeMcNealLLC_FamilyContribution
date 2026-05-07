-- ============================================================
-- 087: Events — allow hosts/admins to assign winner-choice prizes
-- Hosts need to update pending_choice winner rows after the draw.
-- ============================================================

DROP POLICY IF EXISTS raffle_winners_update_admin ON event_raffle_winners;

CREATE POLICY raffle_winners_update_admin ON event_raffle_winners
    FOR UPDATE
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
        OR EXISTS (
            SELECT 1 FROM events WHERE id = event_id AND created_by = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
        OR EXISTS (
            SELECT 1 FROM events WHERE id = event_id AND created_by = auth.uid()
        )
    );