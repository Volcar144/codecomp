import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { trackAPIRequest } from "@/lib/api-monitoring";

// POST /api/duels/bot - Start a duel against a bot
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      trackAPIRequest("/api/duels/bot", "POST", 401, Date.now() - startTime);
      return response;
    }

    const body = await request.json();
    const { language, difficulty } = body;

    if (!language) {
      const response = NextResponse.json({ error: "Language is required" }, { status: 400 });
      trackAPIRequest("/api/duels/bot", "POST", 400, Date.now() - startTime);
      return response;
    }

    // Remove user from queue if they're in it
    await supabase.from("duel_queue").delete().eq("user_id", session.user.id);

    // Get user's skill rating
    const { data: skillData } = await supabase
      .from("user_skill_ratings")
      .select("skill_rating")
      .eq("user_id", session.user.id)
      .single();

    const userRating = skillData?.skill_rating || 1000;
    const username = session.user.name || session.user.email?.split("@")[0] || "Anonymous";

    // Get a random challenge
    const { data: challengeId } = await supabase.rpc("get_random_duel_challenge", {
      p_difficulty: difficulty || null,
    });

    if (!challengeId) {
      const response = NextResponse.json(
        { error: "No challenges available" },
        { status: 500 }
      );
      trackAPIRequest("/api/duels/bot", "POST", 500, Date.now() - startTime);
      return response;
    }

    // Bot rating scales with difficulty
    const botRatings: Record<string, number> = {
      easy: 800,
      medium: 1200,
      hard: 1600,
      expert: 2000,
    };
    const botRating = botRatings[difficulty || "medium"] || 1200;

    // Create the duel vs bot
    const { data: duel, error: duelError } = await supabase
      .from("duels")
      .insert({
        challenge_id: challengeId,
        player1_id: session.user.id,
        player1_username: username,
        player1_rating: userRating,
        player2_id: "bot",
        player2_username: `CodeBot (${difficulty || "medium"})`,
        player2_rating: botRating,
        player2_is_bot: true,
        language,
        status: "active",
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (duelError) throw duelError;

    const response = NextResponse.json({
      status: "started",
      duel_id: duel.id,
      opponent: {
        username: `CodeBot (${difficulty || "medium"})`,
        rating: botRating,
        is_bot: true,
      },
    });
    trackAPIRequest("/api/duels/bot", "POST", 200, Date.now() - startTime);
    return response;
  } catch (error) {
    console.error("Error starting bot duel:", error);
    const response = NextResponse.json(
      { error: "Failed to start bot duel" },
      { status: 500 }
    );
    trackAPIRequest("/api/duels/bot", "POST", 500, Date.now() - startTime);
    return response;
  }
}
