/**
 * GitHub Repositories API
 * Lists available repositories for the authenticated user
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { createGitHubClient } from "@/lib/github-client";
import { headers } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's GitHub token
    const { data: tokenData } = await supabase
      .from("user_github_tokens")
      .select("access_token, expires_at")
      .eq("user_id", session.user.id)
      .single();

    if (!tokenData) {
      return NextResponse.json(
        { error: "GitHub not connected", connected: false },
        { status: 403 }
      );
    }

    // Check if token is expired
    if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "GitHub token expired. Please reconnect.", connected: false },
        { status: 403 }
      );
    }

    const github = createGitHubClient(tokenData.access_token);

    const { searchParams } = new URL(request.url);
    const type = (searchParams.get("type") || "all") as "all" | "owner" | "member";

    const repos = await github.listRepos(type);

    return NextResponse.json({ repos, connected: true });
  } catch (error) {
    console.error("Error fetching GitHub repos:", error);
    return NextResponse.json(
      { error: "Failed to fetch repositories" },
      { status: 500 }
    );
  }
}
