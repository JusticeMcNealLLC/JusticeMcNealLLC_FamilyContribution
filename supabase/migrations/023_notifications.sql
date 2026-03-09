-- ─── Notifications Table ─────────────────────────────────
-- Stores all user notifications (likes, comments, quests, etc.)
-- Real-time enabled for instant push.

CREATE TABLE IF NOT EXISTS notifications (
    id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id     uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    type        text NOT NULL DEFAULT 'system',
    message     text,
    actor_id    uuid REFERENCES profiles(id) ON DELETE SET NULL,
    actor_name  text,
    actor_avatar text,
    link        text,
    read_at     timestamptz,
    created_at  timestamptz DEFAULT now() NOT NULL
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id) WHERE read_at IS NULL;

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
CREATE POLICY "Users can read own notifications"
    ON notifications FOR SELECT
    USING (auth.uid() = user_id);

-- Users can update (mark read) their own notifications
CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Service role / triggers can insert notifications for anyone
CREATE POLICY "Service can insert notifications"
    ON notifications FOR INSERT
    WITH CHECK (true);

-- Enable real-time for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ─── Helper function to create a notification ───────────
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id uuid,
    p_type text,
    p_message text DEFAULT NULL,
    p_actor_id uuid DEFAULT NULL,
    p_link text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_id uuid;
    v_actor_name text;
    v_actor_avatar text;
BEGIN
    -- Don't notify yourself
    IF p_actor_id = p_user_id THEN
        RETURN NULL;
    END IF;

    -- Get actor details
    IF p_actor_id IS NOT NULL THEN
        SELECT
            COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''),
            profile_picture_url
        INTO v_actor_name, v_actor_avatar
        FROM profiles WHERE id = p_actor_id;
    END IF;

    INSERT INTO notifications (user_id, type, message, actor_id, actor_name, actor_avatar, link)
    VALUES (p_user_id, p_type, p_message, p_actor_id, TRIM(v_actor_name), v_actor_avatar, p_link)
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$;
