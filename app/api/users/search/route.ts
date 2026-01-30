import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { headers } from "next/headers";

// GET /api/users/search - Search for users
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim();
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

    if (!query || query.length < 2) {
      return NextResponse.json({ error: "Search query must be at least 2 characters" }, { status: 400 });
    }

    // Search users by name or email (partial match)
    const { data: users, error } = await supabase
      .from("user")
      .select("id, name, email, image")
      .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
      .neq("id", userId) // Exclude current user
      .limit(limit);

    if (error) {
      console.error("Error searching users:", error);
      return NextResponse.json({ error: "Search failed" }, { status: 500 });
    }

    // Get existing friendships to filter them out
    const { data: friendships } = await supabase
      .from("friendships")
      .select("user_id, friend_id, status")
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

    // Build set of friend/pending IDs
    const friendIds = new Set<string>();
    const pendingIds = new Set<string>();
    
    friendships?.forEach((f) => {
      const otherId = f.user_id === userId ? f.friend_id : f.user_id;
      if (f.status === "accepted") {
        friendIds.add(otherId);
      } else if (f.status === "pending") {
        pendingIds.add(otherId);
      }
    });

    // Get skill ratings for search results
    const userIds = users?.map((u) => u.id) || [];
    const { data: ratings } = await supabase
      .from("user_ratings")
      .select("user_id, skill_rating, skill_tier")
      .in("user_id", userIds.length > 0 ? userIds : ["none"]);

    // Filter out existing friends and add metadata
    const searchResults = users
      ?.filter((u) => !friendIds.has(u.id)) // Remove existing friends
      .map((u) => {
        const rating = ratings?.find((r) => r.user_id === u.id);
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          image: u.image,
          skillRating: rating?.skill_rating || 1000,
          skillTier: rating?.skill_tier || "Bronze",
          isPending: pendingIds.has(u.id),
        };
      }) || [];

    return NextResponse.json({
      users: searchResults,
      total: searchResults.length,
    });
  } catch (error) {
    console.error("Error in user search API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
