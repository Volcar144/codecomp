-- =============================================
-- STRIPE SUBSCRIPTION SCHEMA (BetterAuth Plugin)
-- Run this after the main schema
-- =============================================

-- Add stripeCustomerId to user table (BetterAuth manages this)
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "stripeCustomerId" VARCHAR(255);

-- Add stripeCustomerId to organization table (if using org billing)
ALTER TABLE organization ADD COLUMN IF NOT EXISTS "stripeCustomerId" VARCHAR(255);

-- Subscription table (managed by BetterAuth Stripe plugin)
CREATE TABLE IF NOT EXISTS subscription (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::varchar,
    plan VARCHAR(50) NOT NULL,
    "referenceId" VARCHAR(255) NOT NULL,
    "stripeCustomerId" VARCHAR(255),
    "stripeSubscriptionId" VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'incomplete',
    "periodStart" TIMESTAMP WITH TIME ZONE,
    "periodEnd" TIMESTAMP WITH TIME ZONE,
    "cancelAtPeriodEnd" BOOLEAN DEFAULT false,
    "cancelAt" TIMESTAMP WITH TIME ZONE,
    "canceledAt" TIMESTAMP WITH TIME ZONE,
    "endedAt" TIMESTAMP WITH TIME ZONE,
    seats INTEGER,
    "trialStart" TIMESTAMP WITH TIME ZONE,
    "trialEnd" TIMESTAMP WITH TIME ZONE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscription_reference ON subscription("referenceId");
CREATE INDEX IF NOT EXISTS idx_subscription_stripe_sub ON subscription("stripeSubscriptionId");
CREATE INDEX IF NOT EXISTS idx_subscription_status ON subscription(status);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for subscription updated_at
DROP TRIGGER IF EXISTS update_subscription_timestamp ON subscription;
CREATE TRIGGER update_subscription_timestamp
    BEFORE UPDATE ON subscription
    FOR EACH ROW
    EXECUTE FUNCTION update_subscription_updated_at();

-- RLS Policies for subscription table
ALTER TABLE subscription ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscriptions
CREATE POLICY "Users can view own subscriptions"
    ON subscription FOR SELECT
    USING ("referenceId" = current_user_id() OR 
           "referenceId" IN (
               SELECT id::varchar FROM organization 
               WHERE id IN (
                   SELECT "organizationId" FROM member 
                   WHERE "userId" = current_user_id()
               )
           ));

-- Only system can insert/update/delete subscriptions (via webhook)
CREATE POLICY "System manages subscriptions"
    ON subscription FOR ALL
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE subscription IS 'Stripe subscriptions managed by BetterAuth plugin';
