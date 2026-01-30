import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import crypto from "crypto";

// GET /api/profile - Get user profile
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      // Get current user profile
      const session = await auth.api.getSession({ headers: await headers() });
      if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { data: profile, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      // Get user stats
      const { data: stats } = await supabase
        .from("leaderboard")
        .select("*")
        .eq("user_id", session.user.id);

      // Get skill rating
      const { data: skillData } = await supabase
        .from("skill_ratings")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      // Generate gravatar URL
      const email = session.user.email || "";
      const gravatarHash = crypto.createHash("md5").update(email.trim().toLowerCase()).digest("hex");
      const gravatarUrl = `https://www.gravatar.com/avatar/${gravatarHash}?s=200&d=identicon`;

      return NextResponse.json({
        profile: profile || { user_id: session.user.id },
        user: {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          image: session.user.image || gravatarUrl,
        },
        gravatarUrl,
        gravatarEditUrl: "https://gravatar.com/profile",
        stats: stats || [],
        skillRating: skillData || { rating: 1500, rank: "unranked" },
      });
    }

    // Get another user's public profile
    const { data: profile, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") throw error;

    // Check if profile is public or partially hidden
    const publicProfile = profile ? {
      user_id: profile.user_id,
      bio: profile.bio,
      location: profile.location,
      website: profile.website,
      github_username: profile.github_username,
      twitter_username: profile.twitter_username,
      linkedin_url: profile.linkedin_url,
      preferred_language: profile.preferred_language,
      show_activity: profile.show_activity,
      created_at: profile.created_at,
    } : null;

    // Get public stats
    const { data: stats } = await supabase
      .from("leaderboard")
      .select("competition_id, best_score, rank, submissions_count")
      .eq("user_id", userId);

    // Get skill rating
    const { data: skillData } = await supabase
      .from("skill_ratings")
      .select("rating, rank, wins, losses")
      .eq("user_id", userId)
      .single();

    // Get user from BetterAuth
    const { data: user } = await supabase
      .from("user")
      .select("id, name, email, image")
      .eq("id", userId)
      .single();

    // Generate gravatar URL for the user
    const email = user?.email || "";
    const gravatarHash = crypto.createHash("md5").update(email.trim().toLowerCase()).digest("hex");
    const gravatarUrl = `https://www.gravatar.com/avatar/${gravatarHash}?s=200&d=identicon`;

    return NextResponse.json({
      profile: publicProfile,
      user: user ? {
        id: user.id,
        name: user.name,
        image: user.image || gravatarUrl,
      } : null,
      gravatarUrl,
      stats: stats || [],
      skillRating: skillData || { rating: 1500, rank: "unranked" },
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

// POST /api/profile - Create or update profile
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      bio,
      location,
      website,
      github_username,
      twitter_username,
      linkedin_url,
      preferred_language,
      theme,
      email_public,
      show_activity,
    } = body;

    // Validate URLs
    if (website && !isValidUrl(website)) {
      return NextResponse.json({ error: "Invalid website URL" }, { status: 400 });
    }
    if (linkedin_url && !isValidUrl(linkedin_url)) {
      return NextResponse.json({ error: "Invalid LinkedIn URL" }, { status: 400 });
    }

    // Upsert profile
    const { data, error } = await supabase
      .from("user_profiles")
      .upsert({
        user_id: session.user.id,
        bio: bio?.slice(0, 500) || null,
        location: location?.slice(0, 100) || null,
        website: website || null,
        github_username: github_username?.replace("@", "").slice(0, 39) || null,
        twitter_username: twitter_username?.replace("@", "").slice(0, 15) || null,
        linkedin_url: linkedin_url || null,
        preferred_language: preferred_language || "python",
        theme: theme || "dark",
        email_public: email_public ?? false,
        show_activity: show_activity ?? true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
