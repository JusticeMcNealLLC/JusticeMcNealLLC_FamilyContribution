-- =====================================================
-- Investment Dashboard Tables
-- Stores portfolio snapshots uploaded by admin from 
-- Fidelity CSV exports or manual entry
-- =====================================================

-- 1. INVESTMENT_SNAPSHOTS - one row per upload/update
CREATE TABLE IF NOT EXISTS investment_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_date DATE NOT NULL,
    total_value_cents BIGINT NOT NULL DEFAULT 0,
    notes TEXT,
    source TEXT NOT NULL DEFAULT 'manual',  -- 'manual' | 'csv_upload'
    original_filename TEXT,                  -- original CSV filename if uploaded
    uploaded_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_snapshots_date ON investment_snapshots(snapshot_date DESC);
CREATE INDEX idx_snapshots_uploaded_by ON investment_snapshots(uploaded_by);

-- 2. INVESTMENT_HOLDINGS - individual fund positions per snapshot
CREATE TABLE IF NOT EXISTS investment_holdings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_id UUID NOT NULL REFERENCES investment_snapshots(id) ON DELETE CASCADE,
    fund_ticker TEXT NOT NULL,
    fund_name TEXT NOT NULL,
    shares NUMERIC(14, 4) NOT NULL DEFAULT 0,
    price_per_share_cents BIGINT NOT NULL DEFAULT 0,
    market_value_cents BIGINT NOT NULL DEFAULT 0,
    allocation_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_holdings_snapshot ON investment_holdings(snapshot_id);
CREATE INDEX idx_holdings_ticker ON investment_holdings(fund_ticker);

-- =====================================================
-- ENABLE RLS
-- =====================================================

ALTER TABLE investment_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_holdings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- All authenticated members can READ (transparency)
-- Only admins can INSERT/UPDATE/DELETE
-- =====================================================

-- Snapshots: all members can read
CREATE POLICY "Authenticated users can read snapshots"
    ON investment_snapshots FOR SELECT
    USING (auth.role() = 'authenticated');

-- Snapshots: only admins can insert
CREATE POLICY "Admins can insert snapshots"
    ON investment_snapshots FOR INSERT
    WITH CHECK (public.is_admin());

-- Snapshots: only admins can update
CREATE POLICY "Admins can update snapshots"
    ON investment_snapshots FOR UPDATE
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Snapshots: only admins can delete
CREATE POLICY "Admins can delete snapshots"
    ON investment_snapshots FOR DELETE
    USING (public.is_admin());

-- Holdings: all members can read
CREATE POLICY "Authenticated users can read holdings"
    ON investment_holdings FOR SELECT
    USING (auth.role() = 'authenticated');

-- Holdings: only admins can insert
CREATE POLICY "Admins can insert holdings"
    ON investment_holdings FOR INSERT
    WITH CHECK (public.is_admin());

-- Holdings: only admins can update
CREATE POLICY "Admins can update holdings"
    ON investment_holdings FOR UPDATE
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Holdings: only admins can delete
CREATE POLICY "Admins can delete holdings"
    ON investment_holdings FOR DELETE
    USING (public.is_admin());

-- =====================================================
-- DONE! Investment dashboard tables ready.
-- Run this in Supabase SQL Editor.
-- =====================================================
