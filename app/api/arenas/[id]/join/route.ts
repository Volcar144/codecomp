/**
 * Arena Join API Route
 * Handles participants joining an arena
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { headers } from "next/headers";
import { getPostHogClient } from "@/lib/posthog-server";

interface RouteParams {
  params: Promise<{ id: string }>;
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
    const { invite_code, github_username } = body;

    // Get arena details
    const { data: arena, error: arenaError } = await supabase
      .from("arenas")
      .select("*, arena_participants(count)")
      .eq("id", arenaId)
      .single();

    if (arenaError || !arena) {
      return NextResponse.json({ error: "Arena not found" }, { status: 404 });
    }

    // Check if arena is open for joining
    if (arena.status === "completed" || arena.status === "judging") {
      return NextResponse.json(
        { error: "This arena is no longer accepting participants" },
        { status: 400 }
      );
    }

    // Check invite code for private arenas
    if (!arena.is_public) {
      if (!invite_code || invite_code !== arena.invite_code) {
        return NextResponse.json(
          { error: "Invalid invite code" },
          { status: 403 }
        );
      }
    }

    // Check max participants
    const currentParticipants = arena.arena_participants?.[0]?.count || 0;
    if (arena.max_participants && currentParticipants >= arena.max_participants) {
      return NextResponse.json(
        { error: "Arena has reached maximum participants" },
        { status: 400 }
      );
    }

    // Check if already participating
    const { data: existingParticipant } = await supabase
      .from("arena_participants")
      .select("id")
      .eq("arena_id", arenaId)
      .eq("user_id", session.user.id)
      .single();

    if (existingParticipant) {
      return NextResponse.json(
        { error: "Already participating in this arena" },
        { status: 400 }
      );
    }

    // Create participant directory path
    const username = github_username || session.user.name || session.user.id;
    const sanitizedUsername = username.replace(/[^a-zA-Z0-9_-]/g, "_");
    const directoryPath = `arenas/${arenaId}/${sanitizedUsername}`;

    // Add participant
    const { data: participant, error: joinError } = await supabase
      .from("arena_participants")
      .insert({
        arena_id: arenaId,
        user_id: session.user.id,
        github_username: github_username || null,
        directory_path: directoryPath,
      })
      .select()
      .single();

    if (joinError) {
      console.error("Error joining arena:", joinError);
      return NextResponse.json(
        { error: "Failed to join arena" },
        { status: 500 }
      );
    }

    // Capture server-side arena joined event
    const posthog = getPostHogClient();
    posthog.capture({
      distinctId: session.user.email || session.user.id,
      event: "arena_joined",
      properties: {
        arena_id: arenaId,
        arena_title: arena.title,
        is_public: arena.is_public,
        github_username: github_username || null,
      },
    });

    return NextResponse.json({
      participant,
      directoryPath,
      message: "Successfully joined the arena",
    });
  } catch (error) {
    console.error("Error in POST /api/arenas/[id]/join:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: arenaId } = await params;
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Remove participant
    const { error } = await supabase
      .from("arena_participants")
      .delete()
      .eq("arena_id", arenaId)
      .eq("user_id", session.user.id);

    if (error) {
      console.error("Error leaving arena:", error);
      return NextResponse.json(
        { error: "Failed to leave arena" },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Successfully left the arena" });
  } catch (error) {
    console.error("Error in DELETE /api/arenas/[id]/join:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
