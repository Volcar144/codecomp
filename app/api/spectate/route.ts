/**
 * Spectate API
 * GET - Get live spectate sessions
 * POST - Create a spectate session
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { headers } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // 'duel', 'competition', 'arena'

    let query = supabase
      .from("spectate_sessions")
      .select(`
        id,
        duel_id,
        competition_id,
        arena_id,
        session_type,
        viewer_count,
        started_at,
        duels (
          id,
          player1_id,
          player2_id,
          language,
          status,
          started_at,
          duel_challenges (
            title,
            difficulty
          )
        )
      `)
      .eq("is_live", true)
      .order("viewer_count", { ascending: false });

    if (type) {
      query = query.eq("session_type", type);
    }

    const { data: sessions, error } = await query.limit(20);

    if (error) {
      console.error("Error fetching spectate sessions:", error);
      return NextResponse.json(
        { error: "Failed to fetch sessions" },
        { status: 500 }
      );
    }

    return NextResponse.json({ sessions: sessions || [] });
  } catch (error) {
    console.error("Error in GET /api/spectate:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const { duelId, competitionId, arenaId, sessionType } = await request.json();

    if (!sessionType) {
      return NextResponse.json(
        { error: "Session type is required" },
        { status: 400 }
      );
    }

    // Check if session already exists
    let existingQuery = supabase
      .from("spectate_sessions")
      .select("id")
      .eq("is_live", true);

    if (duelId) existingQuery = existingQuery.eq("duel_id", duelId);
    if (competitionId) existingQuery = existingQuery.eq("competition_id", competitionId);
    if (arenaId) existingQuery = existingQuery.eq("arena_id", arenaId);

    const { data: existing } = await existingQuery.single();

    if (existing) {
      return NextResponse.json({ session: existing });
    }

    // Create new session
    const { data: newSession, error } = await supabase
      .from("spectate_sessions")
      .insert({
        duel_id: duelId || null,
        competition_id: competitionId || null,
        arena_id: arenaId || null,
        session_type: sessionType,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating spectate session:", error);
      return NextResponse.json(
        { error: "Failed to create session" },
        { status: 500 }
      );
    }

    return NextResponse.json({ session: newSession }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/spectate:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
