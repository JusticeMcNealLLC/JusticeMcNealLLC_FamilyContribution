-- ══════════════════════════════════════════════════════════
-- Migration 061: Banner editor columns + storage bucket
-- Adds foreground image, Lottie styling, and bg_image_url
-- columns to the cosmetics table for the admin banner editor.
-- ══════════════════════════════════════════════════════════

-- Background image URL (replaces need for static CSS classes on new banners)
ALTER TABLE cosmetics ADD COLUMN IF NOT EXISTS bg_image_url TEXT;

-- Foreground image overlay
ALTER TABLE cosmetics ADD COLUMN IF NOT EXISTS foreground_url TEXT;
ALTER TABLE cosmetics ADD COLUMN IF NOT EXISTS foreground_x INTEGER DEFAULT 50;
ALTER TABLE cosmetics ADD COLUMN IF NOT EXISTS foreground_y INTEGER DEFAULT 50;
ALTER TABLE cosmetics ADD COLUMN IF NOT EXISTS foreground_width INTEGER DEFAULT 40;
ALTER TABLE cosmetics ADD COLUMN IF NOT EXISTS foreground_opacity INTEGER DEFAULT 100;

-- Lottie styling overrides
ALTER TABLE cosmetics ADD COLUMN IF NOT EXISTS lottie_opacity INTEGER DEFAULT 55;
ALTER TABLE cosmetics ADD COLUMN IF NOT EXISTS lottie_blend TEXT DEFAULT 'screen';
ALTER TABLE cosmetics ADD COLUMN IF NOT EXISTS lottie_scale INTEGER DEFAULT 100;

-- ── Storage bucket for banner assets ─────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('banner-assets', 'banner-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access
CREATE POLICY "Public read banner assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'banner-assets');

-- Admin-only upload / delete
CREATE POLICY "Admin upload banner assets"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'banner-assets'
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "Admin update banner assets"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'banner-assets'
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "Admin delete banner assets"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'banner-assets'
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);
