-- =====================================================
-- Add setup_completed field to track if user has logged in
-- and completed their account setup
-- =====================================================

-- Add the column (default false for existing users)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS setup_completed BOOLEAN NOT NULL DEFAULT false;

-- Update existing users who have subscriptions to mark as setup completed
UPDATE profiles 
SET setup_completed = true 
WHERE id IN (SELECT DISTINCT user_id FROM subscriptions);

-- Also mark admins as setup completed
UPDATE profiles 
SET setup_completed = true 
WHERE role = 'admin';

-- =====================================================
-- DONE! Now pending invites will only show users who
-- haven't logged in and completed their profile setup.
-- =====================================================
