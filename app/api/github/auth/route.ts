/**
 * GitHub Authorization Route
 * Initiates the GitHub OAuth flow
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getGitHubAuthUrl } from "@/lib/github-client";
import { headers } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const redirect = searchParams.get("redirect") || "/dashboard";

    // Generate authorization URL with state containing the redirect URL
    const state = encodeURIComponent(redirect);
    const authUrl = getGitHubAuthUrl(state);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Error in GitHub auth:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
