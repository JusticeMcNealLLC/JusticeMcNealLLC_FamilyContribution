-- ═══════════════════════════════════════════════════════════════════
-- Migration 075 — Explicit grants on finances tables for authenticated role
-- Ensures INSERT/SELECT/UPDATE/DELETE work for logged-in users
-- ═══════════════════════════════════════════════════════════════════

GRANT SELECT, INSERT, UPDATE, DELETE ON member_accounts           TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON member_statements         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON member_transactions       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON member_cashback_estimates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON member_category_rules     TO authenticated;
