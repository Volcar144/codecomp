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
      return NextResponse.json({ error: "Only competition creators can view analytics" }, { status: 403 });
    }

    // Fetch all analytics data in parallel
    const [
      submissionsResult,
      uniqueUsersResult,
      languageStatsResult,
      scoreDistributionResult,
      dailySubmissionsResult,
      passRateResult,
    ] = await Promise.all([
      // Total submissions count
      supabase
        .from("submissions")
        .select("id", { count: "exact", head: true })
        .eq("competition_id", competitionId),

      // Unique participants count
      supabase
        .from("submissions")
        .select("user_id")
        .eq("competition_id", competitionId),

      // Language breakdown
      supabase
        .from("submissions")
        .select("language")
        .eq("competition_id", competitionId),

      // Score distribution
      supabase
        .from("submissions")
        .select("score, status")
        .eq("competition_id", competitionId)
        .eq("status", "passed"),

      // Daily submissions (last 30 days)
      supabase
        .from("submissions")
        .select("submitted_at")
        .eq("competition_id", competitionId)
        .gte("submitted_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),

      // Pass rate
      supabase
        .from("submissions")
        .select("status")
        .eq("competition_id", competitionId),
    ]);

    // Process language stats
    const languageCounts: Record<string, number> = {};
    if (languageStatsResult.data) {
      for (const sub of languageStatsResult.data) {
        languageCounts[sub.language] = (languageCounts[sub.language] || 0) + 1;
      }
    }
    const languageStats = Object.entries(languageCounts)
      .map(([language, count]) => ({ language, count }))
      .sort((a, b) => b.count - a.count);

    // Process unique users
    const uniqueUsers = new Set(uniqueUsersResult.data?.map(s => s.user_id) || []);

    // Process score distribution (buckets: 0-20, 21-40, 41-60, 61-80, 81-100)
    const scoreBuckets = [0, 0, 0, 0, 0];
    if (scoreDistributionResult.data) {
      for (const sub of scoreDistributionResult.data) {
        const score = sub.score || 0;
        if (score <= 20) scoreBuckets[0]++;
        else if (score <= 40) scoreBuckets[1]++;
        else if (score <= 60) scoreBuckets[2]++;
        else if (score <= 80) scoreBuckets[3]++;
        else scoreBuckets[4]++;
      }
    }
    const scoreDistribution = [
      { range: "0-20", count: scoreBuckets[0] },
      { range: "21-40", count: scoreBuckets[1] },
      { range: "41-60", count: scoreBuckets[2] },
      { range: "61-80", count: scoreBuckets[3] },
      { range: "81-100", count: scoreBuckets[4] },
    ];

    // Process daily submissions
    const dailyCounts: Record<string, number> = {};
    if (dailySubmissionsResult.data) {
      for (const sub of dailySubmissionsResult.data) {
        const date = new Date(sub.submitted_at).toISOString().split("T")[0];
        dailyCounts[date] = (dailyCounts[date] || 0) + 1;
      }
    }
    const dailySubmissions = Object.entries(dailyCounts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Process pass rate
    let passedCount = 0;
    let failedCount = 0;
    if (passRateResult.data) {
      for (const sub of passRateResult.data) {
        if (sub.status === "passed") passedCount++;
        else if (sub.status === "failed") failedCount++;
      }
    }
    const totalAttempts = passedCount + failedCount;
    const passRate = totalAttempts > 0 ? Math.round((passedCount / totalAttempts) * 100) : 0;

    // Calculate average score
    let avgScore = 0;
    if (scoreDistributionResult.data && scoreDistributionResult.data.length > 0) {
      const totalScore = scoreDistributionResult.data.reduce((sum, s) => sum + (s.score || 0), 0);
      avgScore = Math.round(totalScore / scoreDistributionResult.data.length);
    }

    // Get top performers
    const { data: leaderboard } = await supabase
      .from("leaderboard")
      .select("user_id, best_score, best_time, total_submissions, rank")
      .eq("competition_id", competitionId)
      .order("rank", { ascending: true })
      .limit(10);

    // Get user info for top performers
    let topPerformers: { user_id: string; name: string | null; email: string; best_score: number; rank: number }[] = [];
    if (leaderboard && leaderboard.length > 0) {
      const userIds = leaderboard.map(l => l.user_id);
      const { data: users } = await supabase
        .from("user")
        .select("id, name, email")
        .in("id", userIds);

      const userMap = new Map(users?.map(u => [u.id, u]) || []);
      topPerformers = leaderboard.map(l => ({
        user_id: l.user_id,
        name: userMap.get(l.user_id)?.name || null,
        email: userMap.get(l.user_id)?.email || "Unknown",
        best_score: l.best_score,
        rank: l.rank,
      }));
    }

    return NextResponse.json({
      competition: {
        id: competition.id,
        title: competition.title,
      },
      summary: {
        totalSubmissions: submissionsResult.count || 0,
        uniqueParticipants: uniqueUsers.size,
        passRate,
        averageScore: avgScore,
      },
      languageStats,
      scoreDistribution,
      dailySubmissions,
      topPerformers,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
