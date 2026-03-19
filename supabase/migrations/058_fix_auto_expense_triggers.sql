-- ============================================
-- Migration 058: Fix auto-expense trigger column mismatch
-- ============================================
-- BUG: Trigger 1 (auto_expense_on_payout) was missing `recurrence_interval`
-- in the column list, causing:
--   notes      ← got 'monthly'/NULL  (should be auto-logged text)
--   created_by ← got TEXT string     (should be UUID)
-- This type error rolls back the payout status UPDATE → payout stuck at 'processing'.
--
-- Trigger 2 (auto_expense_on_stripe_fee) had 10 columns but only 9 values
-- (missing created_by value) → would error at runtime.
--
-- This migration:
-- 1. Fixes both trigger functions
-- 2. Marks any stuck 'processing' payouts as 'completed'

-- ══════════════════════════════════════════════
-- FIX TRIGGER 1: auto_expense_on_payout
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
        RETURN NEW;
    END IF;

    -- Check if expense already exists for this payout (idempotent)
    SELECT EXISTS(
        SELECT 1 FROM llc_expenses 
        WHERE notes LIKE '%payout_id:' || NEW.id || '%'
    ) INTO expense_exists;
    
    IF expense_exists THEN
        RETURN NEW;
    END IF;

    -- Get member display name
    SELECT COALESCE(NULLIF(TRIM(COALESCE(first_name,'') || ' ' || COALESCE(last_name,'')), ''), email, 'Unknown Member')
    INTO member_name
    FROM profiles WHERE id = NEW.user_id;

    -- Build description
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

    IF NEW.reason IS NOT NULL AND NEW.reason != '' THEN
        expense_desc := expense_desc || ' — ' || NEW.reason;
    END IF;

    -- Fixed: added recurrence_interval column, created_by now gets UUID
    INSERT INTO llc_expenses (
        date, amount, category, description, vendor,
        schedule_c_line, is_recurring, recurrence_interval, notes, created_by
    ) VALUES (
        COALESCE(NEW.completed_at, NEW.created_at)::DATE,
        NEW.amount_cents / 100.0,
        'member-payouts',
        expense_desc,
        'Stripe Connect',
        'Line 27',
        CASE WHEN NEW.payout_type = 'birthday' THEN true ELSE false END,
        CASE WHEN NEW.payout_type = 'birthday' THEN 'monthly' ELSE NULL END,
        'Auto-logged | payout_type:' || NEW.payout_type || ' | payout_id:' || NEW.id,
        get_admin_user_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ══════════════════════════════════════════════
-- FIX TRIGGER 2: auto_expense_on_stripe_fee
-- ══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION auto_expense_on_stripe_fee()
RETURNS TRIGGER AS $$
DECLARE
    member_name TEXT;
    expense_desc TEXT;
    expense_exists BOOLEAN;
    fee_dollars NUMERIC;
BEGIN
    IF COALESCE(NEW.stripe_fee_cents, 0) = 0 THEN
        RETURN NEW;
    END IF;

    IF OLD IS NOT NULL AND OLD.stripe_fee_cents = NEW.stripe_fee_cents THEN
        RETURN NEW;
    END IF;

    SELECT EXISTS(
        SELECT 1 FROM llc_expenses 
        WHERE notes LIKE '%invoice_id:' || NEW.stripe_invoice_id || '%'
        AND category = 'commissions'
    ) INTO expense_exists;
    
    IF expense_exists THEN
        RETURN NEW;
    END IF;

    fee_dollars := NEW.stripe_fee_cents / 100.0;

    SELECT COALESCE(NULLIF(TRIM(COALESCE(first_name,'') || ' ' || COALESCE(last_name,'')), ''), email, 'Unknown Member')
    INTO member_name
    FROM profiles WHERE id = NEW.user_id;

    expense_desc := 'Stripe fee — ' || COALESCE(NEW.payment_type, 'payment') || ' from ' || member_name
        || ' ($' || ROUND(NEW.amount_paid_cents / 100.0, 2) || ')';

    -- Fixed: added get_admin_user_id() for created_by (was missing)
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
        'Auto-logged | fee:$' || ROUND(fee_dollars, 2) || ' | invoice_id:' || NEW.stripe_invoice_id,
        get_admin_user_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ══════════════════════════════════════════════
-- FIX STUCK PAYOUTS: mark 'processing' → 'completed'
-- These payouts had Stripe transfers created successfully
-- but the DB update was rolled back by the broken trigger.
-- ══════════════════════════════════════════════
UPDATE payouts
SET status = 'completed',
    completed_at = COALESCE(completed_at, NOW())
WHERE status = 'processing';
