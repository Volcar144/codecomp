import Stripe from 'stripe';

// Stripe client - only initialize if secret key is set
// This allows the app to build without Stripe configured
export const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-12-15.clover',
      typescript: true,
    })
  : null;

// Helper to get stripe client with error handling
export function getStripe(): Stripe {
  if (!stripe) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return stripe;
}

// Price IDs from Stripe Dashboard
export const PRICES = {
  PRO_MONTHLY: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || 'price_pro_monthly',
  PRO_YEARLY: process.env.STRIPE_PRO_YEARLY_PRICE_ID || 'price_pro_yearly',
} as const;

// Subscription tiers
export type SubscriptionTier = 'free' | 'pro';

export interface SubscriptionStatus {
  tier: SubscriptionTier;
  isActive: boolean;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

// Helper to get subscription tier from Stripe subscription
export function getTierFromSubscription(subscription: Stripe.Subscription | null): SubscriptionTier {
  if (!subscription || subscription.status !== 'active') {
    return 'free';
  }
  return 'pro';
}

// Feature limits by tier
export const TIER_LIMITS = {
  free: {
    dailyExecutions: 30,
    executionTimeout: 10, // seconds
    historyDays: 7,
    privateCompetitions: false,
    priorityQueue: false,
  },
  pro: {
    dailyExecutions: Infinity,
    executionTimeout: 30, // seconds
    historyDays: 90,
    privateCompetitions: true,
    priorityQueue: true,
  },
} as const;
