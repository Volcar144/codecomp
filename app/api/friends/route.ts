import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { headers } from "next/headers";

// GET /api/friends - Get user's friends list
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
    const status = searchParams.get("status") || "accepted";

    // Get friendships where user is either sender or receiver
    const { data: friendships, error } = await supabase
      .from("friendships")
      .select("*")
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
      .eq("status", status)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching friendships:", error);
      return NextResponse.json({ error: "Failed to fetch friends" }, { status: 500 });
    }

    // Get friend IDs
    const friendIds = friendships.map((f) =>
      f.user_id === userId ? f.friend_id : f.user_id
    );

    // Fetch friend details from user table
    const { data: friends, error: userError } = await supabase
      .from("user")
      .select("id, name, email, image")
      .in("id", friendIds.length > 0 ? friendIds : ["none"]);

    if (userError) {
      console.error("Error fetching friend details:", userError);
      return NextResponse.json({ error: "Failed to fetch friend details" }, { status: 500 });
    }

    // Fetch online status
    const { data: presence } = await supabase
      .from("user_presence")
      .select("*")
      .in("user_id", friendIds.length > 0 ? friendIds : ["none"]);

    // Combine data
    const friendsWithDetails = friendships.map((f) => {
      const friendId = f.user_id === userId ? f.friend_id : f.user_id;
      const friend = friends?.find((u) => u.id === friendId);
      const online = presence?.find((p) => p.user_id === friendId);

      return {
        id: f.id,
        friendId,
        name: friend?.name || "Unknown",
        email: friend?.email,
        image: friend?.image,
        isOnline: online?.is_online || false,
        lastSeen: online?.last_seen,
        currentActivity: online?.current_activity,
        friendsSince: f.accepted_at || f.created_at,
      };
    });

    return NextResponse.json({
      friends: friendsWithDetails,
      total: friendsWithDetails.length,
    });
  } catch (error) {
    console.error("Error in friends API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/friends - Send friend request
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { friendId, email, username } = body;

    let targetUserId = friendId;

    // Find user by email or username if friendId not provided
    if (!targetUserId && (email || username)) {
      const { data: targetUser } = await supabase
        .from("user")
        .select("id")
        .or(`email.eq.${email || "none"},name.eq.${username || "none"}`)
        .single();

      if (targetUser) {
        targetUserId = targetUser.id;
      } else {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
    }

    if (!targetUserId) {
      return NextResponse.json({ error: "Friend ID, email, or username required" }, { status: 400 });
    }

    if (targetUserId === userId) {
      return NextResponse.json({ error: "Cannot add yourself as friend" }, { status: 400 });
    }

    // Check if friendship already exists
    const { data: existing } = await supabase
      .from("friendships")
      .select("id, status")
      .or(
        `and(user_id.eq.${userId},friend_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},friend_id.eq.${userId})`
      )
      .single();

    if (existing) {
      if (existing.status === "accepted") {
        return NextResponse.json({ error: "Already friends" }, { status: 400 });
      } else if (existing.status === "pending") {
        return NextResponse.json({ error: "Friend request already pending" }, { status: 400 });
      } else if (existing.status === "blocked") {
        return NextResponse.json({ error: "Cannot send friend request" }, { status: 400 });
      }
    }

    // Create friend request
    const { data: friendship, error } = await supabase
      .from("friendships")
      .insert({
        user_id: userId,
        friend_id: targetUserId,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating friend request:", error);
      return NextResponse.json({ error: "Failed to send friend request" }, { status: 500 });
    }

    // Create notification for the recipient
    await supabase.rpc("create_notification", {
      p_user_id: targetUserId,
      p_type: "friend_request",
      p_title: "New Friend Request",
      p_message: `${session.user.name || "Someone"} sent you a friend request`,
      p_data: { friendshipId: friendship.id, fromUserId: userId },
    });

    return NextResponse.json({
      success: true,
      friendship,
      message: "Friend request sent",
    });
  } catch (error) {
    console.error("Error sending friend request:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/friends - Remove friend or cancel request
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const friendshipId = searchParams.get("friendshipId");
    const friendId = searchParams.get("friendId");

    let deleteQuery = supabase.from("friendships").delete();

    if (friendshipId) {
      deleteQuery = deleteQuery.eq("id", friendshipId);
    } else if (friendId) {
      deleteQuery = deleteQuery.or(
        `and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`
      );
    } else {
      return NextResponse.json({ error: "Friendship ID or Friend ID required" }, { status: 400 });
    }

    const { error } = await deleteQuery;

    if (error) {
      console.error("Error removing friend:", error);
      return NextResponse.json({ error: "Failed to remove friend" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Friend removed" });
  } catch (error) {
    console.error("Error removing friend:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
