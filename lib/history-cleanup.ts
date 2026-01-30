/**
 * History Retention Cleanup
 * 
 * Cleans up old execution logs and submissions based on user's subscription plan.
 * - Free users: 7 days retention
 * - Pro/Family/Team users: 90 days retention
 * 
 * This should be run as a scheduled job (e.g., daily via cron or Vercel cron).
 */

import { supabase } from "./supabase";
import { PLAN_LIMITS, SubscriptionPlan } from "./subscription-utils";

/**
 * Get the retention period for a user based on their subscription
 */
async function getUserRetentionDays(userId: string): Promise<number> {
  try {
    // Check for active subscription
    const { data: subscription } = await supabase
      .from('subscription')
      .select('plan, status')
      .eq('referenceId', userId)
      .in('status', ['active', 'trialing'])
      .limit(1)
      .single();

    if (subscription && ['pro', 'family', 'team'].includes(subscription.plan)) {
      return PLAN_LIMITS[subscription.plan as SubscriptionPlan].historyDays;
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
      // Check if the owner has an active family plan
      const { data: ownerSubscription } = await supabase
        .from('subscription')
        .select('plan, status')
        .eq('referenceId', familyMembership.owner_user_id)
        .eq('plan', 'family')
        .in('status', ['active', 'trialing'])
        .limit(1)
        .single();

      if (ownerSubscription) {
        return PLAN_LIMITS.family.historyDays;
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
        return PLAN_LIMITS.team.historyDays;
      }
    }

    // Default to free plan retention
    return PLAN_LIMITS.free.historyDays;
  } catch (error) {
    console.error('Error getting user retention days:', error);
    return PLAN_LIMITS.free.historyDays;
  }
}

/**
 * Clean up old execution logs for a specific user
 */
async function cleanupUserExecutionLogs(userId: string): Promise<number> {
  const retentionDays = await getUserRetentionDays(userId);
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const { data, error } = await supabase
    .from('execution_log')
    .delete()
    .eq('user_id', userId)
    .lt('created_at', cutoffDate.toISOString())
    .select('id');

  if (error) {
    console.error(`Error cleaning up execution logs for user ${userId}:`, error);
    return 0;
  }

  return data?.length || 0;
}

/**
 * Clean up old submissions for a specific user (keeps the submission record but clears the code after retention period)
 * Note: We don't delete submissions entirely as they're part of competition leaderboards
 * Instead, we anonymize/clear the code content after the retention period
 */
async function cleanupUserSubmissions(userId: string): Promise<number> {
  const retentionDays = await getUserRetentionDays(userId);
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  // Update old submissions to clear the code (but keep the record for leaderboards)
  const { data, error } = await supabase
    .from('submissions')
    .update({ 
      code: '[Code archived due to retention policy]',
    })
    .eq('user_id', userId)
    .lt('submitted_at', cutoffDate.toISOString())
    .neq('code', '[Code archived due to retention policy]') // Don't update already archived
    .select('id');

  if (error) {
    console.error(`Error cleaning up submissions for user ${userId}:`, error);
    return 0;
  }

  return data?.length || 0;
}

/**
 * Run cleanup for all users
 * This is designed to be called as a scheduled job
 */
export async function runHistoryCleanup(): Promise<{
  usersProcessed: number;
  executionLogsDeleted: number;
  submissionsArchived: number;
}> {
  console.log('Starting history retention cleanup...');
  const startTime = Date.now();

  let usersProcessed = 0;
  let executionLogsDeleted = 0;
  let submissionsArchived = 0;

  try {
    // Get all unique user IDs from execution_log and submissions
    // Process in batches to avoid memory issues
    const batchSize = 100;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      // Get unique users from execution_log
      const { data: executionUsers, error: execError } = await supabase
        .from('execution_log')
        .select('user_id')
        .range(offset, offset + batchSize - 1);

      if (execError) {
        console.error('Error fetching execution log users:', execError);
        break;
      }

      // Get unique users from submissions
      const { data: submissionUsers, error: subError } = await supabase
        .from('submissions')
        .select('user_id')
        .range(offset, offset + batchSize - 1);

      if (subError) {
        console.error('Error fetching submission users:', subError);
        break;
      }

      // Combine and dedupe user IDs
      const userIds = new Set<string>();
      executionUsers?.forEach(u => userIds.add(u.user_id));
      submissionUsers?.forEach(u => userIds.add(u.user_id));

      if (userIds.size === 0) {
        hasMore = false;
        break;
      }

      // Process each user
      for (const userId of userIds) {
        const logsDeleted = await cleanupUserExecutionLogs(userId);
        const subsArchived = await cleanupUserSubmissions(userId);
        
        executionLogsDeleted += logsDeleted;
        submissionsArchived += subsArchived;
        usersProcessed++;
      }

      offset += batchSize;
      
      // Safety limit
      if (offset > 10000) {
        console.warn('Cleanup batch limit reached, stopping');
        hasMore = false;
      }
    }

    const duration = Date.now() - startTime;
    console.log(`History cleanup completed in ${duration}ms:`, {
      usersProcessed,
      executionLogsDeleted,
      submissionsArchived,
    });

    return {
      usersProcessed,
      executionLogsDeleted,
      submissionsArchived,
    };
  } catch (error) {
    console.error('Error during history cleanup:', error);
    return {
      usersProcessed,
      executionLogsDeleted,
      submissionsArchived,
    };
  }
}

/**
 * Quick cleanup for a single user (called when they view their history)
 * This ensures their history view only shows data within their retention period
 */
export async function cleanupUserHistory(userId: string): Promise<{
  executionLogsDeleted: number;
  submissionsArchived: number;
}> {
  const executionLogsDeleted = await cleanupUserExecutionLogs(userId);
  const submissionsArchived = await cleanupUserSubmissions(userId);

  return {
    executionLogsDeleted,
    submissionsArchived,
  };
}

/**
 * Get user's history with respect to retention period
 * Returns only data within the user's retention window
 */
export async function getUserHistoryWithRetention(
  userId: string,
  type: 'executions' | 'submissions' = 'submissions',
  limit: number = 50
): Promise<{
  data: unknown[];
  retentionDays: number;
  oldestAllowed: Date;
}> {
  const retentionDays = await getUserRetentionDays(userId);
  const oldestAllowed = new Date();
  oldestAllowed.setDate(oldestAllowed.getDate() - retentionDays);

  if (type === 'executions') {
    const { data } = await supabase
      .from('execution_log')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', oldestAllowed.toISOString())
      .order('created_at', { ascending: false })
      .limit(limit);

    return {
      data: data || [],
      retentionDays,
      oldestAllowed,
    };
  }

  // Submissions
  const { data } = await supabase
    .from('submissions')
    .select('*, competitions(title)')
    .eq('user_id', userId)
    .gte('submitted_at', oldestAllowed.toISOString())
    .order('submitted_at', { ascending: false })
    .limit(limit);

  return {
    data: data || [],
    retentionDays,
    oldestAllowed,
  };
}
