-- =============================================
-- STRIPE SUBSCRIPTION SCHEMA ADDITIONS
-- Run this after the main schema
-- =============================================

-- Add Stripe columns to user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(20) DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subscription_cancel_at_period_end BOOLEAN DEFAULT false;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe_customer 
ON user_profiles(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription_tier 
ON user_profiles(subscription_tier);

-- =============================================
-- USAGE TRACKING TABLE
-- Track daily execution counts per user
-- =============================================

CREATE TABLE IF NOT EXISTS usage_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    execution_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, date)
);

-- Index for fast daily lookups
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_date 
ON usage_tracking(user_id, date);

-- Function to increment execution count
CREATE OR REPLACE FUNCTION increment_execution_count(p_user_id VARCHAR(255))
RETURNS TABLE(count INTEGER, date DATE) AS $$
DECLARE
    v_count INTEGER;
    v_date DATE;
BEGIN
    v_date := CURRENT_DATE;
    
    INSERT INTO usage_tracking (user_id, date, execution_count)
    VALUES (p_user_id, v_date, 1)
    ON CONFLICT (user_id, date) 
    DO UPDATE SET 
        execution_count = usage_tracking.execution_count + 1,
        updated_at = NOW()
    RETURNING usage_tracking.execution_count, usage_tracking.date INTO v_count, v_date;
    
    RETURN QUERY SELECT v_count, v_date;
END;
$$ LANGUAGE plpgsql;

-- Function to get today's usage
CREATE OR REPLACE FUNCTION get_daily_usage(p_user_id VARCHAR(255))
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT execution_count INTO v_count
    FROM usage_tracking
    WHERE user_id = p_user_id AND date = CURRENT_DATE;
    
    RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql;

-- RLS Policies for usage_tracking
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage"
ON usage_tracking FOR SELECT
USING (user_id = current_setting('app.user_id', true));

CREATE POLICY "System can insert/update usage"
ON usage_tracking FOR ALL
USING (true);

-- =============================================
-- PAYMENT HISTORY TABLE (optional, for records)
-- =============================================

CREATE TABLE IF NOT EXISTS payment_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    stripe_payment_intent_id VARCHAR(255),
    stripe_invoice_id VARCHAR(255),
    amount_cents INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'usd',
    status VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_history_user 
ON payment_history(user_id);

-- RLS for payment_history
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments"
ON payment_history FOR SELECT
USING (user_id = current_setting('app.user_id', true));
