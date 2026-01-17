-- =====================================================
-- Family Contribution Portal - Database Schema
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Enable UUID extension (usually already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. PROFILES TABLE
-- Stores user profile information
-- =====================================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- =====================================================
-- 2. STRIPE_CUSTOMERS TABLE
-- Links Supabase users to Stripe customers
-- =====================================================
CREATE TABLE IF NOT EXISTS stripe_customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    stripe_customer_id TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_stripe_customers_user_id ON stripe_customers(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_customers_stripe_id ON stripe_customers(stripe_customer_id);

-- =====================================================
-- 3. STRIPE_PRICES TABLE
-- Cache of Stripe prices we've created (for dynamic pricing)
-- =====================================================
CREATE TABLE IF NOT EXISTS stripe_prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    amount_cents INTEGER NOT NULL UNIQUE,
    stripe_price_id TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_stripe_prices_amount ON stripe_prices(amount_cents);

-- =====================================================
-- 4. SUBSCRIPTIONS TABLE
-- Stores subscription information (mirrored from Stripe)
-- =====================================================
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    stripe_subscription_id TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'active',
    current_amount_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'usd',
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);

-- =====================================================
-- 5. INVOICES TABLE
-- Stores invoice/payment history (mirrored from Stripe)
-- =====================================================
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    stripe_invoice_id TEXT NOT NULL UNIQUE,
    amount_paid_cents INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    hosted_invoice_url TEXT,
    invoice_pdf TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at);

-- =====================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- ----- PROFILES POLICIES -----

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

-- Admins can read all profiles
CREATE POLICY "Admins can read all profiles"
    ON profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Users can update their own profile (limited fields)
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ----- STRIPE_CUSTOMERS POLICIES -----

-- Users can read their own stripe customer record
CREATE POLICY "Users can read own stripe customer"
    ON stripe_customers FOR SELECT
    USING (auth.uid() = user_id);

-- ----- STRIPE_PRICES POLICIES -----

-- Anyone authenticated can read prices (needed for checkout)
CREATE POLICY "Authenticated users can read prices"
    ON stripe_prices FOR SELECT
    USING (auth.role() = 'authenticated');

-- ----- SUBSCRIPTIONS POLICIES -----

-- Users can read their own subscription
CREATE POLICY "Users can read own subscription"
    ON subscriptions FOR SELECT
    USING (auth.uid() = user_id);

-- Admins can read all subscriptions
CREATE POLICY "Admins can read all subscriptions"
    ON subscriptions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ----- INVOICES POLICIES -----

-- Users can read their own invoices
CREATE POLICY "Users can read own invoices"
    ON invoices FOR SELECT
    USING (auth.uid() = user_id);

-- Admins can read all invoices
CREATE POLICY "Admins can read all invoices"
    ON invoices FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =====================================================
-- 7. FUNCTIONS & TRIGGERS
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
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- 8. SEED DATA (OPTIONAL)
-- Create your first admin user
-- =====================================================

-- After creating your first user through Supabase Auth,
-- run this to make them an admin:
-- 
-- UPDATE profiles 
-- SET role = 'admin' 
-- WHERE email = 'your-email@example.com';

-- =====================================================
-- DONE! Your database is ready.
-- =====================================================
