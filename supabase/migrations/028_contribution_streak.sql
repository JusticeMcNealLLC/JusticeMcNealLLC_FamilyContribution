-- Migration 028: Contribution Streak Tracking
-- Adds contribution_streak column to profiles and a function + trigger
-- that recalculates it whenever a new subscription invoice is recorded.
--
-- Streak = number of consecutive months (counting backward from current month)
-- where the user has at least one paid subscription invoice.

-- ─── 1. Add column ──────────────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS contribution_streak INTEGER NOT NULL DEFAULT 0;

-- ─── 2. Function to compute streak from invoices ────────────────────
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
    -- Start from the current month and walk backward
    check_month := date_trunc('month', NOW())::date;

    LOOP
        -- Check if user has at least one paid subscription invoice in this month
        SELECT EXISTS(
            SELECT 1
            FROM invoices
            WHERE user_id = target_user_id
              AND status = 'paid'
              AND payment_type = 'subscription'
              AND date_trunc('month', created_at) = check_month
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

-- ─── 3. Function to update a user's streak on their profile ─────────
CREATE OR REPLACE FUNCTION update_contribution_streak()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_streak INTEGER;
BEGIN
    -- Only act on subscription invoices that are paid
    IF NEW.payment_type = 'subscription' AND NEW.status = 'paid' THEN
        new_streak := compute_contribution_streak(NEW.user_id);

        UPDATE profiles
        SET contribution_streak = new_streak,
            updated_at = NOW()
        WHERE id = NEW.user_id;
    END IF;

    RETURN NEW;
END;
$$;

-- ─── 4. Trigger: fire after insert or update on invoices ────────────
DROP TRIGGER IF EXISTS trg_update_contribution_streak ON invoices;
CREATE TRIGGER trg_update_contribution_streak
    AFTER INSERT OR UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_contribution_streak();

-- ─── 5. Backfill streaks for all existing users ─────────────────────
UPDATE profiles
SET contribution_streak = compute_contribution_streak(id),
    updated_at = NOW();
