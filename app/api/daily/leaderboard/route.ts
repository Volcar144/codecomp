/**
 * Daily Leaderboard API
 * GET - Get today's leaderboard
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || new Date().toISOString().split('T')[0];

    // Get the challenge for the date
    const { data: challenge } = await supabase
      .from("daily_challenges")
      .select("id, title, difficulty")
      .eq("challenge_date", date)
      .single();

    if (!challenge) {
      return NextResponse.json(
        { error: "No challenge found for this date" },
        { status: 404 }
      );
    }

    // Get leaderboard for this challenge
    const { data: submissions, error } = await supabase
      .from("daily_submissions")
      .select("user_id, score, execution_time, language, submitted_at, passed")
      .eq("daily_challenge_id", challenge.id)
      .eq("passed", true)
      .order("score", { ascending: false })
      .order("execution_time", { ascending: true })
      .limit(100);

    if (error) {
      console.error("Error fetching leaderboard:", error);
      return NextResponse.json(
        { error: "Failed to fetch leaderboard" },
        { status: 500 }
      );
    }

    // Add rank to each entry
    const leaderboard = submissions?.map((s, i) => ({
      rank: i + 1,
      ...s,
    })) || [];

    return NextResponse.json({
      challenge,
      date,
      leaderboard,
      totalParticipants: leaderboard.length,
    });
  } catch (error) {
    console.error("Error in GET /api/daily/leaderboard:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
