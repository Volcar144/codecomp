import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { headers } from "next/headers";

// GET /api/achievements - Get user achievements or all achievements
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");
    const includeAll = searchParams.get("all") === "true";

    // Get all achievement definitions
    const { data: definitions, error: defError } = await supabase
      .from("achievement_definitions")
      .select("*")
      .order("category")
      .order("requirement_value");

    if (defError) throw defError;

    // If requesting all definitions only
    if (includeAll && !userId) {
      return NextResponse.json({ achievements: definitions });
    }

    // Get session for current user
    const session = await auth.api.getSession({ headers: await headers() });
    const targetUserId = userId || session?.user?.id;

    if (!targetUserId) {
      return NextResponse.json({ 
        achievements: definitions,
        unlocked: [] 
      });
    }

    // Get user's unlocked achievements
    const { data: unlocked, error: unlockedError } = await supabase
      .from("user_achievements")
      .select(`
        *,
        achievement_definitions (*)
      `)
      .eq("user_id", targetUserId)
      .order("unlocked_at", { ascending: false });

    if (unlockedError) throw unlockedError;

    // Get user's progress towards achievements
    const progress = await calculateAchievementProgress(targetUserId);

    return NextResponse.json({
      achievements: definitions,
      unlocked: unlocked || [],
      progress,
    });
  } catch (error) {
    console.error("Error fetching achievements:", error);
    return NextResponse.json(
      { error: "Failed to fetch achievements" },
      { status: 500 }
    );
  }
}

// POST /api/achievements - Check and unlock achievements for user
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { trigger } = await request.json();
    
    // Check achievements based on trigger type
    const newlyUnlocked = await checkAndUnlockAchievements(
      session.user.id,
      trigger
    );

    return NextResponse.json({
      success: true,
      unlocked: newlyUnlocked,
    });
  } catch (error) {
    console.error("Error checking achievements:", error);
    return NextResponse.json(
      { error: "Failed to check achievements" },
      { status: 500 }
    );
  }
}

// Helper function to calculate progress towards each achievement
async function calculateAchievementProgress(userId: string): Promise<Record<string, number>> {
  const progress: Record<string, number> = {};

  try {
    // Get user stats for various achievement types
    const [
      { count: totalSubmissions },
      { count: passedSubmissions },
      { data: duelStats },
      { data: streakData },
      { data: skillData },
    ] = await Promise.all([
      // Total submissions
      supabase
        .from("submissions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId),
      
      // Passed submissions
      supabase
        .from("submissions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "passed"),
      
      // Duel stats
      supabase
        .from("duels")
        .select("winner_id")
        .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
        .eq("status", "completed"),
      
      // Streak data
      supabase
        .from("user_streaks")
        .select("current_streak, longest_streak")
        .eq("user_id", userId)
        .single(),
      
      // Skill rating
      supabase
        .from("user_skill_ratings")
        .select("rating")
        .eq("user_id", userId)
        .single(),
    ]);

    // Calculate duel wins
    const duelWins = duelStats?.filter((d) => d.winner_id === userId).length || 0;
    const totalDuels = duelStats?.length || 0;

    // Set progress values
    progress["first_submission"] = totalSubmissions || 0;
    progress["submissions_10"] = totalSubmissions || 0;
    progress["submissions_50"] = totalSubmissions || 0;
    progress["submissions_100"] = totalSubmissions || 0;
    progress["perfect_score"] = passedSubmissions || 0;
    progress["first_duel_win"] = duelWins;
    progress["duel_wins_10"] = duelWins;
    progress["duel_wins_50"] = duelWins;
    progress["duels_played_100"] = totalDuels;
    progress["streak_7"] = streakData?.current_streak || 0;
    progress["streak_30"] = streakData?.current_streak || 0;
    progress["streak_100"] = streakData?.longest_streak || 0;
    progress["rating_1500"] = skillData?.rating || 1000;
    progress["rating_2000"] = skillData?.rating || 1000;
    progress["rating_2500"] = skillData?.rating || 1000;

  } catch (error) {
    console.error("Error calculating progress:", error);
  }

  return progress;
}

// Helper function to check and unlock achievements
async function checkAndUnlockAchievements(
  userId: string,
  trigger: string
): Promise<string[]> {
  const unlocked: string[] = [];

  try {
    // Get all achievement definitions
    const { data: definitions } = await supabase
      .from("achievement_definitions")
      .select("*");

    if (!definitions) return unlocked;

    // Get already unlocked achievements
    const { data: existing } = await supabase
      .from("user_achievements")
      .select("achievement_id")
      .eq("user_id", userId);

    const existingIds = new Set(existing?.map((e) => e.achievement_id) || []);

    // Get user stats
    const progress = await calculateAchievementProgress(userId);

    // Check each achievement
    for (const def of definitions) {
      if (existingIds.has(def.id)) continue;

      let shouldUnlock = false;
      const reqValue = def.requirement_value || 1;

      switch (def.requirement_type) {
        case "submissions_count":
          shouldUnlock = (progress["submissions_100"] || 0) >= reqValue;
          break;
        case "perfect_submissions":
          shouldUnlock = (progress["perfect_score"] || 0) >= reqValue;
          break;
        case "duel_wins":
          shouldUnlock = (progress["duel_wins_50"] || 0) >= reqValue;
          break;
        case "duels_played":
          shouldUnlock = (progress["duels_played_100"] || 0) >= reqValue;
          break;
        case "streak_days":
          shouldUnlock = (progress["streak_100"] || 0) >= reqValue;
          break;
        case "rating_reached":
          shouldUnlock = (progress["rating_2500"] || 1000) >= reqValue;
          break;
        case "first_submission":
          shouldUnlock = (progress["first_submission"] || 0) >= 1;
          break;
        case "first_duel_win":
          shouldUnlock = (progress["first_duel_win"] || 0) >= 1;
          break;
      }

      if (shouldUnlock) {
        // Insert achievement
        const { error } = await supabase
          .from("user_achievements")
          .insert({
            user_id: userId,
            achievement_id: def.id,
          });

        if (!error) {
          unlocked.push(def.name);

          // Award XP/points if applicable
          if (def.xp_reward) {
            await supabase.rpc("add_user_xp", {
              p_user_id: userId,
              p_xp: def.xp_reward,
            });
          }
        }
      }
    }
  } catch (error) {
    console.error("Error unlocking achievements:", error);
  }

  return unlocked;
}
