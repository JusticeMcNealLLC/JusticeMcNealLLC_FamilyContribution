-- ─── Migration 025: Push Notification Subscriptions ─────────────────────
-- Stores Web Push subscriptions + trigger to send push on notification INSERT
-- ──────────────────────────────────────────────────────────────────────────

-- 1) Push subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint    TEXT NOT NULL,
    p256dh      TEXT NOT NULL,          -- browser public key
    auth_key    TEXT NOT NULL,          -- browser auth secret
    user_agent  TEXT,                    -- for debugging
    created_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, endpoint)           -- one sub per browser per user
);

-- Index for fast lookup by user
CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);

-- 2) RLS policies
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can manage their own subscriptions
CREATE POLICY push_subs_select ON push_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY push_subs_insert ON push_subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY push_subs_delete ON push_subscriptions
    FOR DELETE USING (auth.uid() = user_id);

-- Service role (edge functions) can read all for sending
CREATE POLICY push_subs_service_select ON push_subscriptions
    FOR SELECT TO service_role USING (true);

-- 3) Trigger function: call send-push edge function on notification INSERT
--    Uses pg_net to make async HTTP POST to the edge function
CREATE OR REPLACE FUNCTION notify_push_on_insert()
RETURNS TRIGGER AS $$
DECLARE
    edge_url TEXT := 'https://jcrsfzcabzdeqixbewgf.supabase.co/functions/v1/send-push-notification';
    service_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjcnNmemNhYnpkZXFpeGJld2dmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODQ0MjQzMSwiZXhwIjoyMDg0MDE4NDMxfQ.HL0A5s9uWXX2njDXK0M5lBEeBemKFVi6E3Q6JXWUBOM';
BEGIN
    -- Fire async HTTP POST via pg_net
    PERFORM net.http_post(
        url     := edge_url,
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || service_key
        ),
        body    := jsonb_build_object(
            'notification_id', NEW.id,
            'user_id', NEW.user_id,
            'type', NEW.type,
            'message', NEW.message,
            'actor_name', NEW.actor_name,
            'link', NEW.link
        )
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4) Attach trigger to notifications table
DROP TRIGGER IF EXISTS trg_push_on_notification ON notifications;
CREATE TRIGGER trg_push_on_notification
    AFTER INSERT ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION notify_push_on_insert();
