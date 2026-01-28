/**
 * Profile Stats API
 * GET - Fetch user statistics, submissions, and leaderboard entries
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { headers } from "next/headers";

export async function GET() {
  try {
    // Get authenticated session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch user's submissions with competition titles
    const { data: submissions, error: submissionsError } = await supabase
      .from("submissions")
      .select(`
        id,
        competition_id,
        language,
        score,
        status,
        submitted_at,
        competitions (
          title
        )
      `)
      .eq("user_id", userId)
      .order("submitted_at", { ascending: false })
      .limit(20);

    if (submissionsError) {
      console.error("Error fetching submissions:", submissionsError);
    }

    // Fetch user's leaderboard entries
    const { data: leaderboardEntries, error: leaderboardError } = await supabase
      .from("leaderboard")
      .select(`
        competition_id,
        rank,
        best_score,
        best_time,
        submission_count,
        competitions (
          title
        )
      `)
      .eq("user_id", userId)
      .order("rank", { ascending: true });

    if (leaderboardError) {
      console.error("Error fetching leaderboard entries:", leaderboardError);
    }

    // Calculate statistics
    const totalSubmissions = submissions?.length || 0;
    const uniqueCompetitions = new Set(submissions?.map(s => s.competition_id) || []);
    const totalCompetitions = uniqueCompetitions.size;
    
    const totalWins = leaderboardEntries?.filter(e => e.rank === 1).length || 0;
    
    const avgScore = submissions && submissions.length > 0
      ? submissions.reduce((sum, s) => sum + (s.score || 0), 0) / submissions.length
      : 0;
    
    const bestRank = leaderboardEntries && leaderboardEntries.length > 0
      ? Math.min(...leaderboardEntries.map(e => e.rank))
      : 0;

    // Format submissions with competition titles
    const formattedSubmissions = submissions?.map(s => {
      // Supabase returns nested relations as an object for single relations
      const competitions = s.competitions as unknown;
      const competition = competitions as { title: string } | null;
      return {
        id: s.id,
        competition_id: s.competition_id,
        competition_title: competition?.title || "Unknown Competition",
        language: s.language,
        score: s.score,
        status: s.status,
        submitted_at: s.submitted_at,
      };
    }) || [];

    // Format leaderboard entries with competition titles
    const formattedLeaderboard = leaderboardEntries?.map(e => {
      const competitions = e.competitions as unknown;
      const competition = competitions as { title: string } | null;
      return {
        competition_id: e.competition_id,
        competition_title: competition?.title || "Unknown Competition",
        rank: e.rank,
        best_score: e.best_score,
        best_time: e.best_time,
        submission_count: e.submission_count,
      };
    }) || [];

    // Fetch duel statistics
    const { data: duelStats } = await supabase
      .from("duels")
      .select("winner_id, player1_id, player2_id, status")
      .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
      .eq("status", "completed");

    const duelWins = duelStats?.filter(d => d.winner_id === userId).length || 0;
    const duelLosses = duelStats?.filter(d => d.winner_id && d.winner_id !== userId).length || 0;
    const duelDraws = duelStats?.filter(d => !d.winner_id).length || 0;

    // Fetch skill rating
    const { data: skillData } = await supabase
      .from("user_ratings")
      .select("skill_rating, skill_tier")
      .eq("user_id", userId)
      .single();

    // Fetch user streak
    const { data: streakData } = await supabase
      .from("user_streaks")
      .select("*")
      .eq("user_id", userId)
      .single();

    // Fetch user achievements with all achievement details
    const { data: achievements } = await supabase
      .from("achievements")
      .select(`
        id,
        slug,
        name,
        description,
        category,
        icon,
        rarity,
        xp_reward,
        requirement_type,
        requirement_value,
        user_achievements!left (
          progress,
          unlocked,
          unlocked_at
        )
      `)
      .eq("is_active", true)
      .order("category")
      .order("requirement_value");

    const formattedAchievements = achievements?.map(a => {
      const ua = (a.user_achievements as unknown as Array<{progress: number; unlocked: boolean; unlocked_at: string | null}>)?.[0];
      return {
        id: a.id,
        slug: a.slug,
        name: a.name,
        description: a.description,
        category: a.category,
        icon: a.icon,
        rarity: a.rarity,
        xp_reward: a.xp_reward,
        requirement_value: a.requirement_value || 0,
        progress: ua?.progress || 0,
        unlocked: ua?.unlocked || false,
        unlocked_at: ua?.unlocked_at || null,
      };
    }) || [];

    // Fetch organizations
    const { data: orgMembers } = await supabase
      .from("organization_members")
      .select(`
        role,
        organizations (
          id,
          name,
          slug,
          type
        )
      `)
      .eq("user_id", userId);

    const organizations = orgMembers?.map(om => {
      const org = om.organizations as unknown as { id: string; name: string; slug: string; type: string };
      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        type: org.type,
        role: om.role,
      };
    }) || [];

    return NextResponse.json({
      totalSubmissions,
      totalCompetitions,
      totalWins,
      averageScore: avgScore,
      bestRank,
      submissions: formattedSubmissions,
      leaderboardEntries: formattedLeaderboard,
      duelStats: {
        total_duels: (duelStats?.length || 0),
        wins: duelWins,
        losses: duelLosses,
        draws: duelDraws,
        win_streak: 0, // Would need to calculate from ordered history
        best_win_streak: 0,
      },
      skillInfo: {
        skill_rating: skillData?.skill_rating || 1000,
        skill_tier: skillData?.skill_tier || "Bronze",
        total_competitions: totalCompetitions,
        total_wins: totalWins,
        rating_change_30d: 0, // Would need historical data
      },
      achievements: formattedAchievements,
      streakInfo: {
        current_streak: streakData?.current_streak || 0,
        longest_streak: streakData?.longest_streak || 0,
        total_daily_completed: streakData?.total_daily_completed || 0,
        total_xp_earned: streakData?.total_xp_earned || 0,
        last_completed_date: streakData?.last_completed_date || null,
      },
      organizations,
    });
  } catch (error) {
    console.error("Error in GET /api/profile/stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
