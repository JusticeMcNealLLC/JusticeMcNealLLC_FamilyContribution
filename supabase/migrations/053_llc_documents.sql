-- =====================================================
-- LLC Documents Vault
-- Tables, storage bucket, and RLS policies for
-- the admin document management system.
-- =====================================================

-- ── Document metadata table ─────────────────────────

CREATE TABLE IF NOT EXISTS llc_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    category TEXT NOT NULL CHECK (category IN (
        'formation', 'ein', 'operating-agreement', 'banking',
        'tax', 'stripe', 'insurance', 'contract', 'receipt', 'other'
    )),
    name TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    mime_type TEXT,
    description TEXT,
    uploaded_by UUID REFERENCES auth.users(id),
    tags TEXT[] DEFAULT '{}',
    version INT DEFAULT 1,
    is_archived BOOLEAN DEFAULT false
);

-- ── Share link tracking table ───────────────────────

CREATE TABLE IF NOT EXISTS llc_document_shares (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    document_id UUID REFERENCES llc_documents(id) ON DELETE CASCADE NOT NULL,
    shared_by UUID REFERENCES auth.users(id),
    recipient_note TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    signed_url TEXT,
    is_revoked BOOLEAN DEFAULT false
);

-- ── RLS Policies ────────────────────────────────────

ALTER TABLE llc_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE llc_document_shares ENABLE ROW LEVEL SECURITY;

-- Only admins can read documents
CREATE POLICY "admin_read_llc_documents" ON llc_documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Only admins can insert documents
CREATE POLICY "admin_insert_llc_documents" ON llc_documents
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Only admins can update documents
CREATE POLICY "admin_update_llc_documents" ON llc_documents
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Only admins can delete documents
CREATE POLICY "admin_delete_llc_documents" ON llc_documents
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Only admins can read share logs
CREATE POLICY "admin_read_llc_document_shares" ON llc_document_shares
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Only admins can insert share records
CREATE POLICY "admin_insert_llc_document_shares" ON llc_document_shares
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- ── Storage Bucket ──────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'llc-documents',
    'llc-documents',
    false,
    10485760, -- 10MB
    ARRAY[
        'application/pdf',
        'image/png',
        'image/jpeg',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv',
        'text/plain'
    ]
) ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Only admins can upload
CREATE POLICY "admin_upload_llc_documents" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'llc-documents'
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Storage RLS: Only admins can read/download
CREATE POLICY "admin_read_llc_document_files" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'llc-documents'
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Storage RLS: Only admins can delete files
CREATE POLICY "admin_delete_llc_document_files" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'llc-documents'
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );
