-- ============================================================
-- Migration 018: Daily cron for birthday payouts
-- Uses pg_cron + pg_net to call the birthday-payout edge function
-- every day at 8:00 AM UTC (3:00 AM EST / 4:00 AM EDT).
-- ============================================================

-- Enable extensions (no-op if already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule the cron job: runs daily at 08:00 UTC
SELECT cron.schedule(
  'daily-birthday-payouts',          -- unique job name
  '0 8 * * *',                        -- every day at 08:00 UTC
  $$
  SELECT extensions.http(
    (
      'POST',
      'https://jcrsfzcabzdeqixbewgf.supabase.co/functions/v1/birthday-payout',
      ARRAY[
        extensions.http_header('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjcnNmemNhYnpkZXFpeGJld2dmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODQ0MjQzMSwiZXhwIjoyMDg0MDE4NDMxfQ.HL0A5s9uWXX2njDXK0M5lBEeBemKFVi6E3Q6JXWUBOM'),
        extensions.http_header('Content-Type', 'application/json')
      ],
      'application/json',
      '{}'
    )::extensions.http_request
  );
  $$
);
