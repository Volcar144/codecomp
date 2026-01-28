/**
 * Submission History API
 * GET - Get all submissions for a user in a competition
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { headers } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const competitionId = searchParams.get("competition_id");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabase
      .from("submissions")
      .select(`
        id,
        competition_id,
        code,
        language,
        status,
        score,
        execution_time,
        memory_used,
        error_message,
        submitted_at,
        competitions (
          title
        )
      `)
      .eq("user_id", session.user.id)
      .order("submitted_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (competitionId) {
      query = query.eq("competition_id", competitionId);
    }

    const { data: submissions, error } = await query;

    if (error) {
      console.error("Error fetching submission history:", error);
      return NextResponse.json(
        { error: "Failed to fetch submission history" },
        { status: 500 }
      );
    }

    // Format submissions with competition titles
    const formattedSubmissions = submissions?.map((s) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const competition = s.competitions as any;
      const title = Array.isArray(competition) 
        ? competition[0]?.title 
        : competition?.title;
      return {
        ...s,
        competition_title: title || "Unknown Competition",
        competitions: undefined, // Remove nested object
      };
    }) || [];

    return NextResponse.json(formattedSubmissions);
  } catch (error) {
    console.error("Error in GET /api/submissions/history:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
