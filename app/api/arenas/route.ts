/**
 * Arena API Routes
 * Handles CRUD operations for private arenas (app competitions)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { headers } from "next/headers";
import { getPostHogClient } from "@/lib/posthog-server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const myArenas = searchParams.get("my") === "true";
    const participating = searchParams.get("participating") === "true";
    const publicOnly = searchParams.get("public") === "true";

    // Try to get session (optional for public arenas)
    let userId: string | null = null;
    try {
      const session = await auth.api.getSession({
        headers: await headers(),
      });
      userId = session?.user?.id || null;
    } catch {
      // User not authenticated
    }

    // For "my" or "participating" filters, authentication is required
    if ((myArenas || participating) && !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let query = supabase
      .from("arenas")
      .select(`
        *,
        arena_participants!arena_participants_arena_id_fkey(count),
        arena_judges!arena_judges_arena_id_fkey(count)
      `);

    if (myArenas) {
      // Get arenas created by the user
      query = query.eq("creator_id", userId);
    } else if (participating) {
      // Get arenas the user is participating in
      const { data: participations } = await supabase
        .from("arena_participants")
        .select("arena_id")
        .eq("user_id", userId);

      if (participations && participations.length > 0) {
        const arenaIds = participations.map((p) => p.arena_id);
        query = query.in("id", arenaIds);
      } else {
        return NextResponse.json({ arenas: [] });
      }
    } else if (publicOnly) {
      // Get only public arenas (for unauthenticated users or public listing)
      query = query.eq("is_public", true);
    } else if (userId) {
      // Get public arenas or arenas user has access to
      query = query.or(
        `is_public.eq.true,creator_id.eq.${userId}`
      );
    } else {
      // Unauthenticated users only see public arenas
      query = query.eq("is_public", true);
    }

    const { data: arenas, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      console.error("Error fetching arenas:", error);
      return NextResponse.json(
        { error: "Failed to fetch arenas" },
        { status: 500 }
      );
    }

    return NextResponse.json({ arenas });
  } catch (error) {
    console.error("Error in GET /api/arenas:", error);
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

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      github_repo,
      start_date,
      end_date,
      judging_criteria,
      max_participants,
      is_public,
      invite_code,
    } = body;

    // Validation
    if (!title || title.trim().length === 0) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    if (!github_repo || !github_repo.includes("/")) {
      return NextResponse.json(
        { error: "Valid GitHub repository (owner/repo) is required" },
        { status: 400 }
      );
    }

    if (start_date && end_date && new Date(start_date) >= new Date(end_date)) {
      return NextResponse.json(
        { error: "End date must be after start date" },
        { status: 400 }
      );
    }

    // Generate invite code for private arenas
    const generatedInviteCode =
      !is_public && !invite_code
        ? Math.random().toString(36).substring(2, 10).toUpperCase()
        : invite_code;

    const { data: arena, error } = await supabase
      .from("arenas")
      .insert({
        title: title.trim(),
        description: description?.trim() || null,
        creator_id: session.user.id,
        github_repo,
        start_date: start_date || null,
        end_date: end_date || null,
        judging_criteria: judging_criteria || null,
        max_participants: max_participants || null,
        is_public: is_public ?? false,
        invite_code: generatedInviteCode || null,
        status: "draft",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating arena:", error);
      return NextResponse.json(
        { error: "Failed to create arena" },
        { status: 500 }
      );
    }

    // Capture server-side arena created event
    const posthog = getPostHogClient();
    posthog.capture({
      distinctId: session.user.email || session.user.id,
      event: "arena_created",
      properties: {
        arena_id: arena.id,
        title: title,
        is_public: is_public ?? false,
        github_repo: github_repo,
        max_participants: max_participants || null,
      },
    });

    return NextResponse.json({ arena }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/arenas:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
