/**
 * Cleanup Cron Job
 * Cleans up old data to keep the database tidy using SQL functions:
 * - Old terminal sessions (inactive for 24+ hours)
 * - Orphan test results and arena scores
 * - Old notifications (30+ days)
 * - Stale draft competitions (30+ days, no test cases)
 * - Old failed submissions (90+ days, keeping 5 per user/competition)
 * - Expired GitHub tokens
 * - Old skill rating history (keep last 100 per user)
 * - Resolved challenge reports (90+ days)
 * - History retention cleanup (7 days free, 90 days pro)
 * 
 * Recommended schedule: Once per day
 * cron-job.org URL: https://yourapp.com/api/cron/cleanup
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyCronRequest } from "@/lib/cron-auth";
import { trackAPIRequest } from "@/lib/api-monitoring";
import { runHistoryCleanup } from "@/lib/history-cleanup";

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  // Verify cron request (checks both secret and IP address)
  const authResult = await verifyCronRequest(request);
  if (!authResult.authorized) {
    console.warn(`Cron auth failed: ${authResult.error}`);
    const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    trackAPIRequest("/api/cron/cleanup", "GET", 401, Date.now() - startTime);
    return response;
  }
  console.log(`Cron request authorized from IP: ${authResult.clientIP}`);

  try {
    // Run all cleanup functions via the master cleanup RPC
    const { data, error } = await supabase.rpc("run_all_cleanups");

    if (error) {
      // If the function doesn't exist, fall back to legacy cleanup
      if (error.message.includes("does not exist")) {
        return legacyCleanup(request, startTime);
      }
      throw error;
    }

    const results = data as Array<{ cleanup_name: string; items_cleaned: number }>;
    const totalCleaned = results.reduce((sum, r) => sum + r.items_cleaned, 0);

    console.log(`✅ Cleanup completed: ${totalCleaned} items cleaned`);
    results.forEach(r => {
      if (r.items_cleaned > 0) {
        console.log(`  - ${r.cleanup_name}: ${r.items_cleaned} items`);
      }
    });

    // Run history retention cleanup (based on subscription plans)
    let historyCleanupResult = null;
    try {
      historyCleanupResult = await runHistoryCleanup();
      console.log(`  - history_retention: ${historyCleanupResult.executionLogsDeleted + historyCleanupResult.submissionsArchived} items`);
    } catch (historyError) {
      console.error('History cleanup error:', historyError);
    }

    const response = NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      total_items_cleaned: totalCleaned + (historyCleanupResult 
        ? historyCleanupResult.executionLogsDeleted + historyCleanupResult.submissionsArchived 
        : 0),
      results,
      historyCleanup: historyCleanupResult,
    });
    trackAPIRequest("/api/cron/cleanup", "GET", 200, Date.now() - startTime);
    return response;
  } catch (error) {
    console.error("Cleanup cron job error:", error);
    const response = NextResponse.json(
      { 
        success: false, 
        error: "Internal server error",
        details: String(error)
      },
      { status: 500 }
    );
    trackAPIRequest("/api/cron/cleanup", "GET", 500, Date.now() - startTime);
    return response;
  }
}

// Legacy cleanup for backwards compatibility
async function legacyCleanup(request: NextRequest, startTime: number) {
  const now = new Date();
  const results = {
    terminalSessionsCleaned: 0,
    oldSubmissionsCleaned: 0,
    errors: [] as string[],
  };

  try {
    // 1. Clean up old terminal sessions (inactive for 24+ hours)
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const { data: oldSessions, error: sessionsError } = await supabase
      .from("terminal_sessions")
      .select("id")
      .or(`status.eq.active,status.eq.error`)
      .lt("last_activity_at", twentyFourHoursAgo.toISOString());

    if (sessionsError) {
      results.errors.push(`Failed to fetch old sessions: ${sessionsError.message}`);
    } else if (oldSessions && oldSessions.length > 0) {
      const sessionIds = oldSessions.map(s => s.id);
      
      const { error: updateError } = await supabase
        .from("terminal_sessions")
        .update({ 
          status: "destroyed",
          ended_at: now.toISOString()
        })
        .in("id", sessionIds);

      if (updateError) {
        results.errors.push(`Failed to cleanup sessions: ${updateError.message}`);
      } else {
        results.terminalSessionsCleaned = sessionIds.length;
        console.log(`🧹 Cleaned up ${sessionIds.length} old terminal sessions`);
      }
    }

    // 2. Clean up old completed terminal sessions (older than 7 days)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const { error: deleteOldError, count: deletedCount } = await supabase
      .from("terminal_sessions")
      .delete()
      .eq("status", "destroyed")
      .lt("ended_at", sevenDaysAgo.toISOString());

    if (deleteOldError) {
      results.errors.push(`Failed to delete old sessions: ${deleteOldError.message}`);
    } else if (deletedCount) {
      console.log(`🗑️ Deleted ${deletedCount} old destroyed terminal sessions`);
    }

    // 3. Clean up orphaned test results (for submissions that don't exist)
    const { error: orphanError } = await supabase.rpc('cleanup_orphan_test_results');
    
    if (orphanError && !orphanError.message.includes('does not exist')) {
      results.errors.push(`Failed to cleanup orphan test results: ${orphanError.message}`);
    }

    console.log(`✅ Legacy cleanup completed at ${now.toISOString()}`);

    const response = NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      legacy: true,
      results,
    });
    trackAPIRequest("/api/cron/cleanup", "GET", 200, Date.now() - startTime);
    return response;
  } catch (error) {
    console.error("Legacy cleanup error:", error);
    const response = NextResponse.json(
      { 
        success: false, 
        error: "Internal server error",
        results 
      },
      { status: 500 }
    );
    trackAPIRequest("/api/cron/cleanup", "GET", 500, Date.now() - startTime);
    return response;
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}

