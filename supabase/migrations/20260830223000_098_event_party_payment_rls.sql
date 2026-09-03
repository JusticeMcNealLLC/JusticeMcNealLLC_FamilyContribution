-- 098: Tighten RLS on event_parties / event_seats / payment tables
-- Spec: docs/product/improvements/pages/events/005_event_party_payment_rls.md
-- No anon access; guest/magic-link via service_role edge functions only.

CREATE OR REPLACE FUNCTION public.can_manage_event_party_data(p_event_id uuid)
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

REVOKE ALL ON FUNCTION public.can_manage_event_party_data(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_event_party_data(uuid) TO authenticated;

-- ── event_parties ───────────────────────────────────────────

DROP POLICY IF EXISTS event_parties_auth_select ON event_parties;
DROP POLICY IF EXISTS event_parties_service_all ON event_parties;
DROP POLICY IF EXISTS event_parties_payer_update ON event_parties;
DROP POLICY IF EXISTS event_parties_host_select ON event_parties;
DROP POLICY IF EXISTS event_parties_payer_select ON event_parties;
DROP POLICY IF EXISTS event_parties_host_update ON event_parties;

CREATE POLICY event_parties_service_all ON event_parties
    FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY event_parties_host_select ON event_parties
    FOR SELECT USING (public.can_manage_event_party_data(event_id));

CREATE POLICY event_parties_payer_select ON event_parties
    FOR SELECT USING (
        payer_kind = 'member'
        AND payer_user_id = auth.uid()
    );

CREATE POLICY event_parties_payer_update ON event_parties
    FOR UPDATE USING (
        payer_kind = 'member'
        AND payer_user_id = auth.uid()
        AND status <> 'cancelled'
    );

CREATE POLICY event_parties_host_update ON event_parties
    FOR UPDATE USING (public.can_manage_event_party_data(event_id));

-- ── event_seats ─────────────────────────────────────────────

DROP POLICY IF EXISTS event_seats_auth_select ON event_seats;
DROP POLICY IF EXISTS event_seats_service_all ON event_seats;
DROP POLICY IF EXISTS event_seats_host_select ON event_seats;
DROP POLICY IF EXISTS event_seats_payer_select ON event_seats;
DROP POLICY IF EXISTS event_seats_host_update ON event_seats;

CREATE POLICY event_seats_service_all ON event_seats
    FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY event_seats_host_select ON event_seats
    FOR SELECT USING (public.can_manage_event_party_data(event_id));

CREATE POLICY event_seats_payer_select ON event_seats
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.event_parties p
            WHERE p.id = event_seats.party_id
              AND p.payer_kind = 'member'
              AND p.payer_user_id = auth.uid()
        )
    );

CREATE POLICY event_seats_host_update ON event_seats
    FOR UPDATE USING (public.can_manage_event_party_data(event_id));

-- ── event_payment_plans (host/payer SELECT only; money writes via service_role) ──

DROP POLICY IF EXISTS event_payment_plans_auth_select ON event_payment_plans;
DROP POLICY IF EXISTS event_payment_plans_service_all ON event_payment_plans;
DROP POLICY IF EXISTS event_payment_plans_host_select ON event_payment_plans;
DROP POLICY IF EXISTS event_payment_plans_payer_select ON event_payment_plans;

CREATE POLICY event_payment_plans_service_all ON event_payment_plans
    FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY event_payment_plans_host_select ON event_payment_plans
    FOR SELECT USING (public.can_manage_event_party_data(event_id));

CREATE POLICY event_payment_plans_payer_select ON event_payment_plans
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.event_parties p
            WHERE p.id = event_payment_plans.party_id
              AND p.payer_kind = 'member'
              AND p.payer_user_id = auth.uid()
        )
    );

-- ── event_payment_installments ──────────────────────────────

DROP POLICY IF EXISTS event_payment_installments_auth_select ON event_payment_installments;
DROP POLICY IF EXISTS event_payment_installments_service_all ON event_payment_installments;
DROP POLICY IF EXISTS event_payment_installments_host_select ON event_payment_installments;
DROP POLICY IF EXISTS event_payment_installments_payer_select ON event_payment_installments;

CREATE POLICY event_payment_installments_service_all ON event_payment_installments
    FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY event_payment_installments_host_select ON event_payment_installments
    FOR SELECT USING (public.can_manage_event_party_data(event_id));

CREATE POLICY event_payment_installments_payer_select ON event_payment_installments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.event_parties p
            WHERE p.id = event_payment_installments.party_id
              AND p.payer_kind = 'member'
              AND p.payer_user_id = auth.uid()
        )
    );

COMMENT ON FUNCTION public.can_manage_event_party_data(uuid) IS
  'Event creator, event_hosts, or events.manage_all may manage party/seat roster data';
