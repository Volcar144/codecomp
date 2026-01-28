import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { trackAPIRequest } from "@/lib/api-monitoring";
import { executeCode } from "@/lib/code-execution";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/duels/[id] - Get duel details
export async function GET(request: NextRequest, context: RouteContext) {
  const startTime = Date.now();
  const { id: duelId } = await context.params;
  
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      trackAPIRequest(`/api/duels/${duelId}`, "GET", 401, Date.now() - startTime);
      return response;
    }

    // Get duel with challenge details
    const { data: duel, error: duelError } = await supabase
      .from("duels")
      .select(`
        *,
        challenge:duel_challenges (
          id, title, description, difficulty, category,
          time_limit_seconds, test_cases, starter_code
        )
      `)
      .eq("id", duelId)
      .single();

    if (duelError || !duel) {
      const response = NextResponse.json({ error: "Duel not found" }, { status: 404 });
      trackAPIRequest(`/api/duels/${duelId}`, "GET", 404, Date.now() - startTime);
      return response;
    }

    // Verify user is a participant
    if (duel.player1_id !== session.user.id && duel.player2_id !== session.user.id) {
      const response = NextResponse.json({ error: "Not a participant" }, { status: 403 });
      trackAPIRequest(`/api/duels/${duelId}`, "GET", 403, Date.now() - startTime);
      return response;
    }

    const isPlayer1 = duel.player1_id === session.user.id;

    // Get user's submissions
    const { data: mySubmissions } = await supabase
      .from("duel_submissions")
      .select("*")
      .eq("duel_id", duelId)
      .eq("user_id", session.user.id)
      .order("submitted_at", { ascending: false });

    // Calculate time remaining
    let timeRemaining = null;
    if (duel.status === "active" && duel.started_at && duel.challenge?.time_limit_seconds) {
      const startedAt = new Date(duel.started_at).getTime();
      const timeLimit = duel.challenge.time_limit_seconds * 1000;
      const elapsed = Date.now() - startedAt;
      timeRemaining = Math.max(0, Math.floor((timeLimit - elapsed) / 1000));
    }

    // Don't expose test cases during active duel (only input visible)
    const testCases = duel.challenge?.test_cases || [];
    const visibleTestCases = duel.status === "active" 
      ? testCases.slice(0, 2).map((tc: { input: string; expected_output: string; points: number }) => ({
          input: tc.input,
          expected_output: tc.expected_output, // Show first 2 for testing
          points: tc.points,
        }))
      : testCases;

    const response = NextResponse.json({
      id: duel.id,
      status: duel.status,
      language: duel.language,
      challenge: {
        ...duel.challenge,
        test_cases: visibleTestCases,
        total_test_cases: testCases.length,
      },
      my_role: isPlayer1 ? "player1" : "player2",
      my_username: isPlayer1 ? duel.player1_username : duel.player2_username,
      my_rating: isPlayer1 ? duel.player1_rating : duel.player2_rating,
      my_score: isPlayer1 ? duel.player1_score : duel.player2_score,
      my_submitted: isPlayer1 ? !!duel.player1_submitted_at : !!duel.player2_submitted_at,
      opponent_username: isPlayer1 ? duel.player2_username : duel.player1_username,
      opponent_rating: isPlayer1 ? duel.player2_rating : duel.player1_rating,
      opponent_score: isPlayer1 ? duel.player2_score : duel.player1_score,
      opponent_submitted: isPlayer1 ? !!duel.player2_submitted_at : !!duel.player1_submitted_at,
      opponent_is_bot: duel.player2_is_bot,
      winner_id: duel.winner_id,
      did_win: duel.winner_id === session.user.id,
      my_rating_change: isPlayer1 ? duel.rating_change_p1 : duel.rating_change_p2,
      started_at: duel.started_at,
      ended_at: duel.ended_at,
      time_remaining: timeRemaining,
      submissions: mySubmissions || [],
    });
    trackAPIRequest(`/api/duels/${duelId}`, "GET", 200, Date.now() - startTime);
    return response;
  } catch (error) {
    console.error("Error fetching duel:", error);
    const response = NextResponse.json(
      { error: "Failed to fetch duel" },
      { status: 500 }
    );
    trackAPIRequest(`/api/duels/${duelId}`, "GET", 500, Date.now() - startTime);
    return response;
  }
}

// POST /api/duels/[id] - Submit code for duel
export async function POST(request: NextRequest, context: RouteContext) {
  const startTime = Date.now();
  const { id: duelId } = await context.params;
  
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      trackAPIRequest(`/api/duels/${duelId}`, "POST", 401, Date.now() - startTime);
      return response;
    }

    const body = await request.json();
    const { code, is_final } = body; // is_final = true means final submission

    if (!code) {
      const response = NextResponse.json({ error: "Code is required" }, { status: 400 });
      trackAPIRequest(`/api/duels/${duelId}`, "POST", 400, Date.now() - startTime);
      return response;
    }

    // Get duel
    const { data: duel, error: duelError } = await supabase
      .from("duels")
      .select(`
        *,
        challenge:duel_challenges (
          id, test_cases, time_limit_seconds, solution_code
        )
      `)
      .eq("id", duelId)
      .single();

    if (duelError || !duel) {
      const response = NextResponse.json({ error: "Duel not found" }, { status: 404 });
      trackAPIRequest(`/api/duels/${duelId}`, "POST", 404, Date.now() - startTime);
      return response;
    }

    // Verify user is a participant
    const isPlayer1 = duel.player1_id === session.user.id;
    const isPlayer2 = duel.player2_id === session.user.id;
    
    if (!isPlayer1 && !isPlayer2) {
      const response = NextResponse.json({ error: "Not a participant" }, { status: 403 });
      trackAPIRequest(`/api/duels/${duelId}`, "POST", 403, Date.now() - startTime);
      return response;
    }

    // Check duel is active
    if (duel.status !== "active") {
      const response = NextResponse.json(
        { error: "Duel is not active" },
        { status: 400 }
      );
      trackAPIRequest(`/api/duels/${duelId}`, "POST", 400, Date.now() - startTime);
      return response;
    }

    // Check time limit
    if (duel.started_at && duel.challenge?.time_limit_seconds) {
      const startedAt = new Date(duel.started_at).getTime();
      const timeLimit = duel.challenge.time_limit_seconds * 1000;
      const elapsed = Date.now() - startedAt;
      
      if (elapsed > timeLimit + 10000) { // 10 second grace period
        const response = NextResponse.json(
          { error: "Time limit exceeded" },
          { status: 400 }
        );
        trackAPIRequest(`/api/duels/${duelId}`, "POST", 400, Date.now() - startTime);
        return response;
      }
    }

    // Execute code against test cases
    const testCases = duel.challenge?.test_cases || [];
    let totalScore = 0;
    let testsPassed = 0;
    let executionTime = 0;
    let errorMessage = null;

    for (const testCase of testCases) {
      try {
        const result = await executeCode(code, duel.language, testCase.input);
        executionTime += result.executionTime || 0;

        if (result.error) {
          errorMessage = result.error;
          continue;
        }

        // Compare output (trim whitespace)
        const expected = testCase.expected_output.trim();
        const actual = (result.output || "").trim();

        if (actual === expected) {
          totalScore += testCase.points || 25;
          testsPassed++;
        }
      } catch {
        errorMessage = "Execution failed";
      }
    }

    // Create submission record
    const { data: submission, error: submissionError } = await supabase
      .from("duel_submissions")
      .insert({
        duel_id: duelId,
        user_id: session.user.id,
        code,
        language: duel.language,
        status: testsPassed === testCases.length ? "passed" : "failed",
        score: totalScore,
        tests_passed: testsPassed,
        tests_total: testCases.length,
        execution_time: executionTime,
        error_message: errorMessage,
      })
      .select()
      .single();

    if (submissionError) throw submissionError;

    // If final submission, update duel
    if (is_final && totalScore > 0) {
      const solveTime = Math.floor((Date.now() - new Date(duel.started_at!).getTime()) / 1000);
      
      const updateData = isPlayer1
        ? {
            player1_score: totalScore,
            player1_time: solveTime,
            player1_submitted_at: new Date().toISOString(),
          }
        : {
            player2_score: totalScore,
            player2_time: solveTime,
            player2_submitted_at: new Date().toISOString(),
          };

      await supabase.from("duels").update(updateData).eq("id", duelId);

      // Check if both have submitted or if playing against bot
      const { data: updatedDuel } = await supabase
        .from("duels")
        .select("*")
        .eq("id", duelId)
        .single();

      if (updatedDuel) {
        const bothSubmitted =
          updatedDuel.player1_submitted_at && updatedDuel.player2_submitted_at;
        const vsBot = updatedDuel.player2_is_bot;

        if (bothSubmitted || (vsBot && updatedDuel.player1_submitted_at)) {
          // If vs bot, simulate bot submission
          if (vsBot && !updatedDuel.player2_submitted_at) {
            await simulateBotSubmission(duelId, duel, totalScore, solveTime);
          }
          
          // Finalize duel
          await finalizeDuel(duelId);
        }
      }
    }

    const response = NextResponse.json({
      submission_id: submission.id,
      score: totalScore,
      tests_passed: testsPassed,
      tests_total: testCases.length,
      status: testsPassed === testCases.length ? "passed" : "partial",
      error: errorMessage,
    });
    trackAPIRequest(`/api/duels/${duelId}`, "POST", 200, Date.now() - startTime);
    return response;
  } catch (error) {
    console.error("Error submitting duel code:", error);
    const response = NextResponse.json(
      { error: "Failed to submit code" },
      { status: 500 }
    );
    trackAPIRequest(`/api/duels/${duelId}`, "POST", 500, Date.now() - startTime);
    return response;
  }
}

// Simulate bot submission based on difficulty
async function simulateBotSubmission(
  duelId: string,
  duel: { player2_rating?: number | null; challenge?: { test_cases?: Array<{ points: number }> } | null },
  playerScore: number,
  playerTime: number
) {
  const botRating = duel.player2_rating || 1200;
  const testCases = duel.challenge?.test_cases || [];
  const maxScore = testCases.reduce((sum: number, tc: { points: number }) => sum + (tc.points || 25), 0);

  // Bot performance based on rating
  // Higher rated bots solve faster and get higher scores
  const botSkill = Math.min(1, botRating / 2000);
  
  // Randomize bot performance a bit
  const performanceVariance = 0.7 + Math.random() * 0.3;
  const botScorePercent = botSkill * performanceVariance;
  const botScore = Math.floor(maxScore * botScorePercent);
  
  // Bot time is inversely related to skill
  const baseTime = 60 + Math.random() * 120; // 60-180 seconds base
  const botTime = Math.floor(baseTime / botSkill);

  await supabase.from("duels").update({
    player2_score: botScore,
    player2_time: botTime,
    player2_submitted_at: new Date().toISOString(),
  }).eq("id", duelId);
}

// Finalize duel and calculate ratings
async function finalizeDuel(duelId: string) {
  const { data: duel } = await supabase
    .from("duels")
    .select("*")
    .eq("id", duelId)
    .single();

  if (!duel) return;

  // Determine winner
  let winnerId = null;
  let isDraw = false;

  if (duel.player1_score > duel.player2_score) {
    winnerId = duel.player1_id;
  } else if (duel.player2_score > duel.player1_score) {
    winnerId = duel.player2_id;
  } else if (duel.player1_score === duel.player2_score && duel.player1_score > 0) {
    // Same score - faster time wins
    if (duel.player1_time < duel.player2_time) {
      winnerId = duel.player1_id;
    } else if (duel.player2_time < duel.player1_time) {
      winnerId = duel.player2_id;
    } else {
      isDraw = true;
    }
  }

  // Calculate ELO changes
  let ratingChangeP1 = 0;
  let ratingChangeP2 = 0;

  if (!duel.player2_is_bot) {
    // Only update ratings for human vs human duels
    const { data: eloChanges } = await supabase.rpc("calculate_duel_elo", {
      p_winner_rating: winnerId === duel.player1_id ? duel.player1_rating : duel.player2_rating,
      p_loser_rating: winnerId === duel.player1_id ? duel.player2_rating : duel.player1_rating,
      p_is_draw: isDraw,
    });

    if (eloChanges && eloChanges.length > 0) {
      if (winnerId === duel.player1_id) {
        ratingChangeP1 = eloChanges[0].winner_change;
        ratingChangeP2 = eloChanges[0].loser_change;
      } else if (winnerId === duel.player2_id) {
        ratingChangeP1 = eloChanges[0].loser_change;
        ratingChangeP2 = eloChanges[0].winner_change;
      } else {
        // Draw
        ratingChangeP1 = eloChanges[0].winner_change;
        ratingChangeP2 = eloChanges[0].loser_change;
      }

      // Update player ratings
      await updatePlayerRating(duel.player1_id, ratingChangeP1);
      await updatePlayerRating(duel.player2_id, ratingChangeP2);
    }
  } else {
    // Bot duels: smaller rating changes
    if (winnerId === duel.player1_id) {
      ratingChangeP1 = 10; // Small gain for beating bot
    } else if (winnerId === duel.player2_id) {
      ratingChangeP1 = -5; // Small loss for losing to bot
    }
    
    if (ratingChangeP1 !== 0) {
      await updatePlayerRating(duel.player1_id, ratingChangeP1);
    }
  }

  // Update duel status
  await supabase.from("duels").update({
    status: "completed",
    winner_id: winnerId,
    rating_change_p1: ratingChangeP1,
    rating_change_p2: ratingChangeP2,
    ended_at: new Date().toISOString(),
  }).eq("id", duelId);
}

async function updatePlayerRating(userId: string, change: number) {
  // Get current rating or create new record
  const { data: current } = await supabase
    .from("user_skill_ratings")
    .select("skill_rating, peak_rating, win_count, current_streak")
    .eq("user_id", userId)
    .single();

  const currentRating = current?.skill_rating || 1000;
  const newRating = Math.max(100, currentRating + change);
  const newPeak = Math.max(current?.peak_rating || 1000, newRating);
  const newStreak = change > 0 ? (current?.current_streak || 0) + 1 : 0;
  const winIncrement = change > 0 ? 1 : 0;

  // Determine tier
  let tier = "bronze";
  if (newRating >= 2400) tier = "grandmaster";
  else if (newRating >= 2200) tier = "master";
  else if (newRating >= 2000) tier = "diamond";
  else if (newRating >= 1800) tier = "platinum";
  else if (newRating >= 1600) tier = "gold";
  else if (newRating >= 1400) tier = "silver";

  await supabase
    .from("user_skill_ratings")
    .upsert({
      user_id: userId,
      skill_rating: newRating,
      peak_rating: newPeak,
      skill_tier: tier,
      win_count: (current?.win_count || 0) + winIncrement,
      current_streak: newStreak,
      last_competition_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
}
