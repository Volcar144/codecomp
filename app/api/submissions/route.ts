import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, language, competition_id } = body;

    if (!code || !language || !competition_id) {
      return NextResponse.json(
        { error: "Code, language, and competition_id are required" },
        { status: 400 }
      );
    }

    // In production, get user ID from session
    const user_id = "user-123"; // Mock user ID

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
        user_id,
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
    const url = new URL(request.url);
    const competition_id = url.searchParams.get("competition_id");
    const user_id = url.searchParams.get("user_id");

    let query = supabase.from("submissions").select("*");

    if (competition_id) {
      query = query.eq("competition_id", competition_id);
    }

    if (user_id) {
      query = query.eq("user_id", user_id);
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
