# Stripe Subscription Setup Guide

This guide walks you through setting up Stripe subscriptions for CodeComp, including individual Pro plans, Family plans, and Team/Organization plans.

## Prerequisites

1. A [Stripe account](https://dashboard.stripe.com/register)
2. Access to the Stripe Dashboard
3. Your CodeComp instance running

## Step 1: Create a Stripe Account & Get API Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Sign in or create an account
3. Navigate to **Developers → API keys**
4. Copy your keys:
   - **Publishable key** (starts with `pk_test_` or `pk_live_`)
   - **Secret key** (starts with `sk_test_` or `sk_live_`)

> ⚠️ **Important**: Use test mode keys (`pk_test_`, `sk_test_`) during development!

## Step 2: Create Products in Stripe

Navigate to **Products → Add product** in the Stripe Dashboard.

### Product 1: Pro Plan (Individual)

1. Click **Add product**
2. Fill in:
   - **Name**: `CodeComp Pro`
   - **Description**: `Unlimited executions, priority queue, private competitions`
3. Add **two prices**:

   **Monthly Price:**
   - Pricing model: Standard pricing
   - Price: `$5.00`
   - Billing period: Monthly
   - Click "Add price" → Copy the **Price ID** (e.g., `price_1ABC...`)

   **Yearly Price:**
   - Click "Add another price"
   - Price: `$48.00` (saves $12/year)
   - Billing period: Yearly
   - Copy the **Price ID**

### Product 2: Family Plan (3 seats)

1. Click **Add product**
2. Fill in:
   - **Name**: `CodeComp Family`
   - **Description**: `Pro features for up to 3 family members`
3. Add **two prices**:

   **Monthly Price:**
   - Price: `$12.00`
   - Billing period: Monthly
   - Copy the **Price ID**

   **Yearly Price:**
   - Price: `$99.00` (saves $45/year)
   - Billing period: Yearly
   - Copy the **Price ID**

### Product 3: Team Plan (5+ seats)

1. Click **Add product**
2. Fill in:
   - **Name**: `CodeComp Team`
   - **Description**: `Pro features for your team, 5 seats included`
3. Add prices:

   **Monthly Base Price:**
   - Price: `$25.00`
   - Billing period: Monthly
   - Copy the **Price ID**

   **Yearly Base Price:**
   - Price: `$240.00`
   - Billing period: Yearly
   - Copy the **Price ID**

   **(Optional) Per-Seat Add-on:**
   - Create a separate metered price for additional seats
   - Price: `$5.00` per seat/month

## Step 3: Set Up Webhook

Webhooks allow Stripe to notify your app when subscription events occur.

1. Go to **Developers → Webhooks**
2. Click **Add endpoint**
3. Enter your webhook URL:
   - Development: Use [Stripe CLI](https://stripe.com/docs/stripe-cli) or ngrok
   - Production: `https://your-domain.com/api/auth/stripe/webhook`
4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `customer.subscription.trial_will_end`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the **Webhook signing secret** (starts with `whsec_`)

### Local Development with Stripe CLI

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to your local server
stripe listen --forward-to localhost:3000/api/auth/stripe/webhook

# Copy the webhook signing secret from the output
```

## Step 4: Configure Environment Variables

Add these to your `.env` file:

```env
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Price IDs (from Step 2)
STRIPE_PRO_MONTHLY_PRICE_ID=price_xxxxxxxxxxxxx
STRIPE_PRO_YEARLY_PRICE_ID=price_xxxxxxxxxxxxx
STRIPE_FAMILY_MONTHLY_PRICE_ID=price_xxxxxxxxxxxxx
STRIPE_FAMILY_YEARLY_PRICE_ID=price_xxxxxxxxxxxxx
STRIPE_TEAM_MONTHLY_PRICE_ID=price_xxxxxxxxxxxxx
STRIPE_TEAM_YEARLY_PRICE_ID=price_xxxxxxxxxxxxx

# Optional: Disable payment gating for development
DISABLE_PAYMENT_GATING=false
```

## Step 5: Run Database Migrations

BetterAuth's Stripe plugin requires additional tables. Run:

```bash
npx @better-auth/cli generate
npx @better-auth/cli migrate
```

Or manually add these tables (see `supabase-schema.sql` for full schema):

```sql
-- Stripe customer table
CREATE TABLE IF NOT EXISTS stripe_customer (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscription table
CREATE TABLE IF NOT EXISTS subscription (
  id TEXT PRIMARY KEY,
  plan TEXT NOT NULL,
  reference_id TEXT NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT NOT NULL,
  period_start TIMESTAMP WITH TIME ZONE,
  period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  seats INTEGER,
  trial_start TIMESTAMP WITH TIME ZONE,
  trial_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Step 6: Test the Integration

### Test Checkout Flow

1. Start your dev server: `npm run dev`
2. Go to `/pricing`
3. Select a plan and click "Start Free Trial"
4. Use Stripe test cards:
   - **Success**: `4242 4242 4242 4242`
   - **Requires authentication**: `4000 0025 0000 3155`
   - **Declined**: `4000 0000 0000 0002`
5. Use any future expiry date and any 3-digit CVC

### Test Subscription Lifecycle

```bash
# Trigger trial ending (3 days before)
stripe trigger customer.subscription.trial_will_end

# Trigger successful payment
stripe trigger invoice.payment_succeeded

# Trigger failed payment
stripe trigger invoice.payment_failed
```

## Feature Comparison by Plan

| Feature | Free | Pro ($5/mo) | Family ($12/mo) | Team ($25/mo) |
|---------|------|-------------|-----------------|---------------|
| Daily executions | 30 | Unlimited | Unlimited | Unlimited |
| Execution timeout | 10s | 30s | 30s | 30s |
| Priority queue | ❌ | ✅ | ✅ | ✅ |
| Private competitions | ❌ | ✅ | ✅ | ✅ |
| History retention | 7 days | 90 days | 90 days | 90 days |
| Seats included | 1 | 1 | 3 | 5 |
| Additional seats | - | - | - | $5/seat/mo |

## Subscription Management

### For Users

- **Billing Portal**: Users can manage subscriptions at `/settings/billing`
- **Upgrade/Downgrade**: Available through the billing portal
- **Cancel**: Can cancel anytime, access continues until period end

### For Admins

Use Stripe Dashboard to:
- View all subscriptions
- Issue refunds
- Extend trials
- Apply discounts

## Webhooks Reference

BetterAuth handles these webhook events automatically:

| Event | What Happens |
|-------|--------------|
| `checkout.session.completed` | Creates subscription record |
| `customer.subscription.updated` | Updates plan, status, period dates |
| `customer.subscription.deleted` | Marks subscription as canceled |
| `customer.subscription.trial_will_end` | Sends trial ending email (3 days before) |
| `invoice.payment_failed` | Sends payment failed email, updates status |
| `invoice.payment_succeeded` | Sends receipt, updates status |

## Troubleshooting

### Webhook not receiving events

1. Check webhook URL is correct and publicly accessible
2. Verify webhook secret matches
3. Check Stripe Dashboard → Webhooks → Recent events for errors

### Subscription not showing after checkout

1. Check webhook logs for errors
2. Verify database tables exist
3. Check server logs for BetterAuth errors

### Test mode vs Live mode

- Always use test mode keys for development
- Test cards only work in test mode
- When going live:
  1. Switch to live API keys
  2. Create new webhook endpoint with live URL
  3. Update all environment variables

## Going to Production

1. ✅ Switch to live Stripe API keys
2. ✅ Create production webhook endpoint
3. ✅ Set `DISABLE_PAYMENT_GATING=false`
4. ✅ Verify all price IDs are production IDs
5. ✅ Test with real card (can refund immediately)
6. ✅ Set up Stripe Tax if required for your region
7. ✅ Configure invoice settings in Stripe
