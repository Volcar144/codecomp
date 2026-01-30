import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { headers } from "next/headers";

// GET /api/leaderboard/global - Get global leaderboards
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "skill"; // 'skill', 'weekly', 'streaks', 'xp'
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 500);
    const offset = parseInt(searchParams.get("offset") || "0");

    let leaderboard: any[] = [];
    let userRank: number | null = null;
    let userData: any = null;

    switch (type) {
      case "skill": {
        // Skill rating leaderboard
        const { data, error } = await supabase
          .from("user_ratings")
          .select(`
            user_id,
            skill_rating,
            skill_tier,
            total_competitions,
            total_wins
          `)
          .order("skill_rating", { ascending: false })
          .range(offset, offset + limit - 1);

        if (error) {
          console.error("Error fetching skill leaderboard:", error);
          return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
        }

        // Get user details
        const userIds = data?.map((r) => r.user_id) || [];
        const { data: users } = await supabase
          .from("user")
          .select("id, name, image")
          .in("id", userIds.length > 0 ? userIds : ["none"]);

        leaderboard = data?.map((r, i) => {
          const user = users?.find((u) => u.id === r.user_id);
          return {
            rank: offset + i + 1,
            userId: r.user_id,
            username: user?.name || "Anonymous",
            image: user?.image,
            skillRating: r.skill_rating,
            skillTier: r.skill_tier,
            competitions: r.total_competitions,
            wins: r.total_wins,
          };
        }) || [];

        // Find current user's rank
        if (session?.user?.id) {
          const { data: userRating } = await supabase
            .from("user_ratings")
            .select("skill_rating")
            .eq("user_id", session.user.id)
            .single();

          if (userRating) {
            const { count } = await supabase
              .from("user_ratings")
              .select("*", { count: "exact", head: true })
              .gt("skill_rating", userRating.skill_rating);

            userRank = (count || 0) + 1;
            userData = {
              skillRating: userRating.skill_rating,
              rank: userRank,
            };
          }
        }
        break;
      }

      case "weekly": {
        // Weekly competition wins
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        const { data } = await supabase
          .from("leaderboard")
          .select(`
            user_id,
            best_score,
            competition:competitions!inner(end_date)
          `)
          .eq("rank", 1)
          .gte("competition.end_date", weekAgo.toISOString());

        // Aggregate wins per user
        const winsMap = new Map<string, { wins: number; totalScore: number }>();
        data?.forEach((entry) => {
          const current = winsMap.get(entry.user_id) || { wins: 0, totalScore: 0 };
          winsMap.set(entry.user_id, {
            wins: current.wins + 1,
            totalScore: current.totalScore + entry.best_score,
          });
        });

        // Convert to array and sort
        const sortedEntries = Array.from(winsMap.entries())
          .map(([userId, stats]) => ({ userId, ...stats }))
          .sort((a, b) => b.wins - a.wins || b.totalScore - a.totalScore);

        // Get user details
        const userIds = sortedEntries.map((e) => e.userId);
        const { data: users } = await supabase
          .from("user")
          .select("id, name, image")
          .in("id", userIds.length > 0 ? userIds : ["none"]);

        leaderboard = sortedEntries.slice(offset, offset + limit).map((entry, i) => {
          const user = users?.find((u) => u.id === entry.userId);
          return {
            rank: offset + i + 1,
            userId: entry.userId,
            username: user?.name || "Anonymous",
            image: user?.image,
            winsThisWeek: entry.wins,
            totalScore: entry.totalScore,
          };
        });
        break;
      }

      case "streaks": {
        // Daily challenge streaks
        const { data, error } = await supabase
          .from("user_streaks")
          .select("*")
          .order("current_streak", { ascending: false })
          .range(offset, offset + limit - 1);

        if (error) {
          console.error("Error fetching streak leaderboard:", error);
          return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
        }

        const userIds = data?.map((r) => r.user_id) || [];
        const { data: users } = await supabase
          .from("user")
          .select("id, name, image")
          .in("id", userIds.length > 0 ? userIds : ["none"]);

        leaderboard = data?.map((r, i) => {
          const user = users?.find((u) => u.id === r.user_id);
          return {
            rank: offset + i + 1,
            userId: r.user_id,
            username: user?.name || "Anonymous",
            image: user?.image,
            currentStreak: r.current_streak,
            longestStreak: r.longest_streak,
            totalChallenges: r.total_daily_challenges_completed,
          };
        }) || [];

        if (session?.user?.id) {
          const { data: userStreak } = await supabase
            .from("user_streaks")
            .select("current_streak")
            .eq("user_id", session.user.id)
            .single();

          if (userStreak) {
            const { count } = await supabase
              .from("user_streaks")
              .select("*", { count: "exact", head: true })
              .gt("current_streak", userStreak.current_streak);

            userRank = (count || 0) + 1;
            userData = {
              currentStreak: userStreak.current_streak,
              rank: userRank,
            };
          }
        }
        break;
      }

      case "xp": {
        // Total XP earned
        const { data, error } = await supabase
          .from("user_streaks")
          .select("user_id, total_xp_earned")
          .order("total_xp_earned", { ascending: false })
          .range(offset, offset + limit - 1);

        if (error) {
          console.error("Error fetching XP leaderboard:", error);
          return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
        }

        const userIds = data?.map((r) => r.user_id) || [];
        const { data: users } = await supabase
          .from("user")
          .select("id, name, image")
          .in("id", userIds.length > 0 ? userIds : ["none"]);

        leaderboard = data?.map((r, i) => {
          const user = users?.find((u) => u.id === r.user_id);
          return {
            rank: offset + i + 1,
            userId: r.user_id,
            username: user?.name || "Anonymous",
            image: user?.image,
            totalXp: r.total_xp_earned,
          };
        }) || [];

        if (session?.user?.id) {
          const { data: userXp } = await supabase
            .from("user_streaks")
            .select("total_xp_earned")
            .eq("user_id", session.user.id)
            .single();

          if (userXp) {
            const { count } = await supabase
              .from("user_streaks")
              .select("*", { count: "exact", head: true })
              .gt("total_xp_earned", userXp.total_xp_earned);

            userRank = (count || 0) + 1;
            userData = {
              totalXp: userXp.total_xp_earned,
              rank: userRank,
            };
          }
        }
        break;
      }

      default:
        return NextResponse.json({ error: "Invalid leaderboard type" }, { status: 400 });
    }

    return NextResponse.json({
      type,
      leaderboard,
      total: leaderboard.length,
      userRank,
      userData,
      hasMore: leaderboard.length === limit,
    });
  } catch (error) {
    console.error("Error in global leaderboard API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
