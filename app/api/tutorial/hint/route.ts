import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { headers } from "next/headers";

// POST /api/tutorial/hint - Use a hint for a lesson
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
    const { lessonId, hintIndex } = body;

    if (!lessonId || hintIndex === undefined) {
      return NextResponse.json({ error: "Lesson ID and hint index required" }, { status: 400 });
    }

    // Get lesson details
    const { data: lesson, error: lessonError } = await supabase
      .from("tutorial_lessons")
      .select("hints")
      .eq("id", lessonId)
      .single();

    if (lessonError || !lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    const hints = lesson.hints as string[];
    if (hintIndex >= hints.length) {
      return NextResponse.json({ error: "Invalid hint index" }, { status: 400 });
    }

    // Get or create progress record
    const { data: progress } = await supabase
      .from("tutorial_progress")
      .select("hints_used")
      .eq("user_id", userId)
      .eq("lesson_id", lessonId)
      .single();

    const currentHintsUsed = progress?.hints_used || 0;
    const newHintsUsed = Math.max(currentHintsUsed, hintIndex + 1);

    // Update progress with hints used
    await supabase
      .from("tutorial_progress")
      .upsert(
        {
          user_id: userId,
          lesson_id: lessonId,
          hints_used: newHintsUsed,
          status: "in_progress",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,lesson_id" }
      );

    // Return hints up to the requested index
    const unlockedHints = hints.slice(0, hintIndex + 1);

    return NextResponse.json({
      success: true,
      hint: hints[hintIndex],
      hintsUnlocked: unlockedHints,
      totalHints: hints.length,
      hintsRemaining: hints.length - newHintsUsed,
    });
  } catch (error) {
    console.error("Error getting hint:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
