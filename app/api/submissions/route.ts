import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getPostHogClient } from "@/lib/posthog-server";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = rateLimit(request, RATE_LIMITS.submissions);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    // Get authenticated session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized. Please sign in to submit." }, { status: 401 });
    }

    const body = await request.json();
    const { code, language, competition_id } = body;

    if (!code || !language || !competition_id) {
      return NextResponse.json(
        { error: "Code, language, and competition_id are required" },
        { status: 400 }
      );
    }

    // Verify competition exists and is active
    const { data: competition, error: compError } = await supabase
      .from("competitions")
      .select("id, status, start_date, end_date, allowed_languages, is_public, invite_code, creator_id")
      .eq("id", competition_id)
      .single();

    if (compError || !competition) {
      return NextResponse.json({ error: "Competition not found" }, { status: 404 });
    }

    // Check access for private competitions
    if (!competition.is_public && competition.creator_id !== session.user.id) {
      const { invite_code } = body;
      if (!invite_code || invite_code !== competition.invite_code) {
        return NextResponse.json({ error: "This is a private competition. Please provide a valid invite code." }, { status: 403 });
      }
    }

    const now = new Date();
    const startDate = new Date(competition.start_date);
    const endDate = new Date(competition.end_date);

    if (now < startDate) {
      return NextResponse.json({ error: "Competition has not started yet" }, { status: 400 });
    }

    if (now > endDate) {
      return NextResponse.json({ error: "Competition has ended" }, { status: 400 });
    }

    if (!competition.allowed_languages.includes(language)) {
      return NextResponse.json({ error: `Language '${language}' is not allowed for this competition` }, { status: 400 });
    }

    // Execute code to get score
    const executeResponse = await fetch(`${request.nextUrl.origin}/api/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, language, competition_id }),
    });

    const executeData = await executeResponse.json();
    const score = executeData.score || 0;
    const status = executeData.passedTests === executeData.totalTests ? "passed" : "failed";

    // Save submission to database
    const { data, error } = await supabase
      .from("submissions")
      .insert({
        competition_id,
        user_id: session.user.id,
        code,
        language,
        status,
        score,
      })
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json({ error: "Failed to save submission" }, { status: 500 });
    }

    // Capture server-side submission event
    const posthog = getPostHogClient();
    posthog.capture({
      distinctId: session.user.email || session.user.id,
      event: "submission_created",
      properties: {
        competition_id: competition_id,
        language: language,
        score: score,
        status: status,
        passed_tests: executeData.passedTests || 0,
        total_tests: executeData.totalTests || 0,
      },
    });

    return NextResponse.json({
      ...data,
      testResults: executeData.results,
    }, { status: 201 });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get authenticated session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const url = new URL(request.url);
    const competition_id = url.searchParams.get("competition_id");
    const user_id = url.searchParams.get("user_id");

    let query = supabase.from("submissions").select("*");

    if (competition_id) {
      query = query.eq("competition_id", competition_id);
    }

    // If user requests their own submissions, or if no user_id filter, only show own submissions
    if (session?.user?.id) {
      if (!user_id || user_id === session.user.id) {
        query = query.eq("user_id", session.user.id);
      } else {
        // Non-admin users can only see their own submissions
        return NextResponse.json({ error: "Unauthorized to view other users' submissions" }, { status: 403 });
      }
    } else {
      // No session - require authentication
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    const { data, error } = await query.order("submitted_at", { ascending: false });

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json({ error: "Failed to fetch submissions" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
