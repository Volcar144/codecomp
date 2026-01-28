import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { trackAPIRequest } from "@/lib/api-monitoring";

// POST /api/duels/queue - Join matchmaking queue
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      trackAPIRequest("/api/duels/queue", "POST", 401, Date.now() - startTime);
      return response;
    }

    const body = await request.json();
    const { language, difficulty } = body;

    if (!language) {
      const response = NextResponse.json({ error: "Language is required" }, { status: 400 });
      trackAPIRequest("/api/duels/queue", "POST", 400, Date.now() - startTime);
      return response;
    }

    // Get user's skill rating
    const { data: skillData } = await supabase
      .from("user_skill_ratings")
      .select("skill_rating")
      .eq("user_id", session.user.id)
      .single();

    const userRating = skillData?.skill_rating || 1000;
    const username = session.user.name || session.user.email?.split("@")[0] || "Anonymous";

    // Check if user is already in queue
    const { data: existingEntry } = await supabase
      .from("duel_queue")
      .select("id")
      .eq("user_id", session.user.id)
      .single();

    if (existingEntry) {
      // Update existing entry
      await supabase
        .from("duel_queue")
        .update({
          selected_language: language,
          difficulty_preference: difficulty || null,
          skill_rating: userRating,
          queued_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 2 * 60 * 1000).toISOString(), // 2 minutes
        })
        .eq("user_id", session.user.id);
    } else {
      // Join queue
      const { error: queueError } = await supabase.from("duel_queue").insert({
        user_id: session.user.id,
        username,
        skill_rating: userRating,
        selected_language: language,
        difficulty_preference: difficulty || null,
        expires_at: new Date(Date.now() + 2 * 60 * 1000).toISOString(), // 2 minutes
      });

      if (queueError) throw queueError;
    }

    // Try to find a match
    const { data: match } = await supabase.rpc("find_duel_match", {
      p_user_id: session.user.id,
      p_language: language,
      p_rating: userRating,
      p_rating_range: 300, // Start with 300 rating range
    });

    if (match && match.length > 0) {
      const opponent = match[0];

      // Remove both from queue
      await supabase
        .from("duel_queue")
        .delete()
        .in("user_id", [session.user.id, opponent.matched_user_id]);

      // Get a random challenge
      const { data: challengeId } = await supabase.rpc("get_random_duel_challenge", {
        p_difficulty: difficulty || null,
      });

      if (!challengeId) {
        const response = NextResponse.json(
          { error: "No challenges available" },
          { status: 500 }
        );
        trackAPIRequest("/api/duels/queue", "POST", 500, Date.now() - startTime);
        return response;
      }

      // Create the duel
      const { data: duel, error: duelError } = await supabase
        .from("duels")
        .insert({
          challenge_id: challengeId,
          player1_id: session.user.id,
          player1_username: username,
          player1_rating: userRating,
          player2_id: opponent.matched_user_id,
          player2_username: opponent.matched_username,
          player2_rating: opponent.matched_rating,
          language,
          status: "active",
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (duelError) throw duelError;

      const response = NextResponse.json({
        status: "matched",
        duel_id: duel.id,
        opponent: {
          username: opponent.matched_username,
          rating: opponent.matched_rating,
        },
      });
      trackAPIRequest("/api/duels/queue", "POST", 200, Date.now() - startTime);
      return response;
    }

    // No match found, user is now in queue
    const response = NextResponse.json({
      status: "queued",
      message: "Looking for opponent...",
      position: 1, // Could calculate actual position
      expires_in: 120, // seconds
    });
    trackAPIRequest("/api/duels/queue", "POST", 200, Date.now() - startTime);
    return response;
  } catch (error) {
    console.error("Error in queue API:", error);
    const response = NextResponse.json(
      { error: "Failed to join queue" },
      { status: 500 }
    );
    trackAPIRequest("/api/duels/queue", "POST", 500, Date.now() - startTime);
    return response;
  }
}

// GET /api/duels/queue - Check queue status
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      trackAPIRequest("/api/duels/queue", "GET", 401, Date.now() - startTime);
      return response;
    }

    // Check if user is in queue
    const { data: queueEntry } = await supabase
      .from("duel_queue")
      .select("*")
      .eq("user_id", session.user.id)
      .single();

    if (!queueEntry) {
      const response = NextResponse.json({ status: "not_in_queue" });
      trackAPIRequest("/api/duels/queue", "GET", 200, Date.now() - startTime);
      return response;
    }

    // Check if queue entry expired
    if (new Date(queueEntry.expires_at) < new Date()) {
      // Remove expired entry
      await supabase.from("duel_queue").delete().eq("user_id", session.user.id);
      
      const response = NextResponse.json({
        status: "expired",
        message: "Queue entry expired. Would you like to try again or play against a bot?",
      });
      trackAPIRequest("/api/duels/queue", "GET", 200, Date.now() - startTime);
      return response;
    }

    // Try to find a match again
    const { data: match } = await supabase.rpc("find_duel_match", {
      p_user_id: session.user.id,
      p_language: queueEntry.selected_language,
      p_rating: queueEntry.skill_rating,
      p_rating_range: 400, // Widen range over time
    });

    if (match && match.length > 0) {
      const opponent = match[0];
      const username = session.user.name || session.user.email?.split("@")[0] || "Anonymous";

      // Remove both from queue
      await supabase
        .from("duel_queue")
        .delete()
        .in("user_id", [session.user.id, opponent.matched_user_id]);

      // Get a random challenge
      const { data: challengeId } = await supabase.rpc("get_random_duel_challenge", {
        p_difficulty: queueEntry.difficulty_preference,
      });

      if (!challengeId) {
        const response = NextResponse.json(
          { error: "No challenges available" },
          { status: 500 }
        );
        trackAPIRequest("/api/duels/queue", "GET", 500, Date.now() - startTime);
        return response;
      }

      // Create the duel
      const { data: duel, error: duelError } = await supabase
        .from("duels")
        .insert({
          challenge_id: challengeId,
          player1_id: session.user.id,
          player1_username: username,
          player1_rating: queueEntry.skill_rating,
          player2_id: opponent.matched_user_id,
          player2_username: opponent.matched_username,
          player2_rating: opponent.matched_rating,
          language: queueEntry.selected_language,
          status: "active",
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (duelError) throw duelError;

      const response = NextResponse.json({
        status: "matched",
        duel_id: duel.id,
        opponent: {
          username: opponent.matched_username,
          rating: opponent.matched_rating,
        },
      });
      trackAPIRequest("/api/duels/queue", "GET", 200, Date.now() - startTime);
      return response;
    }

    // Still waiting
    const expiresIn = Math.max(
      0,
      Math.floor((new Date(queueEntry.expires_at).getTime() - Date.now()) / 1000)
    );

    const response = NextResponse.json({
      status: "waiting",
      language: queueEntry.selected_language,
      expires_in: expiresIn,
      queued_at: queueEntry.queued_at,
    });
    trackAPIRequest("/api/duels/queue", "GET", 200, Date.now() - startTime);
    return response;
  } catch (error) {
    console.error("Error checking queue:", error);
    const response = NextResponse.json(
      { error: "Failed to check queue status" },
      { status: 500 }
    );
    trackAPIRequest("/api/duels/queue", "GET", 500, Date.now() - startTime);
    return response;
  }
}

// DELETE /api/duels/queue - Leave queue
export async function DELETE(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      trackAPIRequest("/api/duels/queue", "DELETE", 401, Date.now() - startTime);
      return response;
    }

    await supabase.from("duel_queue").delete().eq("user_id", session.user.id);

    const response = NextResponse.json({ message: "Left queue" });
    trackAPIRequest("/api/duels/queue", "DELETE", 200, Date.now() - startTime);
    return response;
  } catch (error) {
    console.error("Error leaving queue:", error);
    const response = NextResponse.json(
      { error: "Failed to leave queue" },
      { status: 500 }
    );
    trackAPIRequest("/api/duels/queue", "DELETE", 500, Date.now() - startTime);
    return response;
  }
}
