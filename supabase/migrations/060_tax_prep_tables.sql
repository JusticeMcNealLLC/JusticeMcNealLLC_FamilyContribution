-- ============================================
-- Migration 060: Tax Prep Tables
-- tax_quarterly_payments + tax_checklist
-- ============================================

-- ── Quarterly Estimated Tax Payments ──
CREATE TABLE IF NOT EXISTS tax_quarterly_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tax_year INTEGER NOT NULL,
    quarter INTEGER NOT NULL CHECK (quarter BETWEEN 1 AND 4),
    amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0,
    paid_date DATE,
    confirmation_number TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (tax_year, quarter)
);

-- ── Tax Filing Checklist ──
CREATE TABLE IF NOT EXISTS tax_checklist (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tax_year INTEGER NOT NULL,
    item_key TEXT NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (tax_year, item_key)
);

-- ── Indexes ──
CREATE INDEX IF NOT EXISTS idx_tax_qp_year ON tax_quarterly_payments(tax_year);
CREATE INDEX IF NOT EXISTS idx_tax_checklist_year ON tax_checklist(tax_year);

-- ── Updated_at triggers ──
CREATE OR REPLACE FUNCTION update_tax_qp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tax_qp_updated_at
    BEFORE UPDATE ON tax_quarterly_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_tax_qp_updated_at();

CREATE OR REPLACE FUNCTION update_tax_checklist_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    IF NEW.completed = true AND OLD.completed = false THEN
        NEW.completed_at = now();
    END IF;
    IF NEW.completed = false THEN
        NEW.completed_at = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tax_checklist_updated_at
    BEFORE UPDATE ON tax_checklist
    FOR EACH ROW
    EXECUTE FUNCTION update_tax_checklist_updated_at();

-- ── RLS Policies (Admin-only) ──
ALTER TABLE tax_quarterly_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_checklist ENABLE ROW LEVEL SECURITY;

-- Quarterly Payments
CREATE POLICY "Admin can view quarterly payments"
    ON tax_quarterly_payments FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admin can insert quarterly payments"
    ON tax_quarterly_payments FOR INSERT
    WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admin can update quarterly payments"
    ON tax_quarterly_payments FOR UPDATE
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admin can delete quarterly payments"
    ON tax_quarterly_payments FOR DELETE
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Tax Checklist
CREATE POLICY "Admin can view checklist"
    ON tax_checklist FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admin can insert checklist"
    ON tax_checklist FOR INSERT
    WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admin can update checklist"
    ON tax_checklist FOR UPDATE
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admin can delete checklist"
    ON tax_checklist FOR DELETE
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );
