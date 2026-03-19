-- ============================================
-- Migration 055: Auto-log & Backfill Expenses
-- ============================================
-- 1. Trigger: auto-create expense when a payout completes
-- 2. Trigger: auto-create expense for Stripe fees when invoice is paid
-- 3. Backfill: all completed payouts → llc_expenses
-- 4. Backfill: all Stripe fees from invoices → llc_expenses

-- ── Helper: Get admin user ID (first admin, used as created_by for auto-entries) ──
CREATE OR REPLACE FUNCTION get_admin_user_id()
RETURNS UUID AS $$
    SELECT id FROM profiles WHERE role = 'admin' ORDER BY created_at LIMIT 1;
$$ LANGUAGE sql STABLE;

-- ══════════════════════════════════════════════
-- TRIGGER 1: Auto-log completed payouts as expenses
-- ══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION auto_expense_on_payout()
RETURNS TRIGGER AS $$
DECLARE
    member_name TEXT;
    expense_desc TEXT;
    expense_exists BOOLEAN;
BEGIN
    -- Only fire when status changes to 'completed'
    IF NEW.status != 'completed' THEN
        RETURN NEW;
    END IF;
    IF OLD IS NOT NULL AND OLD.status = 'completed' THEN
        RETURN NEW; -- Already completed, skip
    END IF;

    -- Check if expense already exists for this payout (idempotent)
    SELECT EXISTS(
        SELECT 1 FROM llc_expenses 
        WHERE notes LIKE '%payout_id:' || NEW.id || '%'
    ) INTO expense_exists;
    
    IF expense_exists THEN
        RETURN NEW;
    END IF;

    -- Get member display name (profiles has first_name + last_name)
    SELECT COALESCE(NULLIF(TRIM(COALESCE(first_name,'') || ' ' || COALESCE(last_name,'')), ''), email, 'Unknown Member')
    INTO member_name
    FROM profiles WHERE id = NEW.user_id;

    -- Build description based on payout type
    expense_desc := CASE NEW.payout_type
        WHEN 'birthday' THEN 'Birthday payout to ' || member_name
        WHEN 'competition' THEN 'Competition prize to ' || member_name
        WHEN 'bonus' THEN 'Bonus payout to ' || member_name
        WHEN 'profit_share' THEN 'Profit share to ' || member_name
        WHEN 'referral' THEN 'Referral reward to ' || member_name
        WHEN 'quest_reward' THEN 'Quest reward to ' || member_name
        WHEN 'custom' THEN 'Custom payout to ' || member_name
        ELSE 'Payout to ' || member_name
    END;

    -- Add reason if present
    IF NEW.reason IS NOT NULL AND NEW.reason != '' THEN
        expense_desc := expense_desc || ' — ' || NEW.reason;
    END IF;

    INSERT INTO llc_expenses (
        date, amount, category, description, vendor,
        schedule_c_line, is_recurring, notes, created_by
    ) VALUES (
        COALESCE(NEW.completed_at, NEW.created_at)::DATE,
        NEW.amount_cents / 100.0,
        'member-payouts',
        expense_desc,
        'Stripe Connect',
        'Line 27',
        CASE WHEN NEW.payout_type = 'birthday' THEN true ELSE false END,
        CASE WHEN NEW.payout_type = 'birthday' THEN 'monthly' ELSE NULL END,
        'Auto-logged | payout_type:' || NEW.payout_type || ' | payout_id:' || NEW.id
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to payouts table
DROP TRIGGER IF EXISTS trg_auto_expense_payout ON payouts;
CREATE TRIGGER trg_auto_expense_payout
    AFTER INSERT OR UPDATE ON payouts
    FOR EACH ROW
    EXECUTE FUNCTION auto_expense_on_payout();

-- ══════════════════════════════════════════════
-- TRIGGER 2: Auto-log Stripe fees as expenses
-- ══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION auto_expense_on_stripe_fee()
RETURNS TRIGGER AS $$
DECLARE
    member_name TEXT;
    expense_desc TEXT;
    expense_exists BOOLEAN;
    fee_dollars NUMERIC;
BEGIN
    -- Only fire when stripe_fee_cents > 0
    IF COALESCE(NEW.stripe_fee_cents, 0) = 0 THEN
        RETURN NEW;
    END IF;

    -- Skip if fee hasn't changed (update scenario)
    IF OLD IS NOT NULL AND OLD.stripe_fee_cents = NEW.stripe_fee_cents THEN
        RETURN NEW;
    END IF;

    -- Check if expense already exists for this invoice (idempotent)
    SELECT EXISTS(
        SELECT 1 FROM llc_expenses 
        WHERE notes LIKE '%invoice_id:' || NEW.stripe_invoice_id || '%'
        AND category = 'commissions'
    ) INTO expense_exists;
    
    IF expense_exists THEN
        RETURN NEW;
    END IF;

    fee_dollars := NEW.stripe_fee_cents / 100.0;

    -- Get member display name (profiles has first_name + last_name)
    SELECT COALESCE(NULLIF(TRIM(COALESCE(first_name,'') || ' ' || COALESCE(last_name,'')), ''), email, 'Unknown Member')
    INTO member_name
    FROM profiles WHERE id = NEW.user_id;

    expense_desc := 'Stripe fee — ' || COALESCE(NEW.payment_type, 'payment') || ' from ' || member_name
        || ' ($' || ROUND(NEW.amount_paid_cents / 100.0, 2) || ')';

    INSERT INTO llc_expenses (
        date, amount, category, description, vendor,
        schedule_c_line, is_recurring, recurrence_interval, notes, created_by
    ) VALUES (
        COALESCE(NEW.paid_at, NEW.created_at)::DATE,
        fee_dollars,
        'commissions',
        expense_desc,
        'Stripe',
        'Line 10',
        CASE WHEN NEW.payment_type = 'subscription' THEN true ELSE false END,
        CASE WHEN NEW.payment_type = 'subscription' THEN 'monthly' ELSE NULL END,
        'Auto-logged | fee:$' || ROUND(fee_dollars, 2) || ' | invoice_id:' || NEW.stripe_invoice_id
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to invoices table
DROP TRIGGER IF EXISTS trg_auto_expense_stripe_fee ON invoices;
CREATE TRIGGER trg_auto_expense_stripe_fee
    AFTER INSERT OR UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION auto_expense_on_stripe_fee();

-- ══════════════════════════════════════════════
-- BACKFILL: All completed payouts → expenses
-- ══════════════════════════════════════════════
INSERT INTO llc_expenses (date, amount, category, description, vendor, schedule_c_line, is_recurring, recurrence_interval, notes, created_by)
SELECT
    COALESCE(p.completed_at, p.created_at)::DATE AS date,
    p.amount_cents / 100.0 AS amount,
    'member-payouts' AS category,
    CASE p.payout_type
        WHEN 'birthday' THEN 'Birthday payout to ' || COALESCE(NULLIF(TRIM(COALESCE(pr.first_name,'') || ' ' || COALESCE(pr.last_name,'')), ''), pr.email, 'Unknown')
        WHEN 'competition' THEN 'Competition prize to ' || COALESCE(NULLIF(TRIM(COALESCE(pr.first_name,'') || ' ' || COALESCE(pr.last_name,'')), ''), pr.email, 'Unknown')
        WHEN 'bonus' THEN 'Bonus payout to ' || COALESCE(NULLIF(TRIM(COALESCE(pr.first_name,'') || ' ' || COALESCE(pr.last_name,'')), ''), pr.email, 'Unknown')
        WHEN 'profit_share' THEN 'Profit share to ' || COALESCE(NULLIF(TRIM(COALESCE(pr.first_name,'') || ' ' || COALESCE(pr.last_name,'')), ''), pr.email, 'Unknown')
        WHEN 'referral' THEN 'Referral reward to ' || COALESCE(NULLIF(TRIM(COALESCE(pr.first_name,'') || ' ' || COALESCE(pr.last_name,'')), ''), pr.email, 'Unknown')
        WHEN 'quest_reward' THEN 'Quest reward to ' || COALESCE(NULLIF(TRIM(COALESCE(pr.first_name,'') || ' ' || COALESCE(pr.last_name,'')), ''), pr.email, 'Unknown')
        WHEN 'custom' THEN 'Custom payout to ' || COALESCE(NULLIF(TRIM(COALESCE(pr.first_name,'') || ' ' || COALESCE(pr.last_name,'')), ''), pr.email, 'Unknown')
        ELSE 'Payout to ' || COALESCE(NULLIF(TRIM(COALESCE(pr.first_name,'') || ' ' || COALESCE(pr.last_name,'')), ''), pr.email, 'Unknown')
    END || CASE WHEN p.reason IS NOT NULL AND p.reason != '' THEN ' — ' || p.reason ELSE '' END AS description,
    'Stripe Connect' AS vendor,
    'Line 27' AS schedule_c_line,
    CASE WHEN p.payout_type = 'birthday' THEN true ELSE false END AS is_recurring,
    CASE WHEN p.payout_type = 'birthday' THEN 'monthly' ELSE NULL END AS recurrence_interval,
    'Backfilled | payout_type:' || p.payout_type || ' | payout_id:' || p.id AS notes,
    (SELECT get_admin_user_id()) AS created_by
FROM payouts p
LEFT JOIN profiles pr ON pr.id = p.user_id
WHERE p.status = 'completed'
AND NOT EXISTS (
    SELECT 1 FROM llc_expenses le
    WHERE le.notes LIKE '%payout_id:' || p.id || '%'
);

-- ══════════════════════════════════════════════
-- BACKFILL: All Stripe fees → expenses
-- ══════════════════════════════════════════════
INSERT INTO llc_expenses (date, amount, category, description, vendor, schedule_c_line, is_recurring, recurrence_interval, notes, created_by)
SELECT
    COALESCE(i.paid_at, i.created_at)::DATE AS date,
    i.stripe_fee_cents / 100.0 AS amount,
    'commissions' AS category,
    'Stripe fee — ' || COALESCE(i.payment_type, 'payment') || ' from ' || COALESCE(NULLIF(TRIM(COALESCE(pr.first_name,'') || ' ' || COALESCE(pr.last_name,'')), ''), pr.email, 'Unknown')
        || ' ($' || ROUND(i.amount_paid_cents / 100.0, 2) || ')' AS description,
    'Stripe' AS vendor,
    'Line 10' AS schedule_c_line,
    CASE WHEN i.payment_type = 'subscription' THEN true ELSE false END AS is_recurring,
    CASE WHEN i.payment_type = 'subscription' THEN 'monthly' ELSE NULL END AS recurrence_interval,
    'Backfilled | fee:$' || ROUND(i.stripe_fee_cents / 100.0, 2) || ' | invoice_id:' || i.stripe_invoice_id AS notes,
    (SELECT get_admin_user_id()) AS created_by
FROM invoices i
LEFT JOIN profiles pr ON pr.id = i.user_id
WHERE i.stripe_fee_cents > 0
AND i.status = 'paid'
AND NOT EXISTS (
    SELECT 1 FROM llc_expenses le
    WHERE le.notes LIKE '%invoice_id:' || i.stripe_invoice_id || '%'
    AND le.category = 'commissions'
);
