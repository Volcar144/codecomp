/**
 * Arena Status Automation Cron Job
 * Updates arena statuses based on dates:
 * - draft -> active when start_date passes
 * - active -> judging when end_date passes
 * - judging -> completed after judging period
 * 
 * Recommended schedule: Every 5 minutes
 * cron-job.org URL: https://yourapp.com/api/cron/arenas
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyCronRequest } from "@/lib/cron-auth";

interface Arena {
  id: string;
  title: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  creator_id: string;
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
    movedToJudging: 0,
    errors: [] as string[],
  };

  try {
    // 1. Activate arenas that should start
    const { data: toActivate, error: activateError } = await supabase
      .from("arenas")
      .select("*")
      .eq("status", "draft")
      .not("start_date", "is", null)
      .lte("start_date", now.toISOString());

    if (activateError) {
      results.errors.push(`Failed to fetch arenas to activate: ${activateError.message}`);
    } else if (toActivate && toActivate.length > 0) {
      for (const arena of toActivate as Arena[]) {
        const { error: updateError } = await supabase
          .from("arenas")
          .update({ status: "active", updated_at: now.toISOString() })
          .eq("id", arena.id);

        if (updateError) {
          results.errors.push(`Failed to activate arena ${arena.id}: ${updateError.message}`);
        } else {
          results.activated++;
          console.log(`✅ Arena "${arena.title}" activated`);
        }
      }
    }

    // 2. Move arenas to judging phase when end_date passes
    const { data: toJudge, error: judgeError } = await supabase
      .from("arenas")
      .select("*")
      .eq("status", "active")
      .not("end_date", "is", null)
      .lte("end_date", now.toISOString());

    if (judgeError) {
      results.errors.push(`Failed to fetch arenas for judging: ${judgeError.message}`);
    } else if (toJudge && toJudge.length > 0) {
      for (const arena of toJudge as Arena[]) {
        const { error: updateError } = await supabase
          .from("arenas")
          .update({ status: "judging", updated_at: now.toISOString() })
          .eq("id", arena.id);

        if (updateError) {
          results.errors.push(`Failed to move arena to judging ${arena.id}: ${updateError.message}`);
        } else {
          results.movedToJudging++;
          console.log(`⚖️ Arena "${arena.title}" moved to judging phase`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      results,
    });
  } catch (error) {
    console.error("Arena cron job error:", error);
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

export async function POST(request: NextRequest) {
  return GET(request);
}
