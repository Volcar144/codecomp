import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: competitionId } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "csv";

    // Get authenticated session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is the competition creator
    const { data: competition, error: compError } = await supabase
      .from("competitions")
      .select("id, creator_id, title")
      .eq("id", competitionId)
      .single();

    if (compError || !competition) {
      return NextResponse.json({ error: "Competition not found" }, { status: 404 });
    }

    if (competition.creator_id !== session.user.id) {
      return NextResponse.json({ error: "Only competition creators can export results" }, { status: 403 });
    }

    // Fetch leaderboard data
    const { data: leaderboard, error: leaderboardError } = await supabase
      .from("leaderboard")
      .select("*")
      .eq("competition_id", competitionId)
      .order("rank", { ascending: true });

    if (leaderboardError) {
      return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
    }

    // Get user info for leaderboard entries
    const userIds = leaderboard?.map(l => l.user_id) || [];
    const { data: users } = await supabase
      .from("user")
      .select("id, name, email")
      .in("id", userIds);

    const userMap = new Map(users?.map(u => [u.id, u]) || []);

    // Build export data
    const exportData = leaderboard?.map(entry => ({
      rank: entry.rank,
      name: userMap.get(entry.user_id)?.name || "Unknown",
      email: userMap.get(entry.user_id)?.email || "Unknown",
      best_score: entry.best_score,
      best_time_ms: entry.best_time,
      total_submissions: entry.total_submissions,
      last_submission: entry.last_submission,
    })) || [];

    if (format === "json") {
      return NextResponse.json({
        competition: {
          id: competition.id,
          title: competition.title,
        },
        exported_at: new Date().toISOString(),
        results: exportData,
      });
    }

    // CSV format
    const csvHeaders = ["Rank", "Name", "Email", "Best Score", "Best Time (ms)", "Total Submissions", "Last Submission"];
    const csvRows = exportData.map(row => [
      row.rank,
      `"${row.name.replace(/"/g, '""')}"`,
      `"${row.email.replace(/"/g, '""')}"`,
      row.best_score,
      row.best_time_ms || "",
      row.total_submissions,
      row.last_submission,
    ].join(","));

    const csv = [csvHeaders.join(","), ...csvRows].join("\n");

    const filename = `${competition.title.replace(/[^a-zA-Z0-9]/g, "_")}_results_${new Date().toISOString().split("T")[0]}.csv`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Failed to export results" }, { status: 500 });
  }
}
