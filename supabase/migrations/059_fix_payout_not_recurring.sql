-- ============================================
-- Migration 059: Don't mark auto-logged payouts as recurring
-- ============================================
-- Birthday payouts are individual events, not recurring expenses.
-- The trigger was incorrectly setting is_recurring=true, recurrence_interval='monthly'.

-- Fix the trigger
CREATE OR REPLACE FUNCTION auto_expense_on_payout()
RETURNS TRIGGER AS $$
DECLARE
    member_name TEXT;
    expense_desc TEXT;
    expense_exists BOOLEAN;
BEGIN
    IF NEW.status != 'completed' THEN
        RETURN NEW;
    END IF;
    IF OLD IS NOT NULL AND OLD.status = 'completed' THEN
        RETURN NEW;
    END IF;

    SELECT EXISTS(
        SELECT 1 FROM llc_expenses 
        WHERE notes LIKE '%payout_id:' || NEW.id || '%'
    ) INTO expense_exists;
    
    IF expense_exists THEN
        RETURN NEW;
    END IF;

    SELECT COALESCE(NULLIF(TRIM(COALESCE(first_name,'') || ' ' || COALESCE(last_name,'')), ''), email, 'Unknown Member')
    INTO member_name
    FROM profiles WHERE id = NEW.user_id;

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

    -- Payouts are individual events, not recurring
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
        false,
        NULL,
        'Auto-logged | payout_type:' || NEW.payout_type || ' | payout_id:' || NEW.id,
        get_admin_user_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix existing auto-logged payout expenses that were incorrectly marked recurring
UPDATE llc_expenses
SET is_recurring = false,
    recurrence_interval = NULL
WHERE category = 'member-payouts'
AND notes LIKE 'Auto-logged%';
