-- 111: Stripe webhook event dedupe + outcome audit (§13.10 line 441)

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
    stripe_event_id     TEXT PRIMARY KEY,
    event_type          TEXT NOT NULL,
    status              TEXT NOT NULL DEFAULT 'received'
                        CHECK (status IN ('received', 'processed', 'skipped', 'error')),
    error_message       TEXT NULL,
    plan_id             UUID NULL,
    installment_id      UUID NULL,
    jm_type             TEXT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at        TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_type_created
    ON stripe_webhook_events (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_status
    ON stripe_webhook_events (status)
    WHERE status IN ('received', 'error');

ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS stripe_webhook_events_service_all ON stripe_webhook_events;
CREATE POLICY stripe_webhook_events_service_all ON stripe_webhook_events
    FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

COMMENT ON TABLE stripe_webhook_events IS
  'Stripe event.id dedupe + thin audit log; reconcile recovers mid-flight failures';
