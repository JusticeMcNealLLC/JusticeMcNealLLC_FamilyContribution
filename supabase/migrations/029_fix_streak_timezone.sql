-- Migration 029: Fix contribution streak timezone + grace for current month
-- Problem: date_trunc on timestamptz vs date caused timezone mismatch,
-- and if this month's subscription invoice hasn't arrived yet the streak
-- broke even though the member is still active.
--
-- Fix: cast both sides to DATE, and if the current month has no subscription
-- invoice yet, start counting from last month (grace period for the current
-- billing cycle).

CREATE OR REPLACE FUNCTION compute_contribution_streak(target_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    streak INTEGER := 0;
    check_month DATE;
    has_payment BOOLEAN;
BEGIN
    -- Start from the current month
    check_month := date_trunc('month', CURRENT_DATE)::date;

    -- Check if current month has a paid subscription invoice
    SELECT EXISTS(
        SELECT 1
        FROM invoices
        WHERE user_id = target_user_id
          AND status = 'paid'
          AND payment_type = 'subscription'
          AND (date_trunc('month', created_at AT TIME ZONE 'UTC'))::date = check_month
    ) INTO has_payment;

    IF has_payment THEN
        -- Current month counts
        streak := 1;
        check_month := check_month - INTERVAL '1 month';
    ELSE
        -- Grace: current month hasn't been billed yet, start from last month
        check_month := check_month - INTERVAL '1 month';
    END IF;

    -- Walk backward through previous months
    LOOP
        SELECT EXISTS(
            SELECT 1
            FROM invoices
            WHERE user_id = target_user_id
              AND status = 'paid'
              AND payment_type = 'subscription'
              AND (date_trunc('month', created_at AT TIME ZONE 'UTC'))::date = check_month
        ) INTO has_payment;

        IF NOT has_payment THEN
            EXIT;  -- Streak broken
        END IF;

        streak := streak + 1;
        check_month := check_month - INTERVAL '1 month';
    END LOOP;

    RETURN streak;
END;
$$;

-- Backfill all users with corrected function
UPDATE profiles
SET contribution_streak = compute_contribution_streak(id),
    updated_at = NOW();
