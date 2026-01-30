import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { executeCode } from "@/lib/code-execution";

// GET /api/practice - Get practice sessions or available challenges
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const challengeType = searchParams.get("type");
    const challengeId = searchParams.get("challengeId");

    // Get available practice challenges
    if (action === "challenges") {
      const challenges = [];

      // Get daily challenges
      const { data: dailyChallenges } = await supabase
        .from("daily_challenges")
        .select("id, title, difficulty, description")
        .order("created_at", { ascending: false })
        .limit(20);

      if (dailyChallenges) {
        challenges.push(
          ...dailyChallenges.map((c) => ({
            ...c,
            type: "daily",
            name: c.title,
          }))
        );
      }

      // Get tutorial challenges
      const { data: tutorials } = await supabase
        .from("tutorials")
        .select("id, title, difficulty, description")
        .order("order_index", { ascending: true });

      if (tutorials) {
        challenges.push(
          ...tutorials.map((t) => ({
            ...t,
            type: "tutorial",
            name: t.title,
          }))
        );
      }

      return NextResponse.json({ challenges });
    }

    // Get user's practice sessions
    if (session?.user) {
      let query = supabase
        .from("practice_sessions")
        .select("*")
        .eq("user_id", session.user.id)
        .order("updated_at", { ascending: false });

      if (challengeType) {
        query = query.eq("challenge_type", challengeType);
      }
      if (challengeId) {
        query = query.eq("challenge_id", challengeId);
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;

      return NextResponse.json({ sessions: data || [] });
    }

    return NextResponse.json({ sessions: [] });
  } catch (error) {
    console.error("Error fetching practice:", error);
    return NextResponse.json(
      { error: "Failed to fetch practice data" },
      { status: 500 }
    );
  }
}

// POST /api/practice - Create or update practice session, run code
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const body = await request.json();
    const { action, challengeType, challengeId, code, language } = body;

    // Start a new practice session
    if (action === "start") {
      if (!challengeType || !challengeId) {
        return NextResponse.json(
          { error: "Challenge type and ID required" },
          { status: 400 }
        );
      }

      // Get challenge details
      let challenge = null;
      let testCases: any[] = [];

      if (challengeType === "daily") {
        const { data } = await supabase
          .from("daily_challenges")
          .select("*")
          .eq("id", challengeId)
          .single();
        challenge = data;

        // Get test cases
        const { data: cases } = await supabase
          .from("daily_challenge_test_cases")
          .select("*")
          .eq("challenge_id", challengeId)
          .eq("is_hidden", false);
        testCases = cases || [];
      } else if (challengeType === "tutorial") {
        const { data } = await supabase
          .from("tutorials")
          .select("*")
          .eq("id", challengeId)
          .single();
        challenge = data;

        // Tutorials use inline test cases from JSON
        testCases = challenge?.test_cases || [];
      }

      if (!challenge) {
        return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
      }

      // Check for existing session
      let existingSession = null;
      if (session?.user) {
        const { data } = await supabase
          .from("practice_sessions")
          .select("*")
          .eq("user_id", session.user.id)
          .eq("challenge_type", challengeType)
          .eq("challenge_id", challengeId)
          .single();
        existingSession = data;
      }

      return NextResponse.json({
        challenge,
        testCases,
        existingSession,
      });
    }

    // Run code in practice mode
    if (action === "run") {
      if (!code || !language || !challengeType || !challengeId) {
        return NextResponse.json(
          { error: "Code, language, challenge type and ID required" },
          { status: 400 }
        );
      }

      // Get test cases
      let testCases: any[] = [];

      if (challengeType === "daily") {
        const { data: cases } = await supabase
          .from("daily_challenge_test_cases")
          .select("*")
          .eq("challenge_id", challengeId);
        testCases = cases || [];
      } else if (challengeType === "tutorial") {
        const { data: tutorial } = await supabase
          .from("tutorials")
          .select("test_cases")
          .eq("id", challengeId)
          .single();
        testCases = tutorial?.test_cases || [];
      }

      // Run code against test cases
      const results = [];
      let passed = 0;

      for (const testCase of testCases) {
        const result = await executeCode(code, language, testCase.input || "");
        const expectedOutput = (testCase.expected_output || testCase.expectedOutput || "").trim();
        const actualOutput = (result.output || "").trim();
        const testPassed = actualOutput === expectedOutput;

        if (testPassed) passed++;

        results.push({
          input: testCase.input,
          expectedOutput,
          actualOutput,
          passed: testPassed,
          error: result.error,
          executionTime: result.executionTime,
          isHidden: testCase.is_hidden || false,
        });
      }

      const score = testCases.length > 0 ? Math.round((passed / testCases.length) * 100) : 0;

      // Update practice session if user is logged in
      if (session?.user) {
        const { data: existing } = await supabase
          .from("practice_sessions")
          .select("*")
          .eq("user_id", session.user.id)
          .eq("challenge_type", challengeType)
          .eq("challenge_id", challengeId)
          .single();

        if (existing) {
          await supabase
            .from("practice_sessions")
            .update({
              code,
              language,
              score,
              attempts: existing.attempts + 1,
              best_score: Math.max(existing.best_score || 0, score),
              completed: score === 100 ? true : existing.completed,
            })
            .eq("id", existing.id);
        } else {
          await supabase.from("practice_sessions").insert({
            user_id: session.user.id,
            challenge_type: challengeType,
            challenge_id: challengeId,
            code,
            language,
            score,
            attempts: 1,
            best_score: score,
            completed: score === 100,
          });
        }
      }

      return NextResponse.json({
        results: results.filter((r) => !r.isHidden).map((r) => ({
          ...r,
          isHidden: undefined,
        })),
        hiddenResults: {
          total: results.filter((r) => r.isHidden).length,
          passed: results.filter((r) => r.isHidden && r.passed).length,
        },
        score,
        passed,
        total: testCases.length,
        allPassed: score === 100,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error in practice:", error);
    return NextResponse.json(
      { error: "Failed to process practice request" },
      { status: 500 }
    );
  }
}
