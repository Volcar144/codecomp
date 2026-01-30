import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { headers } from "next/headers";

// GET /api/friends/requests - Get pending friend requests
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
    const type = searchParams.get("type") || "received"; // 'received' or 'sent'

    let query = supabase
      .from("friendships")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (type === "received") {
      query = query.eq("friend_id", userId);
    } else {
      query = query.eq("user_id", userId);
    }

    const { data: requests, error } = await query;

    if (error) {
      console.error("Error fetching friend requests:", error);
      return NextResponse.json({ error: "Failed to fetch requests" }, { status: 500 });
    }

    // Get user IDs to fetch details
    const userIds = requests.map((r) => (type === "received" ? r.user_id : r.friend_id));

    // Fetch user details
    const { data: users } = await supabase
      .from("user")
      .select("id, name, email, image")
      .in("id", userIds.length > 0 ? userIds : ["none"]);

    // Fetch ratings for context
    const { data: ratings } = await supabase
      .from("user_ratings")
      .select("user_id, skill_rating, skill_tier")
      .in("user_id", userIds.length > 0 ? userIds : ["none"]);

    const requestsWithDetails = requests.map((r) => {
      const targetId = type === "received" ? r.user_id : r.friend_id;
      const user = users?.find((u) => u.id === targetId);
      const rating = ratings?.find((rt) => rt.user_id === targetId);

      return {
        id: r.id,
        userId: targetId,
        name: user?.name || "Unknown",
        email: user?.email,
        image: user?.image,
        skillRating: rating?.skill_rating || 1000,
        skillTier: rating?.skill_tier || "Bronze",
        sentAt: r.created_at,
      };
    });

    return NextResponse.json({
      requests: requestsWithDetails,
      total: requestsWithDetails.length,
      type,
    });
  } catch (error) {
    console.error("Error in friend requests API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/friends/requests - Accept or decline friend request
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
    const { requestId, action } = body; // action: 'accept' or 'decline'

    if (!requestId || !action) {
      return NextResponse.json({ error: "Request ID and action required" }, { status: 400 });
    }

    if (!["accept", "decline"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Verify the request exists and is for this user
    const { data: friendRequest, error: fetchError } = await supabase
      .from("friendships")
      .select("*")
      .eq("id", requestId)
      .eq("friend_id", userId)
      .eq("status", "pending")
      .single();

    if (fetchError || !friendRequest) {
      return NextResponse.json({ error: "Friend request not found" }, { status: 404 });
    }

    if (action === "accept") {
      // Update to accepted
      const { error: updateError } = await supabase
        .from("friendships")
        .update({
          status: "accepted",
          accepted_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (updateError) {
        console.error("Error accepting request:", updateError);
        return NextResponse.json({ error: "Failed to accept request" }, { status: 500 });
      }

      // Notify the sender
      await supabase.rpc("create_notification", {
        p_user_id: friendRequest.user_id,
        p_type: "friend_accepted",
        p_title: "Friend Request Accepted",
        p_message: `${session.user.name || "Someone"} accepted your friend request`,
        p_data: { friendshipId: requestId },
      });

      return NextResponse.json({
        success: true,
        message: "Friend request accepted",
        status: "accepted",
      });
    } else {
      // Delete the request
      const { error: deleteError } = await supabase
        .from("friendships")
        .delete()
        .eq("id", requestId);

      if (deleteError) {
        console.error("Error declining request:", deleteError);
        return NextResponse.json({ error: "Failed to decline request" }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: "Friend request declined",
        status: "declined",
      });
    }
  } catch (error) {
    console.error("Error processing friend request:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
