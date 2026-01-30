/**
 * Subscription utilities for feature gating
 * 
 * Features by plan:
 * - Free: 30 executions/day, 10s timeout, public competitions only
 * - Pro/Family/Team: Unlimited executions, 30s timeout, private competitions, 90-day history
 */

import { supabase } from "./supabase";

// Environment variable to disable all feature gating (for development/testing)
export const DISABLE_PAYMENT_GATING = process.env.DISABLE_PAYMENT_GATING === 'true';

export type SubscriptionPlan = 'free' | 'pro' | 'family' | 'team';

export interface PlanLimits {
  dailyExecutions: number;
  executionTimeoutSeconds: number;
  historyDays: number;
  canCreatePrivateCompetitions: boolean;
  priorityQueue: boolean;
  seats?: number;
}

// Plan limits configuration
export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  free: {
    dailyExecutions: 30,
    executionTimeoutSeconds: 10,
    historyDays: 7,
    canCreatePrivateCompetitions: false,
    priorityQueue: false,
  },
  pro: {
    dailyExecutions: Infinity,
    executionTimeoutSeconds: 30,
    historyDays: 90,
    canCreatePrivateCompetitions: true,
    priorityQueue: true,
  },
  family: {
    dailyExecutions: Infinity,
    executionTimeoutSeconds: 30,
    historyDays: 90,
    canCreatePrivateCompetitions: true,
    priorityQueue: true,
    seats: 3,
  },
  team: {
    dailyExecutions: Infinity,
    executionTimeoutSeconds: 30,
    historyDays: 90,
    canCreatePrivateCompetitions: true,
    priorityQueue: true,
    seats: 5, // Base seats, can have more
  },
};

/**
 * Get user's current subscription plan from the database
 * BetterAuth stores subscriptions in the `subscription` table
 * Also checks for family/team membership
 */
export async function getUserPlan(userId: string): Promise<SubscriptionPlan> {
  // If payment gating is disabled, return pro for all users
  if (DISABLE_PAYMENT_GATING) {
    return 'pro';
  }

  try {
    // First, check for direct subscription
    const { data: subscriptions, error } = await supabase
      .from('subscription')
      .select('plan, status')
      .eq('referenceId', userId)
      .in('status', ['active', 'trialing'])
      .order('createdAt', { ascending: false })
      .limit(1);

    if (!error && subscriptions && subscriptions.length > 0) {
      const plan = subscriptions[0].plan as string;
      if (plan === 'pro' || plan === 'family' || plan === 'team') {
        return plan;
      }
    }

    // Check if user is a family member
    const { data: familyMembership } = await supabase
      .from('family_members')
      .select('owner_user_id')
      .eq('member_user_id', userId)
      .eq('status', 'active')
      .limit(1)
      .single();

    if (familyMembership) {
      // Verify the owner still has an active family plan
      const { data: ownerSubscription } = await supabase
        .from('subscription')
        .select('plan, status')
        .eq('referenceId', familyMembership.owner_user_id)
        .eq('plan', 'family')
        .in('status', ['active', 'trialing'])
        .limit(1)
        .single();

      if (ownerSubscription) {
        return 'family'; // User gets family plan benefits
      }
    }

    // Check if user is a team member
    const { data: teamMembership } = await supabase
      .from('team_members')
      .select('team_id, teams(owner_user_id)')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(1)
      .single();

    if (teamMembership && teamMembership.teams) {
      const ownerUserId = (teamMembership.teams as unknown as { owner_user_id: string }).owner_user_id;
      const { data: ownerSubscription } = await supabase
        .from('subscription')
        .select('plan, status')
        .eq('referenceId', ownerUserId)
        .eq('plan', 'team')
        .in('status', ['active', 'trialing'])
        .limit(1)
        .single();

      if (ownerSubscription) {
        return 'team'; // User gets team plan benefits
      }
    }

    return 'free';
  } catch (error) {
    console.error('Error in getUserPlan:', error);
    return 'free';
  }
}

/**
 * Get plan limits for a user
 */
export async function getUserPlanLimits(userId: string): Promise<PlanLimits> {
  const plan = await getUserPlan(userId);
  return PLAN_LIMITS[plan];
}

/**
 * Check if user can create private competitions
 */
export async function canCreatePrivateCompetition(userId: string): Promise<boolean> {
  if (DISABLE_PAYMENT_GATING) return true;
  
  const limits = await getUserPlanLimits(userId);
  return limits.canCreatePrivateCompetitions;
}

/**
 * Get user's daily execution count
 */
export async function getDailyExecutionCount(userId: string): Promise<number> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count, error } = await supabase
      .from('execution_log')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', today.toISOString());

    if (error) {
      // Table might not exist yet, return 0
      console.error('Error counting executions:', error);
      return 0;
    }

    return count || 0;
  } catch {
    return 0;
  }
}

/**
 * Log an execution for rate limiting
 */
export async function logExecution(userId: string): Promise<void> {
  try {
    await supabase
      .from('execution_log')
      .insert({ user_id: userId });
  } catch (error) {
    console.error('Error logging execution:', error);
  }
}

/**
 * Check if user can execute code (under daily limit)
 */
export async function canExecuteCode(userId: string): Promise<{ 
  allowed: boolean; 
  remaining: number; 
  limit: number;
  plan: SubscriptionPlan;
}> {
  if (DISABLE_PAYMENT_GATING) {
    return { allowed: true, remaining: Infinity, limit: Infinity, plan: 'pro' };
  }

  const plan = await getUserPlan(userId);
  const limits = PLAN_LIMITS[plan];
  
  // Paid plans have unlimited executions
  if (limits.dailyExecutions === Infinity) {
    return { allowed: true, remaining: Infinity, limit: Infinity, plan };
  }

  const count = await getDailyExecutionCount(userId);
  const remaining = Math.max(0, limits.dailyExecutions - count);

  return {
    allowed: count < limits.dailyExecutions,
    remaining,
    limit: limits.dailyExecutions,
    plan,
  };
}

/**
 * Get execution timeout for a user's plan
 */
export async function getExecutionTimeout(userId: string): Promise<number> {
  if (DISABLE_PAYMENT_GATING) {
    return PLAN_LIMITS.pro.executionTimeoutSeconds;
  }

  const limits = await getUserPlanLimits(userId);
  return limits.executionTimeoutSeconds;
}

/**
 * Check if user has priority queue access
 */
export async function hasPriorityQueue(userId: string): Promise<boolean> {
  if (DISABLE_PAYMENT_GATING) return true;
  
  const limits = await getUserPlanLimits(userId);
  return limits.priorityQueue;
}

// Client-side helper types for API responses
export interface ExecutionLimitResponse {
  allowed: boolean;
  remaining: number;
  limit: number;
  plan: SubscriptionPlan;
  error?: string;
}

export interface FeatureGateResponse {
  allowed: boolean;
  requiredPlan: SubscriptionPlan;
  currentPlan: SubscriptionPlan;
  message?: string;
}
