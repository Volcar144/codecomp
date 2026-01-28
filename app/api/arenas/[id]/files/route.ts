/**
 * Arena Files API
 * Handles file operations within an arena context
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { createGitHubClient } from "@/lib/github-client";
import { headers } from "next/headers";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Get GitHub client for the authenticated user
 */
async function getGitHubClientForUser(userId: string) {
  const { data: tokenData } = await supabase
    .from("user_github_tokens")
    .select("access_token, expires_at")
    .eq("user_id", userId)
    .single();

  if (!tokenData) {
    return null;
  }

  if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
    return null;
  }

  return createGitHubClient(tokenData.access_token);
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

    // Get arena and verify access
    const { data: arena } = await supabase
      .from("arenas")
      .select("*, arena_participants(*)")
      .eq("id", arenaId)
      .single();

    if (!arena) {
      return NextResponse.json({ error: "Arena not found" }, { status: 404 });
    }

    // Check if user is participant, creator, or judge
    const isCreator = arena.creator_id === session.user.id;
    const participant = arena.arena_participants?.find(
      (p: { user_id: string }) => p.user_id === session.user.id
    );

    if (!isCreator && !participant) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const github = await getGitHubClientForUser(session.user.id);
    if (!github) {
      return NextResponse.json(
        { error: "GitHub not connected" },
        { status: 403 }
      );
    }

    const [owner, repo] = arena.github_repo.split("/");
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get("file");

    // Get participant's directory
    const username = participant?.github_username || session.user.name || session.user.id;
    const sanitizedUsername = username.replace(/[^a-zA-Z0-9_-]/g, "_");
    const basePath = `arenas/${arenaId}/${sanitizedUsername}`;

    if (filename) {
      // Get specific file
      const file = await github.getFileContent(owner, repo, `${basePath}/${filename}`);
      if (!file) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }
      return NextResponse.json({ file: { name: filename, ...file } });
    }

    // List all files in participant's directory
    const files = await github.listDirectory(owner, repo, basePath);
    return NextResponse.json({ files, basePath });
  } catch (error) {
    console.error("Error in GET /api/arenas/[id]/files:", error);
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
    const { filename, content, message } = body;

    if (!filename || content === undefined) {
      return NextResponse.json(
        { error: "Filename and content are required" },
        { status: 400 }
      );
    }

    // Get arena and verify participant
    const { data: arena } = await supabase
      .from("arenas")
      .select("*, arena_participants(*)")
      .eq("id", arenaId)
      .single();

    if (!arena) {
      return NextResponse.json({ error: "Arena not found" }, { status: 404 });
    }

    const participant = arena.arena_participants?.find(
      (p: { user_id: string }) => p.user_id === session.user.id
    );

    if (!participant && arena.creator_id !== session.user.id) {
      return NextResponse.json({ error: "Not a participant" }, { status: 403 });
    }

    // Check if arena is still accepting submissions
    if (arena.status === "completed" || arena.status === "judging") {
      return NextResponse.json(
        { error: "Arena is no longer accepting submissions" },
        { status: 400 }
      );
    }

    const github = await getGitHubClientForUser(session.user.id);
    if (!github) {
      return NextResponse.json(
        { error: "GitHub not connected" },
        { status: 403 }
      );
    }

    const [owner, repo] = arena.github_repo.split("/");
    const username = participant?.github_username || session.user.name || session.user.id;
    const sanitizedUsername = username.replace(/[^a-zA-Z0-9_-]/g, "_");

    const result = await github.saveArenaFile(
      owner,
      repo,
      arenaId,
      sanitizedUsername,
      filename,
      content
    );

    // Update participant's last activity
    if (participant) {
      await supabase
        .from("arena_participants")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", participant.id);
    }

    return NextResponse.json({
      success: true,
      commit: result,
      path: `arenas/${arenaId}/${sanitizedUsername}/${filename}`,
    });
  } catch (error) {
    console.error("Error in POST /api/arenas/[id]/files:", error);
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

    const { searchParams } = new URL(request.url);
    const filename = searchParams.get("file");

    if (!filename) {
      return NextResponse.json(
        { error: "Filename is required" },
        { status: 400 }
      );
    }

    // Get arena and verify participant
    const { data: arena } = await supabase
      .from("arenas")
      .select("*, arena_participants(*)")
      .eq("id", arenaId)
      .single();

    if (!arena) {
      return NextResponse.json({ error: "Arena not found" }, { status: 404 });
    }

    const participant = arena.arena_participants?.find(
      (p: { user_id: string }) => p.user_id === session.user.id
    );

    if (!participant && arena.creator_id !== session.user.id) {
      return NextResponse.json({ error: "Not a participant" }, { status: 403 });
    }

    const github = await getGitHubClientForUser(session.user.id);
    if (!github) {
      return NextResponse.json(
        { error: "GitHub not connected" },
        { status: 403 }
      );
    }

    const [owner, repo] = arena.github_repo.split("/");
    const username = participant?.github_username || session.user.name || session.user.id;
    const sanitizedUsername = username.replace(/[^a-zA-Z0-9_-]/g, "_");
    const path = `arenas/${arenaId}/${sanitizedUsername}/${filename}`;

    const result = await github.deleteFile(
      owner,
      repo,
      path,
      `Delete ${filename}`
    );

    return NextResponse.json({ success: true, commit: result });
  } catch (error) {
    console.error("Error in DELETE /api/arenas/[id]/files:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
