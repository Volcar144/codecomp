import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// GET /api/diff - Get submission comparisons or specific submission for diffing
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const { searchParams } = new URL(request.url);
    const submissionId1 = searchParams.get("submission1");
    const submissionId2 = searchParams.get("submission2");
    const competitionId = searchParams.get("competitionId");

    // Compare two specific submissions
    if (submissionId1 && submissionId2) {
      // Get both submissions
      const { data: submissions, error } = await supabase
        .from("submissions")
        .select("id, code, language, score, execution_time, user_id, competition_id, created_at")
        .in("id", [submissionId1, submissionId2]);

      if (error || !submissions || submissions.length !== 2) {
        return NextResponse.json({ error: "Submissions not found" }, { status: 404 });
      }

      // Check access - users can only compare their own submissions
      // or both must be in a completed competition
      const submission1 = submissions.find((s) => s.id === submissionId1);
      const submission2 = submissions.find((s) => s.id === submissionId2);

      if (!submission1 || !submission2) {
        return NextResponse.json({ error: "Submissions not found" }, { status: 404 });
      }

      const canAccess =
        (session?.user?.id && submission1.user_id === session.user.id && submission2.user_id === session.user.id) ||
        // Check if competition is ended (for public comparison)
        await checkCompetitionEnded(submission1.competition_id);

      if (!canAccess) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }

      return NextResponse.json({
        submission1,
        submission2,
      });
    }

    // Get user's submissions for a competition (for self-comparison)
    if (competitionId && session?.user) {
      const { data: submissions, error } = await supabase
        .from("submissions")
        .select("id, code, language, score, execution_time, created_at, status")
        .eq("competition_id", competitionId)
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      return NextResponse.json({ submissions: submissions || [] });
    }

    // Get saved comparisons for a user
    if (session?.user) {
      const { data: comparisons, error } = await supabase
        .from("submission_comparisons")
        .select(`
          *,
          submission1:submissions!submission_comparisons_submission_id_1_fkey(id, code, language, score),
          submission2:submissions!submission_comparisons_submission_id_2_fkey(id, code, language, score)
        `)
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      return NextResponse.json({ comparisons: comparisons || [] });
    }

    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  } catch (error) {
    console.error("Error in diff API:", error);
    return NextResponse.json(
      { error: "Failed to fetch diff data" },
      { status: 500 }
    );
  }
}

// POST /api/diff - Save a comparison
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { submissionId1, submissionId2, title, notes } = body;

    if (!submissionId1 || !submissionId2) {
      return NextResponse.json(
        { error: "Two submission IDs required" },
        { status: 400 }
      );
    }

    // Verify both submissions exist and user can access
    const { data: submissions, error: fetchError } = await supabase
      .from("submissions")
      .select("id, user_id, competition_id")
      .in("id", [submissionId1, submissionId2]);

    if (fetchError || !submissions || submissions.length !== 2) {
      return NextResponse.json({ error: "Submissions not found" }, { status: 404 });
    }

    // Both must belong to user or competition must be ended
    const canAccess = submissions.every(
      (s) =>
        s.user_id === session.user!.id ||
        checkCompetitionEnded(s.competition_id)
    );

    if (!canAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("submission_comparisons")
      .insert({
        user_id: session.user.id,
        submission_id_1: submissionId1,
        submission_id_2: submissionId2,
        title: title || "Comparison",
        notes: notes || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error saving comparison:", error);
    return NextResponse.json(
      { error: "Failed to save comparison" },
      { status: 500 }
    );
  }
}

// DELETE /api/diff - Delete a saved comparison
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Comparison ID required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("submission_comparisons")
      .delete()
      .eq("id", id)
      .eq("user_id", session.user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting comparison:", error);
    return NextResponse.json(
      { error: "Failed to delete comparison" },
      { status: 500 }
    );
  }
}

async function checkCompetitionEnded(competitionId: string): Promise<boolean> {
  const { data: competition } = await supabase
    .from("competitions")
    .select("end_time")
    .eq("id", competitionId)
    .single();

  if (!competition?.end_time) return false;
  return new Date(competition.end_time) < new Date();
}
