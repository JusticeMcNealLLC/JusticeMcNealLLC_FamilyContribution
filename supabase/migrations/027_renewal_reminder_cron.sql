-- ============================================================
-- Migration 027: Subscription Renewal Reminder (3 days before)
-- Sends a push notification reminding members their
-- subscription is about to renew.
-- ============================================================

-- Ensure extensions are available (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_cron   WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net    WITH SCHEMA extensions;

-- ─── Function: send_renewal_reminders ───────────────────────
-- Finds active subscriptions renewing in ~3 days that haven't
-- already received a reminder for this billing cycle, and
-- inserts a notification (which auto-triggers push via the
-- existing trg_push_on_notification trigger).
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION send_renewal_reminders()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    r RECORD;
    v_amount_text text;
    v_msg text;
BEGIN
    FOR r IN
        SELECT
            s.id           AS sub_id,
            s.user_id,
            s.current_amount_cents,
            s.current_period_end,
            p.first_name
        FROM subscriptions s
        JOIN profiles p ON p.id = s.user_id
        WHERE s.status IN ('active', 'trialing')
          AND s.cancel_at_period_end = false
          AND s.current_period_end IS NOT NULL
          -- Renewal window: between 2 and 4 days from now
          -- (gives a full 24-hour window so the daily cron never misses)
          AND s.current_period_end >= (now() + interval '2 days')
          AND s.current_period_end <  (now() + interval '4 days')
          -- Skip if we already sent a reminder for this cycle
          AND NOT EXISTS (
              SELECT 1 FROM notifications n
              WHERE n.user_id = s.user_id
                AND n.type    = 'renewal_reminder'
                AND n.created_at >= (s.current_period_end - interval '7 days')
          )
    LOOP
        -- Format dollar amount
        v_amount_text := '$' || TRIM(TO_CHAR(r.current_amount_cents / 100.0, 'FM999,999.00'));

        v_msg := 'Hey ' || COALESCE(r.first_name, 'there') || '! '
              || 'Your ' || v_amount_text || '/month membership renews on '
              || TO_CHAR(r.current_period_end AT TIME ZONE 'America/Chicago', 'Mon DD')
              || '. No action needed — just a heads-up! 💳';

        -- Insert notification (push is auto-sent by DB trigger)
        PERFORM create_notification(
            r.user_id,
            'renewal_reminder',
            v_msg,
            NULL,            -- no actor (system message)
            '/portal/settings.html'  -- link to subscription settings
        );
    END LOOP;
END;
$$;

-- ─── Schedule: run daily at 9:00 AM UTC (4 AM Central) ─────
-- Unschedule first in case it already exists (idempotent)
SELECT cron.unschedule('daily-renewal-reminders')
WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'daily-renewal-reminders'
);

SELECT cron.schedule(
    'daily-renewal-reminders',
    '0 9 * * *',
    $$SELECT send_renewal_reminders();$$
);
