/**
 * Arena Judging API
 * Handles judge operations and scoring for arenas
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { headers } from "next/headers";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: arenaId } = await params;
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get arena and verify judge access
    const { data: arena } = await supabase
      .from("arenas")
      .select(`
        *,
        arena_judges(*),
        arena_participants(*),
        arena_scores(*)
      `)
      .eq("id", arenaId)
      .single();

    if (!arena) {
      return NextResponse.json({ error: "Arena not found" }, { status: 404 });
    }

    const isCreator = arena.creator_id === session.user.id;
    const isJudge = arena.arena_judges?.some(
      (j: { user_id: string }) => j.user_id === session.user.id
    );

    if (!isCreator && !isJudge) {
      return NextResponse.json({ error: "Not authorized to judge" }, { status: 403 });
    }

    // Get all participants with their scores
    const participantsWithScores = arena.arena_participants?.map(
      (participant: { id: string; user_id: string; github_username: string; directory_path: string }) => {
        const scores = arena.arena_scores?.filter(
          (s: { participant_id: string }) => s.participant_id === participant.id
        );
        return {
          ...participant,
          scores,
          totalScore: scores?.reduce(
            (sum: number, s: { score: number }) => sum + s.score,
            0
          ) || 0,
        };
      }
    );

    return NextResponse.json({
      arena,
      participants: participantsWithScores,
      isCreator,
      isJudge,
    });
  } catch (error) {
    console.error("Error in GET /api/arenas/[id]/judge:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: arenaId } = await params;
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, participantId, score, feedback, userId } = body;

    // Get arena
    const { data: arena } = await supabase
      .from("arenas")
      .select("*, arena_judges(*)")
      .eq("id", arenaId)
      .single();

    if (!arena) {
      return NextResponse.json({ error: "Arena not found" }, { status: 404 });
    }

    const isCreator = arena.creator_id === session.user.id;
    const isJudge = arena.arena_judges?.some(
      (j: { user_id: string }) => j.user_id === session.user.id
    );

    switch (action) {
      case "add_judge": {
        if (!isCreator) {
          return NextResponse.json(
            { error: "Only creators can add judges" },
            { status: 403 }
          );
        }

        if (!userId) {
          return NextResponse.json(
            { error: "User ID is required" },
            { status: 400 }
          );
        }

        const { data: judge, error } = await supabase
          .from("arena_judges")
          .insert({
            arena_id: arenaId,
            user_id: userId,
          })
          .select()
          .single();

        if (error) {
          if (error.code === "23505") {
            return NextResponse.json(
              { error: "User is already a judge" },
              { status: 400 }
            );
          }
          throw error;
        }

        return NextResponse.json({ judge });
      }

      case "remove_judge": {
        if (!isCreator) {
          return NextResponse.json(
            { error: "Only creators can remove judges" },
            { status: 403 }
          );
        }

        if (!userId) {
          return NextResponse.json(
            { error: "User ID is required" },
            { status: 400 }
          );
        }

        const { error } = await supabase
          .from("arena_judges")
          .delete()
          .eq("arena_id", arenaId)
          .eq("user_id", userId);

        if (error) throw error;

        return NextResponse.json({ success: true });
      }

      case "score": {
        if (!isCreator && !isJudge) {
          return NextResponse.json(
            { error: "Not authorized to score" },
            { status: 403 }
          );
        }

        if (!participantId || score === undefined) {
          return NextResponse.json(
            { error: "Participant ID and score are required" },
            { status: 400 }
          );
        }

        if (score < 0 || score > 100) {
          return NextResponse.json(
            { error: "Score must be between 0 and 100" },
            { status: 400 }
          );
        }

        // Upsert score (one score per judge per participant)
        const { data: scoreData, error } = await supabase
          .from("arena_scores")
          .upsert(
            {
              arena_id: arenaId,
              participant_id: participantId,
              judge_id: session.user.id,
              score,
              feedback: feedback || null,
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: "arena_id,participant_id,judge_id",
            }
          )
          .select()
          .single();

        if (error) throw error;

        return NextResponse.json({ score: scoreData });
      }

      case "declare_winner": {
        if (!isCreator) {
          return NextResponse.json(
            { error: "Only creators can declare winners" },
            { status: 403 }
          );
        }

        if (!participantId) {
          return NextResponse.json(
            { error: "Participant ID is required" },
            { status: 400 }
          );
        }

        // Update arena with winner and set status to completed
        const { data: updatedArena, error } = await supabase
          .from("arenas")
          .update({
            winner_id: participantId,
            status: "completed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", arenaId)
          .select()
          .single();

        if (error) throw error;

        return NextResponse.json({ arena: updatedArena });
      }

      default:
        return NextResponse.json(
          { error: "Invalid action. Use: add_judge, remove_judge, score, declare_winner" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error in POST /api/arenas/[id]/judge:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
