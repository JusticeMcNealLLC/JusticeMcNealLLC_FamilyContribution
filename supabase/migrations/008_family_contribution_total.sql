-- Migration 008: Add function to get family contribution total
-- Bypasses RLS so non-admin members can see the combined family total
-- without exposing individual invoices from other members.

CREATE OR REPLACE FUNCTION get_family_contribution_total()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(amount_paid_cents), 0)::bigint
  FROM invoices
  WHERE status = 'paid';
$$;

-- Allow any authenticated user to call it
GRANT EXECUTE ON FUNCTION get_family_contribution_total() TO authenticated;
