import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { trackAPIRequest } from "@/lib/api-monitoring";

// GET /api/duels - Get user's duels
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      trackAPIRequest("/api/duels", "GET", 401, Date.now() - startTime);
      return response;
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status"); // active, completed, all
    const limit = parseInt(searchParams.get("limit") || "20");

    let query = supabase
      .from("duels")
      .select(`
        *,
        challenge:duel_challenges (
          id, title, description, difficulty, time_limit_seconds
        )
      `)
      .or(`player1_id.eq.${session.user.id},player2_id.eq.${session.user.id}`)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data: duels, error } = await query;

    if (error) throw error;

    // Add user perspective info
    const duelsWithPerspective = (duels || []).map((duel) => {
      const isPlayer1 = duel.player1_id === session.user.id;
      return {
        ...duel,
        my_role: isPlayer1 ? "player1" : "player2",
        my_score: isPlayer1 ? duel.player1_score : duel.player2_score,
        opponent_score: isPlayer1 ? duel.player2_score : duel.player1_score,
        opponent_username: isPlayer1 ? duel.player2_username : duel.player1_username,
        opponent_rating: isPlayer1 ? duel.player2_rating : duel.player1_rating,
        did_win: duel.winner_id === session.user.id,
        my_rating_change: isPlayer1 ? duel.rating_change_p1 : duel.rating_change_p2,
      };
    });

    const response = NextResponse.json({ duels: duelsWithPerspective });
    trackAPIRequest("/api/duels", "GET", 200, Date.now() - startTime);
    return response;
  } catch (error) {
    console.error("Error fetching duels:", error);
    const response = NextResponse.json(
      { error: "Failed to fetch duels" },
      { status: 500 }
    );
    trackAPIRequest("/api/duels", "GET", 500, Date.now() - startTime);
    return response;
  }
}
