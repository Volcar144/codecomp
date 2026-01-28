/**
 * GitHub Repository Files API
 * Handles file operations for arena repositories
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { createGitHubClient } from "@/lib/github-client";
import { headers } from "next/headers";

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

  // Check if token is expired
  if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
    return null;
  }

  return createGitHubClient(tokenData.access_token);
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const owner = searchParams.get("owner");
    const repo = searchParams.get("repo");
    const path = searchParams.get("path") || "";

    if (!owner || !repo) {
      return NextResponse.json(
        { error: "Owner and repo are required" },
        { status: 400 }
      );
    }

    const github = await getGitHubClientForUser(session.user.id);
    if (!github) {
      return NextResponse.json(
        { error: "GitHub not connected. Please authorize GitHub access." },
        { status: 403 }
      );
    }

    // Check if path is a file or directory
    const file = await github.getFileContent(owner, repo, path);
    if (file) {
      return NextResponse.json({ type: "file", ...file });
    }

    // Try as directory
    const contents = await github.listDirectory(owner, repo, path);
    return NextResponse.json({ type: "directory", contents });
  } catch (error) {
    console.error("Error fetching GitHub files:", error);
    return NextResponse.json(
      { error: "Failed to fetch files" },
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
    const { owner, repo, path, content, message } = body;

    if (!owner || !repo || !path || content === undefined) {
      return NextResponse.json(
        { error: "Owner, repo, path, and content are required" },
        { status: 400 }
      );
    }

    const github = await getGitHubClientForUser(session.user.id);
    if (!github) {
      return NextResponse.json(
        { error: "GitHub not connected. Please authorize GitHub access." },
        { status: 403 }
      );
    }

    const result = await github.createOrUpdateFile(
      owner,
      repo,
      path,
      content,
      message || `Update ${path}`
    );

    return NextResponse.json({ success: true, commit: result });
  } catch (error) {
    console.error("Error saving GitHub file:", error);
    return NextResponse.json(
      { error: "Failed to save file" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const owner = searchParams.get("owner");
    const repo = searchParams.get("repo");
    const path = searchParams.get("path");

    if (!owner || !repo || !path) {
      return NextResponse.json(
        { error: "Owner, repo, and path are required" },
        { status: 400 }
      );
    }

    const github = await getGitHubClientForUser(session.user.id);
    if (!github) {
      return NextResponse.json(
        { error: "GitHub not connected. Please authorize GitHub access." },
        { status: 403 }
      );
    }

    const result = await github.deleteFile(
      owner,
      repo,
      path,
      `Delete ${path}`
    );

    return NextResponse.json({ success: true, commit: result });
  } catch (error) {
    console.error("Error deleting GitHub file:", error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    );
  }
}
