import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { headers } from "next/headers";

// GET /api/tutorial - Get tutorial lessons and user progress
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const slug = searchParams.get("slug");
    const difficulty = searchParams.get("difficulty");

    // Build query for lessons
    let query = supabase
      .from("tutorial_lessons")
      .select("*")
      .eq("is_active", true)
      .order("order_index", { ascending: true });

    if (category) {
      query = query.eq("category", category);
    }

    if (slug) {
      query = query.eq("slug", slug);
    }

    if (difficulty) {
      query = query.eq("difficulty", difficulty);
    }

    const { data: lessons, error } = await query;

    if (error) {
      console.error("Error fetching tutorials:", error);
      return NextResponse.json({ error: "Failed to fetch tutorials" }, { status: 500 });
    }

    // If user is logged in, get their progress
    let progress: Record<string, { status: string; hintsUsed: number; attempts: number; completedAt: string | null }> = {};
    let completedCount = 0;
    let totalXp = 0;

    if (session?.user?.id) {
      const { data: userProgress } = await supabase
        .from("tutorial_progress")
        .select("lesson_id, status, hints_used, attempts, completed_at")
        .eq("user_id", session.user.id);

      if (userProgress) {
        userProgress.forEach((p) => {
          progress[p.lesson_id] = {
            status: p.status,
            hintsUsed: p.hints_used,
            attempts: p.attempts,
            completedAt: p.completed_at,
          };
          if (p.status === "completed") {
            completedCount++;
            const lesson = lessons?.find((l) => l.id === p.lesson_id);
            if (lesson) {
              totalXp += lesson.xp_reward;
            }
          }
        });
      }
    }

    // Group lessons by category
    const categories: Record<string, typeof lessons> = {};
    const categoryOrder = ["basics", "arrays", "strings", "algorithms", "data-structures"];

    lessons?.forEach((lesson) => {
      if (!categories[lesson.category]) {
        categories[lesson.category] = [];
      }
      categories[lesson.category].push({
        ...lesson,
        progress: progress[lesson.id] || { status: "not_started", hintsUsed: 0, attempts: 0, completedAt: null },
      });
    });

    // Sort categories
    const sortedCategories = categoryOrder
      .filter((cat) => categories[cat])
      .map((cat) => ({
        name: cat,
        displayName: cat.charAt(0).toUpperCase() + cat.slice(1).replace("-", " "),
        lessons: categories[cat],
        completedCount: categories[cat].filter((l) => progress[l.id]?.status === "completed").length,
        totalCount: categories[cat].length,
      }));

    return NextResponse.json({
      categories: sortedCategories,
      totalLessons: lessons?.length || 0,
      completedLessons: completedCount,
      totalXpEarned: totalXp,
      isLoggedIn: !!session?.user?.id,
    });
  } catch (error) {
    console.error("Error in tutorial API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/tutorial - Submit tutorial solution
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { lessonId, code, language, passed, testResults } = body;

    if (!lessonId) {
      return NextResponse.json({ error: "Lesson ID required" }, { status: 400 });
    }

    // Get lesson details
    const { data: lesson, error: lessonError } = await supabase
      .from("tutorial_lessons")
      .select("*")
      .eq("id", lessonId)
      .single();

    if (lessonError || !lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    // Get or create progress record
    const { data: existingProgress } = await supabase
      .from("tutorial_progress")
      .select("*")
      .eq("user_id", userId)
      .eq("lesson_id", lessonId)
      .single();

    const newAttempts = (existingProgress?.attempts || 0) + 1;
    const isFirstCompletion = !existingProgress?.completed_at && passed;

    const progressData = {
      user_id: userId,
      lesson_id: lessonId,
      status: passed ? "completed" : "in_progress",
      attempts: newAttempts,
      best_code: code,
      best_language: language,
      completed_at: passed ? new Date().toISOString() : existingProgress?.completed_at || null,
      updated_at: new Date().toISOString(),
    };

    const { error: progressError } = await supabase
      .from("tutorial_progress")
      .upsert(progressData, { onConflict: "user_id,lesson_id" });

    if (progressError) {
      console.error("Error updating progress:", progressError);
      return NextResponse.json({ error: "Failed to save progress" }, { status: 500 });
    }

    // Award XP on first completion
    if (isFirstCompletion) {
      // Update user streak XP
      await supabase.rpc("update_user_streak", {
        p_user_id: userId,
        p_xp_earned: lesson.xp_reward,
        p_is_daily_challenge: false,
      });

      // Check for tutorial achievements
      const { count: completedCount } = await supabase
        .from("tutorial_progress")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "completed");

      // Award achievements based on completion count
      const achievementMilestones = [
        { count: 1, achievement: "first_tutorial" },
        { count: 5, achievement: "tutorial_explorer" },
        { count: 10, achievement: "tutorial_enthusiast" },
        { count: 15, achievement: "tutorial_master" },
      ];

      for (const milestone of achievementMilestones) {
        if (completedCount === milestone.count) {
          await supabase.rpc("award_achievement", {
            p_user_id: userId,
            p_achievement_type: milestone.achievement,
          });
        }
      }

      // Create notification
      await supabase.rpc("create_notification", {
        p_user_id: userId,
        p_type: "tutorial_completed",
        p_title: "Tutorial Completed!",
        p_message: `You completed "${lesson.title}" and earned ${lesson.xp_reward} XP!`,
        p_data: { lessonId, lessonTitle: lesson.title, xpEarned: lesson.xp_reward },
      });
    }

    return NextResponse.json({
      success: true,
      passed,
      attempts: newAttempts,
      isFirstCompletion,
      xpEarned: isFirstCompletion ? lesson.xp_reward : 0,
      testResults,
    });
  } catch (error) {
    console.error("Error submitting tutorial:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
