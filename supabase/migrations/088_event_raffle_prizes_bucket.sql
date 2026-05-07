-- ── Storage Bucket for Event Raffle Prize Images ─────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'event-raffle-prizes',
    'event-raffle-prizes',
    true,
    5242880,  -- 5 MB
    ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Anyone can read prize images (public event pages need them)
DROP POLICY IF EXISTS "raffle_prizes_read" ON storage.objects;
CREATE POLICY "raffle_prizes_read" ON storage.objects FOR SELECT
    USING (bucket_id = 'event-raffle-prizes');

-- Only authenticated admins/hosts can upload prize images
DROP POLICY IF EXISTS "raffle_prizes_upload" ON storage.objects;
CREATE POLICY "raffle_prizes_upload" ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'event-raffle-prizes'
        AND auth.uid() IS NOT NULL
        AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'member'))
    );

-- Only admins can delete prize images
DROP POLICY IF EXISTS "raffle_prizes_delete" ON storage.objects;
CREATE POLICY "raffle_prizes_delete" ON storage.objects FOR DELETE
    USING (
        bucket_id = 'event-raffle-prizes'
        AND auth.uid() IS NOT NULL
        AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Allow replace/update (for re-uploading a prize image)
DROP POLICY IF EXISTS "raffle_prizes_update" ON storage.objects;
CREATE POLICY "raffle_prizes_update" ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'event-raffle-prizes'
        AND auth.uid() IS NOT NULL
        AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'member'))
    );
