-- ============================================
-- Migration 056: Mileage / Travel Tracking
-- ============================================
-- Adds mileage columns to llc_expenses for IRS Line 9 deductions

ALTER TABLE llc_expenses
ADD COLUMN IF NOT EXISTS miles_driven DECIMAL(8,1),
ADD COLUMN IF NOT EXISTS mileage_rate DECIMAL(4,2) DEFAULT 0.70,
ADD COLUMN IF NOT EXISTS trip_from TEXT,
ADD COLUMN IF NOT EXISTS trip_to TEXT;

-- Index for mileage queries
CREATE INDEX IF NOT EXISTS idx_llc_expenses_miles ON llc_expenses(miles_driven) WHERE miles_driven IS NOT NULL;

-- View: Annual mileage summary
CREATE OR REPLACE VIEW llc_expense_mileage_summary AS
SELECT
    EXTRACT(YEAR FROM date)::INT AS tax_year,
    COUNT(*) AS trip_count,
    SUM(miles_driven) AS total_miles,
    SUM(amount) AS total_deduction,
    AVG(mileage_rate) AS avg_rate
FROM llc_expenses
WHERE miles_driven IS NOT NULL AND miles_driven > 0
GROUP BY EXTRACT(YEAR FROM date)
ORDER BY tax_year DESC;
