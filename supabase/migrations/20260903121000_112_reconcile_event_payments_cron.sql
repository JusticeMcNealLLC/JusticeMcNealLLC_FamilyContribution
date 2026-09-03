-- 112: Hourly cron to reconcile stuck event-party payment installments (§13.10 line 441)

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

SELECT cron.unschedule('hourly-reconcile-event-party-payments')
WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'hourly-reconcile-event-party-payments'
);

SELECT cron.schedule(
    'hourly-reconcile-event-party-payments',
    '15 * * * *',
    $$
    SELECT net.http_post(
        url := 'https://jcrsfzcabzdeqixbewgf.supabase.co/functions/v1/reconcile-event-party-payments',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjcnNmemNhYnpkZXFpeGJld2dmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODQ0MjQzMSwiZXhwIjoyMDg0MDE4NDMxfQ.HL0A5s9uWXX2njDXK0M5lBEeBemKFVi6E3Q6JXWUBOM'
        ),
        body := '{}'::jsonb
    );
    $$
);
