import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { trackAPIRequest } from "@/lib/api-monitoring";

// GET /api/skill - Get skill leaderboard or user's skill rating
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get("user_id");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");
  const tier = searchParams.get("tier");

  try {
    if (userId) {
      // Get specific user's skill rating
      const { data, error } = await supabase
        .from("user_skill_ratings")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (!data) {
        // Return default rating for new users
        const response = NextResponse.json({
          user_id: userId,
          skill_rating: 1000,
          skill_tier: "bronze",
          competitions_completed: 0,
          is_new: true,
        });
        trackAPIRequest("/api/skill", "GET", 200, Date.now() - startTime);
        return response;
      }

      // Get their rank
      const { count } = await supabase
        .from("user_skill_ratings")
        .select("*", { count: "exact", head: true })
        .gt("skill_rating", data.skill_rating);

      const response = NextResponse.json({
        ...data,
        global_rank: (count || 0) + 1,
      });
      trackAPIRequest("/api/skill", "GET", 200, Date.now() - startTime);
      return response;
    }

    // Get leaderboard
    let query = supabase
      .from("user_skill_ratings")
      .select("*")
      .gte("competitions_completed", 3) // Minimum 3 competitions
      .order("skill_rating", { ascending: false })
      .range(offset, offset + limit - 1);

    if (tier) {
      query = query.eq("skill_tier", tier);
    }

    const { data, error, count } = await supabase
      .from("user_skill_ratings")
      .select("*", { count: "exact" })
      .gte("competitions_completed", 3)
      .order("skill_rating", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Add ranks
    const leaderboard = (data || []).map((user, index) => ({
      ...user,
      global_rank: offset + index + 1,
    }));

    const response = NextResponse.json({
      leaderboard,
      total: count,
      limit,
      offset,
    });
    trackAPIRequest("/api/skill", "GET", 200, Date.now() - startTime);
    return response;
  } catch (error) {
    console.error("Error fetching skill data:", error);
    const response = NextResponse.json(
      { error: "Failed to fetch skill data" },
      { status: 500 }
    );
    trackAPIRequest("/api/skill", "GET", 500, Date.now() - startTime);
    return response;
  }
}

// POST /api/skill/history - Get user's skill history
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      trackAPIRequest("/api/skill", "POST", 401, Date.now() - startTime);
      return response;
    }

    const body = await request.json();
    const { action, user_id } = body;

    // Only allow users to view their own history (or admins)
    const targetUserId = user_id || session.user.id;
    if (targetUserId !== session.user.id) {
      const response = NextResponse.json({ error: "Forbidden" }, { status: 403 });
      trackAPIRequest("/api/skill", "POST", 403, Date.now() - startTime);
      return response;
    }

    if (action === "history") {
      const { data, error } = await supabase
        .from("skill_rating_history")
        .select(`
          *,
          competitions:competition_id (
            title,
            start_time,
            end_time
          )
        `)
        .eq("user_id", targetUserId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      const response = NextResponse.json({ history: data });
      trackAPIRequest("/api/skill", "POST", 200, Date.now() - startTime);
      return response;
    }

    const response = NextResponse.json({ error: "Invalid action" }, { status: 400 });
    trackAPIRequest("/api/skill", "POST", 400, Date.now() - startTime);
    return response;
  } catch (error) {
    console.error("Error in skill API:", error);
    const response = NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
    trackAPIRequest("/api/skill", "POST", 500, Date.now() - startTime);
    return response;
  }
}
