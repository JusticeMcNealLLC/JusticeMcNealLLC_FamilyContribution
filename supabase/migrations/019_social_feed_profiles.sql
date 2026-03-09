-- ╔══════════════════════════════════════════════════════════════╗
-- ║  Migration 019 — Social Feed & Member Profiles (Phase 4A+4B) ║
-- ╚══════════════════════════════════════════════════════════════╝

-- ────────────────────────────────────────────────────────────────
-- 1. Profile enhancements (bio, cover photo, privacy settings)
-- ────────────────────────────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS cover_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS profile_visibility TEXT DEFAULT 'family' CHECK (profile_visibility IN ('family', 'private')),
  ADD COLUMN IF NOT EXISTS show_contribution_stats BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS show_birthday BOOLEAN DEFAULT TRUE;

-- ────────────────────────────────────────────────────────────────
-- 2. Posts table
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT DEFAULT '',
    post_type TEXT NOT NULL DEFAULT 'text' CHECK (post_type IN ('text', 'photo', 'video', 'link', 'announcement', 'milestone')),
    visibility TEXT NOT NULL DEFAULT 'family' CHECK (visibility IN ('family', 'private')),
    is_pinned BOOLEAN DEFAULT FALSE,
    link_url TEXT,
    link_title TEXT,
    link_description TEXT,
    link_image TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_pinned ON posts(is_pinned, created_at DESC);

-- ────────────────────────────────────────────────────────────────
-- 3. Post images (supports multi-image carousel posts)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS post_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_images_post ON post_images(post_id, sort_order);

-- ────────────────────────────────────────────────────────────────
-- 4. Post likes (with emoji reactions)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS post_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reaction TEXT NOT NULL DEFAULT '❤️',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_post_likes_post ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user ON post_likes(user_id);

-- ────────────────────────────────────────────────────────────────
-- 5. Post comments (threaded — parent_id for replies)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS post_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id, created_at);
CREATE INDEX IF NOT EXISTS idx_post_comments_parent ON post_comments(parent_id);

-- ────────────────────────────────────────────────────────────────
-- 6. Post bookmarks
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS post_bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_post_bookmarks_user ON post_bookmarks(user_id, created_at DESC);

-- ────────────────────────────────────────────────────────────────
-- 7. Notifications
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('like', 'comment', 'reply', 'mention', 'announcement', 'milestone', 'follow')),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

-- ────────────────────────────────────────────────────────────────
-- 8. RLS Policies
-- ────────────────────────────────────────────────────────────────
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- POSTS: everyone can see family-visible posts; authors see their own private posts
CREATE POLICY "posts_select" ON posts FOR SELECT USING (
    visibility = 'family' OR author_id = auth.uid()
);
CREATE POLICY "posts_insert" ON posts FOR INSERT WITH CHECK (
    author_id = auth.uid()
);
CREATE POLICY "posts_update" ON posts FOR UPDATE USING (
    author_id = auth.uid()
);
CREATE POLICY "posts_delete" ON posts FOR DELETE USING (
    author_id = auth.uid()
);
-- Admin: allow admins to pin/unpin and delete any post
CREATE POLICY "posts_admin_update" ON posts FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "posts_admin_delete" ON posts FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- POST IMAGES: visible if parent post is visible
CREATE POLICY "post_images_select" ON post_images FOR SELECT USING (
    EXISTS (SELECT 1 FROM posts WHERE posts.id = post_images.post_id AND (posts.visibility = 'family' OR posts.author_id = auth.uid()))
);
CREATE POLICY "post_images_insert" ON post_images FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM posts WHERE posts.id = post_images.post_id AND posts.author_id = auth.uid())
);
CREATE POLICY "post_images_delete" ON post_images FOR DELETE USING (
    EXISTS (SELECT 1 FROM posts WHERE posts.id = post_images.post_id AND posts.author_id = auth.uid())
);

-- LIKES: everyone sees; users manage their own
CREATE POLICY "post_likes_select" ON post_likes FOR SELECT USING (TRUE);
CREATE POLICY "post_likes_insert" ON post_likes FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "post_likes_delete" ON post_likes FOR DELETE USING (user_id = auth.uid());

-- COMMENTS: everyone sees; users manage their own
CREATE POLICY "post_comments_select" ON post_comments FOR SELECT USING (TRUE);
CREATE POLICY "post_comments_insert" ON post_comments FOR INSERT WITH CHECK (author_id = auth.uid());
CREATE POLICY "post_comments_update" ON post_comments FOR UPDATE USING (author_id = auth.uid());
CREATE POLICY "post_comments_delete" ON post_comments FOR DELETE USING (
    author_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- BOOKMARKS: users see only their own
CREATE POLICY "post_bookmarks_select" ON post_bookmarks FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "post_bookmarks_insert" ON post_bookmarks FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "post_bookmarks_delete" ON post_bookmarks FOR DELETE USING (user_id = auth.uid());

-- NOTIFICATIONS: users see only their own
CREATE POLICY "notifications_select" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notifications_update" ON notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "notifications_insert" ON notifications FOR INSERT WITH CHECK (TRUE);

-- ────────────────────────────────────────────────────────────────
-- 9. Updated_at trigger for posts & comments
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS posts_updated_at ON posts;
CREATE TRIGGER posts_updated_at BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS post_comments_updated_at ON post_comments;
CREATE TRIGGER post_comments_updated_at BEFORE UPDATE ON post_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ────────────────────────────────────────────────────────────────
-- 10. Create storage bucket for post media
-- ────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'post-media',
    'post-media',
    TRUE,
    10485760,  -- 10 MB
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: authenticated users can upload to their own folder
CREATE POLICY "post_media_upload" ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'post-media' AND auth.role() = 'authenticated'
);
CREATE POLICY "post_media_select" ON storage.objects FOR SELECT USING (
    bucket_id = 'post-media'
);
CREATE POLICY "post_media_delete" ON storage.objects FOR DELETE USING (
    bucket_id = 'post-media' AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Also add a cover-photos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'cover-photos',
    'cover-photos',
    TRUE,
    5242880,  -- 5 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "cover_photos_upload" ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'cover-photos' AND auth.role() = 'authenticated'
);
CREATE POLICY "cover_photos_select" ON storage.objects FOR SELECT USING (
    bucket_id = 'cover-photos'
);
CREATE POLICY "cover_photos_delete" ON storage.objects FOR DELETE USING (
    bucket_id = 'cover-photos' AND auth.uid()::text = (storage.foldername(name))[1]
);
