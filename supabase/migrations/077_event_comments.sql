-- Event Comments / Discussion
-- Allows members and guests to leave comments on events

CREATE TABLE IF NOT EXISTS event_comments (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id     UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,  -- NULL for guest comments
    guest_name   TEXT,                                               -- name for guest commenters
    guest_token  TEXT,                                               -- guest_token for identity
    body         TEXT NOT NULL CHECK (char_length(body) <= 2000),
    parent_id    UUID REFERENCES event_comments(id) ON DELETE CASCADE,  -- for threaded replies (future)
    created_at   TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_event_comments_event ON event_comments(event_id, created_at);
CREATE INDEX idx_event_comments_user  ON event_comments(user_id);

-- RLS
ALTER TABLE event_comments ENABLE ROW LEVEL SECURITY;

-- Anyone can read comments on any event
CREATE POLICY "Anyone can view event comments"
    ON event_comments FOR SELECT
    USING (true);

-- Authenticated users can insert comments
CREATE POLICY "Authenticated users can comment"
    ON event_comments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Guest comments (user_id is null, guest_token present)
CREATE POLICY "Guests can comment with token"
    ON event_comments FOR INSERT
    WITH CHECK (user_id IS NULL AND guest_token IS NOT NULL);

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments"
    ON event_comments FOR DELETE
    USING (auth.uid() = user_id);
