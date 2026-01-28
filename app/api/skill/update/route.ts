import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { trackAPIRequest } from "@/lib/api-monitoring";

// POST /api/skill/update - Update skill ratings after competition ends
// This should be called by a cron job or when competition status changes to 'completed'
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { competition_id, cron_secret } = body;

    // Verify request is from cron job or admin
    if (cron_secret !== process.env.CRON_SECRET) {
      const session = await auth.api.getSession({ headers: await headers() });
      if (!session?.user) {
        const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        trackAPIRequest("/api/skill/update", "POST", 401, Date.now() - startTime);
        return response;
      }

      // Check if user is the competition creator
      const { data: competition } = await supabase
        .from("competitions")
        .select("creator_id")
        .eq("id", competition_id)
        .single();

      if (!competition || competition.creator_id !== session.user.id) {
        const response = NextResponse.json({ error: "Forbidden" }, { status: 403 });
        trackAPIRequest("/api/skill/update", "POST", 403, Date.now() - startTime);
        return response;
      }
    }

    // Get competition details
    const { data: competition, error: compError } = await supabase
      .from("competitions")
      .select("id, status, title")
      .eq("id", competition_id)
      .single();

    if (compError || !competition) {
      const response = NextResponse.json({ error: "Competition not found" }, { status: 404 });
      trackAPIRequest("/api/skill/update", "POST", 404, Date.now() - startTime);
      return response;
    }

    if (competition.status !== "completed") {
      const response = NextResponse.json(
        { error: "Competition is not completed yet" },
        { status: 400 }
      );
      trackAPIRequest("/api/skill/update", "POST", 400, Date.now() - startTime);
      return response;
    }

    // Get final leaderboard
    const { data: leaderboard, error: lbError } = await supabase
      .from("leaderboard")
      .select("*")
      .eq("competition_id", competition_id)
      .order("rank", { ascending: true });

    if (lbError) throw lbError;

    if (!leaderboard || leaderboard.length === 0) {
      const response = NextResponse.json({ message: "No participants to update" });
      trackAPIRequest("/api/skill/update", "POST", 200, Date.now() - startTime);
      return response;
    }

    const totalParticipants = leaderboard.length;
    const updates: Array<{ user_id: string; new_rating: number }> = [];

    // Update each participant's skill rating
    for (const entry of leaderboard) {
      const { data: result, error } = await supabase.rpc("update_skill_rating", {
        p_user_id: entry.user_id,
        p_competition_id: competition_id,
        p_rank: entry.rank,
        p_total_participants: totalParticipants,
        p_score: entry.best_score || 0,
      });

      if (error) {
        console.error(`Error updating skill for ${entry.user_id}:`, error);
      } else {
        updates.push({ user_id: entry.user_id, new_rating: result });
      }
    }

    // Update challenge metrics
    await supabase.rpc("update_challenge_metrics", {
      p_competition_id: competition_id,
    });

    // Check if challenge is suspicious
    await supabase.rpc("check_challenge_suspicious", {
      p_competition_id: competition_id,
    });

    const response = NextResponse.json({
      message: "Skill ratings updated",
      participants_updated: updates.length,
      total_participants: totalParticipants,
      updates,
    });
    trackAPIRequest("/api/skill/update", "POST", 200, Date.now() - startTime);
    return response;
  } catch (error) {
    console.error("Error updating skill ratings:", error);
    const response = NextResponse.json(
      { error: "Failed to update skill ratings" },
      { status: 500 }
    );
    trackAPIRequest("/api/skill/update", "POST", 500, Date.now() - startTime);
    return response;
  }
}
