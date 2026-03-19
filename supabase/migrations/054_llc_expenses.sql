-- ============================================
-- Migration 054: LLC Expenses Tracker
-- ============================================

-- ── Expenses Table ──
CREATE TABLE IF NOT EXISTS llc_expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    date DATE NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    category TEXT NOT NULL,
    description TEXT,
    vendor TEXT,
    receipt_path TEXT,            -- Supabase Storage path (llc-receipts bucket)
    schedule_c_line TEXT,         -- IRS Schedule C line reference
    is_recurring BOOLEAN DEFAULT false,
    recurrence_interval TEXT CHECK (recurrence_interval IN ('monthly', 'quarterly', 'annual')),
    notes TEXT,
    created_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_llc_expenses_date ON llc_expenses(date DESC);
CREATE INDEX IF NOT EXISTS idx_llc_expenses_category ON llc_expenses(category);
CREATE INDEX IF NOT EXISTS idx_llc_expenses_created_by ON llc_expenses(created_by);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_llc_expenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_llc_expenses_updated_at
    BEFORE UPDATE ON llc_expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_llc_expenses_updated_at();

-- ── RLS Policies (Admin-only) ──
ALTER TABLE llc_expenses ENABLE ROW LEVEL SECURITY;

-- Admin read
CREATE POLICY "Admin can view expenses"
    ON llc_expenses FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Admin insert
CREATE POLICY "Admin can create expenses"
    ON llc_expenses FOR INSERT
    WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Admin update
CREATE POLICY "Admin can update expenses"
    ON llc_expenses FOR UPDATE
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Admin delete
CREATE POLICY "Admin can delete expenses"
    ON llc_expenses FOR DELETE
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ── Receipts Storage Bucket ──
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'llc-receipts',
    'llc-receipts',
    false,
    10485760,  -- 10MB
    ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Admin-only upload
CREATE POLICY "Admin can upload receipts"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'llc-receipts'
        AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Storage RLS: Admin-only read
CREATE POLICY "Admin can view receipts"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'llc-receipts'
        AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Storage RLS: Admin-only delete
CREATE POLICY "Admin can delete receipts"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'llc-receipts'
        AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ── Handy Views ──

-- Monthly expense summary
CREATE OR REPLACE VIEW llc_expense_monthly_summary AS
SELECT
    date_trunc('month', date)::DATE AS month,
    category,
    COUNT(*) AS expense_count,
    SUM(amount) AS total_amount
FROM llc_expenses
GROUP BY date_trunc('month', date), category
ORDER BY month DESC, category;

-- Annual totals by category (for Schedule C)
CREATE OR REPLACE VIEW llc_expense_annual_by_category AS
SELECT
    EXTRACT(YEAR FROM date)::INT AS tax_year,
    category,
    schedule_c_line,
    COUNT(*) AS expense_count,
    SUM(amount) AS total_amount
FROM llc_expenses
GROUP BY EXTRACT(YEAR FROM date), category, schedule_c_line
ORDER BY tax_year DESC, category;
