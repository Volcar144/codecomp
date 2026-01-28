import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { trackAPIRequest } from "@/lib/api-monitoring";

// POST /api/duels/challenge - Send a direct challenge to a user
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      trackAPIRequest("/api/duels/challenge", "POST", 401, Date.now() - startTime);
      return response;
    }

    const body = await request.json();
    const { username, language, difficulty, message } = body;

    if (!username || !language) {
      const response = NextResponse.json(
        { error: "Username and language are required" },
        { status: 400 }
      );
      trackAPIRequest("/api/duels/challenge", "POST", 400, Date.now() - startTime);
      return response;
    }

    // Can't challenge yourself
    const myUsername = session.user.name || session.user.email?.split("@")[0] || "";
    if (username.toLowerCase() === myUsername.toLowerCase()) {
      const response = NextResponse.json(
        { error: "You cannot challenge yourself" },
        { status: 400 }
      );
      trackAPIRequest("/api/duels/challenge", "POST", 400, Date.now() - startTime);
      return response;
    }

    // Find the user by username (from BetterAuth user table)
    const { data: targetUser, error: userError } = await supabase
      .from("user")
      .select("id, name, email")
      .or(`name.ilike.${username},email.ilike.${username}%`)
      .limit(1)
      .single();

    if (userError || !targetUser) {
      const response = NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
      trackAPIRequest("/api/duels/challenge", "POST", 404, Date.now() - startTime);
      return response;
    }

    // Check for existing pending challenge
    const { data: existingChallenge } = await supabase
      .from("duel_challenges_sent")
      .select("id")
      .eq("challenger_id", session.user.id)
      .eq("challenged_id", targetUser.id)
      .eq("status", "pending")
      .single();

    if (existingChallenge) {
      const response = NextResponse.json(
        { error: "You already have a pending challenge to this user" },
        { status: 400 }
      );
      trackAPIRequest("/api/duels/challenge", "POST", 400, Date.now() - startTime);
      return response;
    }

    // Create the challenge
    const { data: challenge, error: challengeError } = await supabase
      .from("duel_challenges_sent")
      .insert({
        challenger_id: session.user.id,
        challenger_username: myUsername,
        challenged_id: targetUser.id,
        challenged_username: targetUser.name || targetUser.email?.split("@")[0] || "User",
        language,
        difficulty: difficulty || "medium",
        message,
      })
      .select()
      .single();

    if (challengeError) throw challengeError;

    // Create a notification for the challenged user
    await supabase.from("notifications").insert({
      user_id: targetUser.id,
      type: "duel_challenge",
      title: "Duel Challenge!",
      message: `${myUsername} has challenged you to a ${difficulty || "medium"} coding duel in ${language}!`,
      data: { challenge_id: challenge.id },
    });

    const response = NextResponse.json({
      message: "Challenge sent!",
      challenge_id: challenge.id,
    });
    trackAPIRequest("/api/duels/challenge", "POST", 200, Date.now() - startTime);
    return response;
  } catch (error) {
    console.error("Error sending challenge:", error);
    const response = NextResponse.json(
      { error: "Failed to send challenge" },
      { status: 500 }
    );
    trackAPIRequest("/api/duels/challenge", "POST", 500, Date.now() - startTime);
    return response;
  }
}

// GET /api/duels/challenge - Get pending challenges
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      trackAPIRequest("/api/duels/challenge", "GET", 401, Date.now() - startTime);
      return response;
    }

    // Get challenges received
    const { data: received, error: receivedError } = await supabase
      .from("duel_challenges_sent")
      .select("*")
      .eq("challenged_id", session.user.id)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (receivedError) throw receivedError;

    // Get challenges sent
    const { data: sent, error: sentError } = await supabase
      .from("duel_challenges_sent")
      .select("*")
      .eq("challenger_id", session.user.id)
      .in("status", ["pending", "accepted"])
      .order("created_at", { ascending: false });

    if (sentError) throw sentError;

    const response = NextResponse.json({
      received: received || [],
      sent: sent || [],
    });
    trackAPIRequest("/api/duels/challenge", "GET", 200, Date.now() - startTime);
    return response;
  } catch (error) {
    console.error("Error fetching challenges:", error);
    const response = NextResponse.json(
      { error: "Failed to fetch challenges" },
      { status: 500 }
    );
    trackAPIRequest("/api/duels/challenge", "GET", 500, Date.now() - startTime);
    return response;
  }
}
