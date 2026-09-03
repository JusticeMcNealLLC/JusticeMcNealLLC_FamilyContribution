-- 097: event_payment_plans + event_payment_installments
-- Spec: docs/product/improvements/pages/events/003_event_payment_schedule_migration_draft.md
-- Requires: event_parties (096)

CREATE TABLE IF NOT EXISTS event_payment_plans (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_id                    UUID NOT NULL UNIQUE REFERENCES event_parties(id) ON DELETE CASCADE,
    event_id                    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    plan_kind                   TEXT NOT NULL CHECK (plan_kind IN ('full', 'monthly')),
    method                      TEXT NOT NULL CHECK (method IN ('ach', 'card')),
    currency                    TEXT NOT NULL DEFAULT 'usd',
    base_total_cents            INT NOT NULL CHECK (base_total_cents >= 0),
    fee_cents                   INT NOT NULL DEFAULT 0 CHECK (fee_cents >= 0),
    total_due_cents             INT NOT NULL CHECK (total_due_cents >= 0),
    amount_paid_cents           INT NOT NULL DEFAULT 0 CHECK (amount_paid_cents >= 0),
    remaining_cents             INT NOT NULL CHECK (remaining_cents >= 0),
    fund_deadline               TIMESTAMPTZ NOT NULL,
    anchor_at                   TIMESTAMPTZ NOT NULL,
    next_debit_at               TIMESTAMPTZ NULL,
    status                      TEXT NOT NULL DEFAULT 'setup'
                                CHECK (status IN ('setup', 'active', 'past_due', 'completed', 'cancelled')),
    stripe_customer_id          TEXT NULL,
    stripe_payment_method_id    TEXT NULL,
    amenity_vote_committed_at   TIMESTAMPTZ NULL,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_payment_plans_event ON event_payment_plans(event_id);
CREATE INDEX IF NOT EXISTS idx_event_payment_plans_status ON event_payment_plans(status);
CREATE INDEX IF NOT EXISTS idx_event_payment_plans_next_debit ON event_payment_plans(next_debit_at)
    WHERE next_debit_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS event_payment_installments (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id                     UUID NOT NULL REFERENCES event_payment_plans(id) ON DELETE CASCADE,
    event_id                    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    party_id                    UUID NOT NULL REFERENCES event_parties(id) ON DELETE CASCADE,
    sequence                    INT NOT NULL CHECK (sequence >= 1),
    kind                        TEXT NOT NULL CHECK (kind IN ('scheduled', 'payoff', 'full')),
    due_at                      TIMESTAMPTZ NOT NULL,
    amount_cents                INT NOT NULL CHECK (amount_cents >= 0),
    status                      TEXT NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'cancelled')),
    stripe_payment_intent_id    TEXT NULL,
    stripe_charge_id            TEXT NULL,
    attempted_at                TIMESTAMPTZ NULL,
    succeeded_at                TIMESTAMPTZ NULL,
    failure_code                TEXT NULL,
    failure_message             TEXT NULL,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (plan_id, sequence)
);

CREATE INDEX IF NOT EXISTS idx_event_payment_installments_plan ON event_payment_installments(plan_id);
CREATE INDEX IF NOT EXISTS idx_event_payment_installments_due ON event_payment_installments(due_at, status);
CREATE INDEX IF NOT EXISTS idx_event_payment_installments_pi ON event_payment_installments(stripe_payment_intent_id)
    WHERE stripe_payment_intent_id IS NOT NULL;

ALTER TABLE event_payment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_payment_installments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS event_payment_plans_service_all ON event_payment_plans;
CREATE POLICY event_payment_plans_service_all ON event_payment_plans
    FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS event_payment_installments_service_all ON event_payment_installments;
CREATE POLICY event_payment_installments_service_all ON event_payment_installments
    FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS event_payment_plans_auth_select ON event_payment_plans;
CREATE POLICY event_payment_plans_auth_select ON event_payment_plans
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS event_payment_installments_auth_select ON event_payment_installments;
CREATE POLICY event_payment_installments_auth_select ON event_payment_installments
    FOR SELECT USING (auth.role() = 'authenticated');

COMMENT ON TABLE event_payment_plans IS 'App-owned event party payment plan; anniversary monthly or full; not Stripe Subscription';
COMMENT ON TABLE event_payment_installments IS 'Individual charges for an event payment plan';
COMMENT ON COLUMN event_payment_plans.fund_deadline IS 'Snapshot of event fund_deadline at plan commit';
COMMENT ON COLUMN event_payment_plans.anchor_at IS 'Anniversary basis for monthly due dates';
