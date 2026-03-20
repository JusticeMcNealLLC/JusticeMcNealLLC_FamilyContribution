-- ═══════════════════════════════════════════════════════════════════
-- Migration 073 — My Finances: bank accounts, statements, transactions
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Member bank accounts ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS member_accounts (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    label         TEXT NOT NULL,                      -- "Chase Checking"
    account_type  TEXT DEFAULT 'checking',            -- 'checking' | 'savings' | 'credit'
    institution   TEXT,                               -- "Chase", "Bank of America"
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. Uploaded bank statements ─────────────────────────────────
CREATE TABLE IF NOT EXISTS member_statements (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id          UUID NOT NULL REFERENCES member_accounts(id) ON DELETE CASCADE,
    user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    statement_month     DATE NOT NULL,               -- first of the month this covers
    file_url            TEXT,                        -- Supabase Storage URL (nullable if discarded)
    original_filename   TEXT,                        -- original upload filename
    parsed              BOOLEAN DEFAULT FALSE,
    total_inflow_cents  INT DEFAULT 0,
    total_outflow_cents INT DEFAULT 0,
    net_cents           INT DEFAULT 0,
    uploaded_at         TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(account_id, statement_month)
);

-- ── 3. Individual transactions ──────────────────────────────────
CREATE TABLE IF NOT EXISTS member_transactions (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    statement_id      UUID NOT NULL REFERENCES member_statements(id) ON DELETE CASCADE,
    user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    transaction_date  DATE NOT NULL,
    description       TEXT NOT NULL,
    amount_cents      INT NOT NULL,                  -- positive = inflow, negative = outflow
    category          TEXT DEFAULT 'other',           -- auto-assigned, member-editable
    is_recurring      BOOLEAN DEFAULT FALSE,
    notes             TEXT,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. Cashback estimates per statement ─────────────────────────
CREATE TABLE IF NOT EXISTS member_cashback_estimates (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    statement_id              UUID NOT NULL REFERENCES member_statements(id) ON DELETE CASCADE,
    user_id                   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    eligible_spend_cents      INT DEFAULT 0,
    estimated_cashback_cents  INT DEFAULT 0,
    created_at                TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(statement_id)
);

-- ── 5. RLS — member can only access their own data ──────────────
ALTER TABLE member_accounts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_statements         ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_transactions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_cashback_estimates ENABLE ROW LEVEL SECURITY;

-- member_accounts
CREATE POLICY "member_accounts_select" ON member_accounts
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "member_accounts_insert" ON member_accounts
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "member_accounts_update" ON member_accounts
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "member_accounts_delete" ON member_accounts
    FOR DELETE USING (auth.uid() = user_id);

-- member_statements
CREATE POLICY "member_statements_select" ON member_statements
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "member_statements_insert" ON member_statements
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "member_statements_update" ON member_statements
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "member_statements_delete" ON member_statements
    FOR DELETE USING (auth.uid() = user_id);

-- member_transactions
CREATE POLICY "member_transactions_select" ON member_transactions
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "member_transactions_insert" ON member_transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "member_transactions_update" ON member_transactions
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "member_transactions_delete" ON member_transactions
    FOR DELETE USING (auth.uid() = user_id);

-- member_cashback_estimates
CREATE POLICY "member_cashback_select" ON member_cashback_estimates
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "member_cashback_insert" ON member_cashback_estimates
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "member_cashback_update" ON member_cashback_estimates
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "member_cashback_delete" ON member_cashback_estimates
    FOR DELETE USING (auth.uid() = user_id);

-- ── 6. Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_member_accounts_user    ON member_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_member_statements_user  ON member_statements(user_id);
CREATE INDEX IF NOT EXISTS idx_member_statements_acct  ON member_statements(account_id);
CREATE INDEX IF NOT EXISTS idx_member_txns_user        ON member_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_member_txns_stmt        ON member_transactions(statement_id);
CREATE INDEX IF NOT EXISTS idx_member_txns_category    ON member_transactions(category);
CREATE INDEX IF NOT EXISTS idx_member_txns_date        ON member_transactions(transaction_date);

-- ── 7. Storage bucket for statement files (private per user) ────
INSERT INTO storage.buckets (id, name, public)
VALUES ('member-statements', 'member-statements', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: member can only access their own folder
CREATE POLICY "member_statements_storage_select"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'member-statements' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "member_statements_storage_insert"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'member-statements' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "member_statements_storage_delete"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'member-statements' AND (storage.foldername(name))[1] = auth.uid()::text);
