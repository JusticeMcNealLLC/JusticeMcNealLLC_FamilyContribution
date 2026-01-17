-- =====================================================
-- CLEANUP & RECREATE - Run this if you get "already exists" errors
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can read own stripe customer" ON stripe_customers;
DROP POLICY IF EXISTS "Authenticated users can read prices" ON stripe_prices;
DROP POLICY IF EXISTS "Users can read own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Admins can read all subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can read own invoices" ON invoices;
DROP POLICY IF EXISTS "Admins can read all invoices" ON invoices;

-- Drop existing triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_stripe_customers_updated_at ON stripe_customers;
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop existing functions
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS handle_new_user();

-- =====================================================
-- Now recreate everything
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- ----- PROFILES POLICIES -----
CREATE POLICY "Users can read own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
    ON profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ----- STRIPE_CUSTOMERS POLICIES -----
CREATE POLICY "Users can read own stripe customer"
    ON stripe_customers FOR SELECT
    USING (auth.uid() = user_id);

-- ----- STRIPE_PRICES POLICIES -----
CREATE POLICY "Authenticated users can read prices"
    ON stripe_prices FOR SELECT
    USING (auth.role() = 'authenticated');

-- ----- SUBSCRIPTIONS POLICIES -----
CREATE POLICY "Users can read own subscription"
    ON subscriptions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all subscriptions"
    ON subscriptions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ----- INVOICES POLICIES -----
CREATE POLICY "Users can read own invoices"
    ON invoices FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all invoices"
    ON invoices FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stripe_customers_updated_at
    BEFORE UPDATE ON stripe_customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, email, role, is_active)
    VALUES (
        NEW.id,
        NEW.email,
        'member',
        true
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- DONE! Database is ready.
-- =====================================================
