/**
 * Daily Challenge API
 * GET - Get today's daily challenge
 * POST - Submit solution to daily challenge
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { headers } from "next/headers";
import { executeCode } from "@/lib/code-execution";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const userId = session?.user?.id;
    const today = new Date().toISOString().split('T')[0];

    // Get today's challenge
    const { data: challenge, error } = await supabase
      .from("daily_challenges")
      .select("*")
      .eq("challenge_date", today)
      .single();

    if (error || !challenge) {
      // Try to get the most recent challenge if today's not available
      const { data: recentChallenge } = await supabase
        .from("daily_challenges")
        .select("*")
        .lte("challenge_date", today)
        .order("challenge_date", { ascending: false })
        .limit(1)
        .single();

      if (!recentChallenge) {
        return NextResponse.json(
          { error: "No daily challenge available" },
          { status: 404 }
        );
      }

      // Check if user already completed it
      let userSubmission = null;
      if (userId) {
        const { data: submission } = await supabase
          .from("daily_submissions")
          .select("*")
          .eq("daily_challenge_id", recentChallenge.id)
          .eq("user_id", userId)
          .single();
        userSubmission = submission;
      }

      return NextResponse.json({
        challenge: recentChallenge,
        userSubmission,
        isToday: recentChallenge.challenge_date === today,
      });
    }

    // Check if user already completed today's challenge
    let userSubmission = null;
    let streakInfo = null;
    
    if (userId) {
      const { data: submission } = await supabase
        .from("daily_submissions")
        .select("*")
        .eq("daily_challenge_id", challenge.id)
        .eq("user_id", userId)
        .single();
      userSubmission = submission;

      // Get user's streak
      const { data: streak } = await supabase
        .from("user_streaks")
        .select("*")
        .eq("user_id", userId)
        .single();
      streakInfo = streak;
    }

    // Get global stats for today
    const { count: totalSolvers } = await supabase
      .from("daily_submissions")
      .select("*", { count: "exact", head: true })
      .eq("daily_challenge_id", challenge.id)
      .eq("passed", true);

    return NextResponse.json({
      challenge,
      userSubmission,
      streakInfo,
      stats: {
        totalSolvers: totalSolvers || 0,
      },
      isToday: true,
    });
  } catch (error) {
    console.error("Error in GET /api/daily:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { code, language, challengeId } = await request.json();

    if (!code || !language || !challengeId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get the challenge
    const { data: challenge, error: challengeError } = await supabase
      .from("daily_challenges")
      .select("*")
      .eq("id", challengeId)
      .single();

    if (challengeError || !challenge) {
      return NextResponse.json(
        { error: "Challenge not found" },
        { status: 404 }
      );
    }

    // Check if user already submitted
    const { data: existingSubmission } = await supabase
      .from("daily_submissions")
      .select("*")
      .eq("daily_challenge_id", challengeId)
      .eq("user_id", userId)
      .single();

    if (existingSubmission) {
      return NextResponse.json(
        { error: "You have already submitted a solution for this challenge" },
        { status: 400 }
      );
    }

    // Run the code against test cases
    const testCases = challenge.test_cases as Array<{
      input: string;
      expected_output: string;
      points: number;
    }>;

    let totalScore = 0;
    let passedAll = true;
    const results: Array<{
      input: string;
      expected: string;
      actual: string;
      passed: boolean;
      points: number;
    }> = [];
    let totalExecutionTime = 0;

    for (const testCase of testCases) {
      try {
        const result = await executeCode(code, language, testCase.input);
        const actual = result.output?.trim() || "";
        const expected = testCase.expected_output.trim();
        const passed = actual === expected;

        if (passed) {
          totalScore += testCase.points;
        } else {
          passedAll = false;
        }

        totalExecutionTime += result.executionTime || 0;

        results.push({
          input: testCase.input,
          expected,
          actual,
          passed,
          points: passed ? testCase.points : 0,
        });
      } catch (err) {
        passedAll = false;
        results.push({
          input: testCase.input,
          expected: testCase.expected_output,
          actual: err instanceof Error ? err.message : "Execution error",
          passed: false,
          points: 0,
        });
      }
    }

    // Save submission
    const { data: submission, error: submissionError } = await supabase
      .from("daily_submissions")
      .insert({
        daily_challenge_id: challengeId,
        user_id: userId,
        code,
        language,
        score: totalScore,
        passed: passedAll,
        execution_time: totalExecutionTime,
      })
      .select()
      .single();

    if (submissionError) {
      console.error("Error saving submission:", submissionError);
      return NextResponse.json(
        { error: "Failed to save submission" },
        { status: 500 }
      );
    }

    // Update streak if passed
    let streakResult = null;
    if (passedAll) {
      const { data: streakData } = await supabase.rpc("update_user_streak", {
        p_user_id: userId,
        p_xp_earned: challenge.xp_reward || 100,
      });
      streakResult = streakData?.[0];

      // Check for streak achievements
      if (streakResult) {
        await supabase.rpc("check_achievements", {
          p_user_id: userId,
          p_category: "streak",
          p_metric_type: "streak",
          p_metric_value: streakResult.new_streak,
        });

        // Check daily count achievements
        const { data: streakInfo } = await supabase
          .from("user_streaks")
          .select("total_daily_completed")
          .eq("user_id", userId)
          .single();

        if (streakInfo) {
          await supabase.rpc("check_achievements", {
            p_user_id: userId,
            p_category: "streak",
            p_metric_type: "count",
            p_metric_value: streakInfo.total_daily_completed,
          });
        }
      }
    }

    return NextResponse.json({
      submission,
      results,
      totalScore,
      passed: passedAll,
      streak: streakResult,
      xpEarned: passedAll ? Math.round((challenge.xp_reward || 100) * (streakResult?.streak_bonus || 1)) : 0,
    });
  } catch (error) {
    console.error("Error in POST /api/daily:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
