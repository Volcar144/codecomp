import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { trackAPIRequest } from "@/lib/api-monitoring";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/duels/challenge/[id]/respond - Accept or decline a challenge
export async function POST(request: NextRequest, context: RouteContext) {
  const startTime = Date.now();
  const { id: challengeId } = await context.params;
  
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      trackAPIRequest("/api/duels/challenge/respond", "POST", 401, Date.now() - startTime);
      return response;
    }

    const body = await request.json();
    const { action } = body; // "accept" or "decline"

    if (!["accept", "decline"].includes(action)) {
      const response = NextResponse.json(
        { error: "Invalid action. Must be 'accept' or 'decline'" },
        { status: 400 }
      );
      trackAPIRequest("/api/duels/challenge/respond", "POST", 400, Date.now() - startTime);
      return response;
    }

    // Get the challenge
    const { data: challenge, error: challengeError } = await supabase
      .from("duel_challenges_sent")
      .select("*")
      .eq("id", challengeId)
      .single();

    if (challengeError || !challenge) {
      const response = NextResponse.json(
        { error: "Challenge not found" },
        { status: 404 }
      );
      trackAPIRequest("/api/duels/challenge/respond", "POST", 404, Date.now() - startTime);
      return response;
    }

    // Verify user is the challenged user
    if (challenge.challenged_id !== session.user.id) {
      const response = NextResponse.json(
        { error: "You can only respond to challenges sent to you" },
        { status: 403 }
      );
      trackAPIRequest("/api/duels/challenge/respond", "POST", 403, Date.now() - startTime);
      return response;
    }

    // Check if challenge is still pending
    if (challenge.status !== "pending") {
      const response = NextResponse.json(
        { error: "This challenge has already been responded to" },
        { status: 400 }
      );
      trackAPIRequest("/api/duels/challenge/respond", "POST", 400, Date.now() - startTime);
      return response;
    }

    // Check if expired
    if (new Date(challenge.expires_at) < new Date()) {
      await supabase
        .from("duel_challenges_sent")
        .update({ status: "expired" })
        .eq("id", challengeId);

      const response = NextResponse.json(
        { error: "This challenge has expired" },
        { status: 400 }
      );
      trackAPIRequest("/api/duels/challenge/respond", "POST", 400, Date.now() - startTime);
      return response;
    }

    if (action === "decline") {
      // Decline the challenge
      await supabase
        .from("duel_challenges_sent")
        .update({
          status: "declined",
          responded_at: new Date().toISOString(),
        })
        .eq("id", challengeId);

      // Notify the challenger
      await supabase.from("notifications").insert({
        user_id: challenge.challenger_id,
        type: "duel_declined",
        title: "Challenge Declined",
        message: `${challenge.challenged_username} has declined your duel challenge.`,
      });

      const response = NextResponse.json({ message: "Challenge declined" });
      trackAPIRequest("/api/duels/challenge/respond", "POST", 200, Date.now() - startTime);
      return response;
    }

    // Accept the challenge - create a duel
    // Get skill ratings for both users
    const { data: challengerSkill } = await supabase
      .from("user_skill_ratings")
      .select("skill_rating")
      .eq("user_id", challenge.challenger_id)
      .single();

    const { data: challengedSkill } = await supabase
      .from("user_skill_ratings")
      .select("skill_rating")
      .eq("user_id", challenge.challenged_id)
      .single();

    const challengerRating = challengerSkill?.skill_rating || 1000;
    const challengedRating = challengedSkill?.skill_rating || 1000;

    // Get a random challenge
    const { data: duelChallengeId } = await supabase.rpc("get_random_duel_challenge", {
      p_difficulty: challenge.difficulty,
    });

    if (!duelChallengeId) {
      const response = NextResponse.json(
        { error: "No challenges available" },
        { status: 500 }
      );
      trackAPIRequest("/api/duels/challenge/respond", "POST", 500, Date.now() - startTime);
      return response;
    }

    // Create the duel
    const { data: duel, error: duelError } = await supabase
      .from("duels")
      .insert({
        challenge_id: duelChallengeId,
        player1_id: challenge.challenger_id,
        player1_username: challenge.challenger_username,
        player1_rating: challengerRating,
        player2_id: challenge.challenged_id,
        player2_username: challenge.challenged_username,
        player2_rating: challengedRating,
        language: challenge.language,
        status: "active",
        challenge_type: "direct_challenge",
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (duelError) throw duelError;

    // Update the challenge
    await supabase
      .from("duel_challenges_sent")
      .update({
        status: "accepted",
        duel_id: duel.id,
        responded_at: new Date().toISOString(),
      })
      .eq("id", challengeId);

    // Notify the challenger
    await supabase.from("notifications").insert({
      user_id: challenge.challenger_id,
      type: "duel_accepted",
      title: "Challenge Accepted!",
      message: `${challenge.challenged_username} has accepted your duel challenge! The duel is starting now.`,
      data: { duel_id: duel.id },
    });

    const response = NextResponse.json({
      message: "Challenge accepted! Duel starting...",
      duel_id: duel.id,
    });
    trackAPIRequest("/api/duels/challenge/respond", "POST", 200, Date.now() - startTime);
    return response;
  } catch (error) {
    console.error("Error responding to challenge:", error);
    const response = NextResponse.json(
      { error: "Failed to respond to challenge" },
      { status: 500 }
    );
    trackAPIRequest("/api/duels/challenge/respond", "POST", 500, Date.now() - startTime);
    return response;
  }
}
