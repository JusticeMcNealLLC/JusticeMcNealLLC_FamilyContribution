-- =====================================================
-- Migration 015: Admin brand logo storage policies
-- Allows admin users to upload/update/delete files in the brand/ folder
-- of the profile-pictures bucket
-- =====================================================

-- Admins can upload brand logos
CREATE POLICY "Admins can upload brand logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'profile-pictures'
    AND (storage.foldername(name))[1] = 'brand'
    AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- Admins can update brand logos
CREATE POLICY "Admins can update brand logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'profile-pictures'
    AND (storage.foldername(name))[1] = 'brand'
    AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- Admins can delete brand logos
CREATE POLICY "Admins can delete brand logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'profile-pictures'
    AND (storage.foldername(name))[1] = 'brand'
    AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);
