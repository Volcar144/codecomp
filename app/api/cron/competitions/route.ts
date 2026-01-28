/**
 * Competition Status Automation Cron Job
 * Updates competition statuses based on dates:
 * - draft -> active when start_date passes
 * - active -> ended when end_date passes
 * - Sends email notifications for status changes
 * 
 * Recommended schedule: Every 5 minutes
 * cron-job.org URL: https://yourapp.com/api/cron/competitions
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { 
  sendCompetitionStartedEmail, 
  sendCompetitionEndedEmail,
  sendCompetitionEndingSoonEmail 
} from "@/lib/email";
import { verifyCronRequest } from "@/lib/cron-auth";

interface Competition {
  id: string;
  title: string;
  status: string;
  start_date: string;
  end_date: string;
  creator_id: string;
}

interface LeaderboardEntry {
  user_id: string;
  rank: number;
  best_score: number;
}

interface UserWithEmail {
  id: string;
  email: string;
  name: string | null;
}

/**
 * Get user emails from BetterAuth user table
 */
async function getUserEmails(userIds: string[]): Promise<Map<string, UserWithEmail>> {
  if (userIds.length === 0) return new Map();
  
  const { data: users, error } = await supabase
    .from("user")
    .select("id, email, name")
    .in("id", userIds);
  
  if (error || !users) {
    console.error("Failed to fetch user emails:", error);
    return new Map();
  }
  
  return new Map(users.map(u => [u.id, u as UserWithEmail]));
}

/**
 * Get unique submitters for a competition
 */
async function getCompetitionSubmitters(competitionId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("submissions")
    .select("user_id")
    .eq("competition_id", competitionId);
  
  if (error || !data) return [];
  
  return [...new Set(data.map(s => s.user_id))];
}

export async function GET(request: NextRequest) {
  // Verify cron request (checks both secret and IP address)
  const authResult = await verifyCronRequest(request);
  if (!authResult.authorized) {
    console.warn(`Cron auth failed: ${authResult.error}`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  console.log(`Cron request authorized from IP: ${authResult.clientIP}`);

  const now = new Date();
  const results = {
    activated: 0,
    ended: 0,
    endingSoonNotifications: 0,
    errors: [] as string[],
  };

  try {
    // 1. Activate competitions that should start
    const { data: toActivate, error: activateError } = await supabase
      .from("competitions")
      .select("*")
      .eq("status", "draft")
      .lte("start_date", now.toISOString());

    if (activateError) {
      results.errors.push(`Failed to fetch competitions to activate: ${activateError.message}`);
    } else if (toActivate && toActivate.length > 0) {
      for (const competition of toActivate as Competition[]) {
        const { error: updateError } = await supabase
          .from("competitions")
          .update({ status: "active", updated_at: now.toISOString() })
          .eq("id", competition.id);

        if (updateError) {
          results.errors.push(`Failed to activate competition ${competition.id}: ${updateError.message}`);
        } else {
          results.activated++;
          
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
          console.log(`✅ Competition "${competition.title}" activated`);
          
          // Send notification to creator
          const creatorMap = await getUserEmails([competition.creator_id]);
          const creator = creatorMap.get(competition.creator_id);
          if (creator?.email) {
            await sendCompetitionStartedEmail(creator.email, {
              competitionTitle: competition.title,
              competitionUrl: `${appUrl}/competitions/${competition.id}`,
              endDate: competition.end_date,
            });
          }
        }
      }
    }

    // 2. End competitions that have passed their end date
    const { data: toEnd, error: endError } = await supabase
      .from("competitions")
      .select("*")
      .eq("status", "active")
      .lte("end_date", now.toISOString());

    if (endError) {
      results.errors.push(`Failed to fetch competitions to end: ${endError.message}`);
    } else if (toEnd && toEnd.length > 0) {
      for (const competition of toEnd as Competition[]) {
        const { error: updateError } = await supabase
          .from("competitions")
          .update({ status: "ended", updated_at: now.toISOString() })
          .eq("id", competition.id);

        if (updateError) {
          results.errors.push(`Failed to end competition ${competition.id}: ${updateError.message}`);
        } else {
          results.ended++;
          console.log(`🏁 Competition "${competition.title}" ended`);
          
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
          
          // Get final leaderboard and send notifications to participants
          const { data: leaderboard } = await supabase
            .from("leaderboard")
            .select("user_id, rank, best_score")
            .eq("competition_id", competition.id)
            .order("rank", { ascending: true });

          if (leaderboard && leaderboard.length > 0) {
            const userIds = leaderboard.map((e: LeaderboardEntry) => e.user_id);
            const userMap = await getUserEmails(userIds);
            
            // Send emails to all participants with their final ranking
            for (const entry of leaderboard as LeaderboardEntry[]) {
              const user = userMap.get(entry.user_id);
              if (user?.email) {
                await sendCompetitionEndedEmail(user.email, {
                  competitionTitle: competition.title,
                  competitionUrl: `${appUrl}/competitions/${competition.id}`,
                  rank: entry.rank,
                  score: entry.best_score,
                });
              }
            }
            
            console.log(`📧 Sent ${leaderboard.length} competition ended emails`);
          }
        }
      }
    }

    // 3. Send "ending soon" notifications for competitions ending in 24 hours
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const twentyThreeHoursFromNow = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    
    const { data: endingSoon, error: endingSoonError } = await supabase
      .from("competitions")
      .select("*")
      .eq("status", "active")
      .gte("end_date", twentyThreeHoursFromNow.toISOString())
      .lte("end_date", twentyFourHoursFromNow.toISOString());

    if (endingSoonError) {
      results.errors.push(`Failed to fetch ending soon competitions: ${endingSoonError.message}`);
    } else if (endingSoon && endingSoon.length > 0) {
      results.endingSoonNotifications = endingSoon.length;
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      
      for (const competition of endingSoon as Competition[]) {
        console.log(`⏰ Competition "${competition.title}" ending in ~24 hours`);
        
        // Get all participants who have submitted
        const submitterIds = await getCompetitionSubmitters(competition.id);
        if (submitterIds.length > 0) {
          const userMap = await getUserEmails(submitterIds);
          
          for (const userId of submitterIds) {
            const user = userMap.get(userId);
            if (user?.email) {
              await sendCompetitionEndingSoonEmail(user.email, {
                competitionTitle: competition.title,
                competitionUrl: `${appUrl}/competitions/${competition.id}`,
                endDate: competition.end_date,
              });
            }
          }
          
          console.log(`📧 Sent ${submitterIds.length} ending soon notifications for "${competition.title}"`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      results,
    });
  } catch (error) {
    console.error("Cron job error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Internal server error",
        results 
      },
      { status: 500 }
    );
  }
}

// Also allow POST for some cron services that only support POST
export async function POST(request: NextRequest) {
  return GET(request);
}
