-- Migration 021: Comment Likes (Instagram-style)
-- Allows users to heart/like individual comments on posts

CREATE TABLE IF NOT EXISTS comment_likes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id uuid NOT NULL REFERENCES post_comments(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    UNIQUE(comment_id, user_id)
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user ON comment_likes(user_id);

-- RLS
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read comment likes
CREATE POLICY "Anyone can view comment likes"
    ON comment_likes FOR SELECT
    TO authenticated
    USING (true);

-- Users can insert their own likes
CREATE POLICY "Users can like comments"
    ON comment_likes FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Users can remove their own likes
CREATE POLICY "Users can unlike comments"
    ON comment_likes FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
