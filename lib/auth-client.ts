import { createAuthClient } from "better-auth/react";
import { stripeClient } from "@better-auth/stripe/client";
import { organizationClient } from "better-auth/client/plugins";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const authClient = createAuthClient({
  baseURL: appUrl,
  plugins: [
    stripeClient({
      subscription: true
    }),
    organizationClient({
      teams: {
        enabled: true
      }
    }),
  ],
});

export const { signIn, signUp, signOut, useSession } = authClient;

// Password reset methods
export const requestPasswordReset = authClient.requestPasswordReset;
export const resetPassword = authClient.resetPassword;

// Export subscription namespace from authClient
export const subscription = authClient.subscription;

// Export organization namespace from authClient
export const organization = authClient.organization;


// Helper types
export type SubscriptionPlan = 'free' | 'pro' | 'family' | 'team';

export interface SubscriptionInfo {
  plan: SubscriptionPlan;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | 'unpaid' | 'none' | 'incomplete_expired' | 'paused';
  periodEnd: Date | null;
  trialEnd: Date | null;
  seats?: number;
  cancelAtPeriodEnd: boolean;
}

// Helper to get user's active subscription
export async function getActiveSubscription(): Promise<SubscriptionInfo | null> {
  try {
    const { data, error } = await authClient.subscription.list();
    
    if (error || !data?.length) {
      return null;
    }

    // Find active subscription
    const active = data.find(
      (sub: { status: string }) => 
        sub.status === 'active' || sub.status === 'trialing'
    );

    if (!active) {
      return null;
    }

    return {
      plan: active.plan as SubscriptionPlan,
      status: active.status,
      periodEnd: active.periodEnd ? new Date(active.periodEnd) : null,
      trialEnd: active.trialEnd ? new Date(active.trialEnd) : null,
      seats: active.seats,
      cancelAtPeriodEnd: active.cancelAtPeriodEnd || false,
    };
  } catch {
    return null;
  }
}
