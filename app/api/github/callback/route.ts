/**
 * GitHub OAuth Callback Route
 * Handles the OAuth callback from GitHub and stores the access token
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { exchangeCodeForToken } from "@/lib/github-client";
import { headers } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    // Handle OAuth errors
    if (error) {
      console.error("GitHub OAuth error:", error, errorDescription);
      return NextResponse.redirect(
        new URL(
          `/dashboard?error=${encodeURIComponent(errorDescription || error)}`,
          request.url
        )
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL("/dashboard?error=missing_code", request.url)
      );
    }

    // Get current session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.redirect(
        new URL("/login?redirect=/dashboard", request.url)
      );
    }

    // Exchange code for access token
    const tokens = await exchangeCodeForToken(code);

    // Store the GitHub token for the user
    const { error: upsertError } = await supabase
      .from("user_github_tokens")
      .upsert(
        {
          user_id: session.user.id,
          access_token: tokens.access_token,
          token_type: tokens.token_type,
          scope: tokens.scope,
          refresh_token: tokens.refresh_token || null,
          expires_at: tokens.expires_in
            ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
            : null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      );

    if (upsertError) {
      console.error("Error storing GitHub token:", upsertError);
      return NextResponse.redirect(
        new URL("/dashboard?error=token_storage_failed", request.url)
      );
    }

    // Redirect back to where the user came from (stored in state) or dashboard
    const redirectUrl = state ? decodeURIComponent(state) : "/dashboard";
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  } catch (error) {
    console.error("Error in GitHub OAuth callback:", error);
    return NextResponse.redirect(
      new URL("/dashboard?error=oauth_failed", request.url)
    );
  }
}
