/**
 * Spectate Session API
 * GET - Get session details with chat/emotes
 * POST - Join as spectator, send emote, or chat
 * DELETE - Leave session
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { headers } from "next/headers";
import { use } from "react";

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = use(props.params);
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const since = searchParams.get("since"); // For polling new messages

    // Get session
    const { data: session, error: sessionError } = await supabase
      .from("spectate_sessions")
      .select(`
        *,
        duels (
          id,
          player1_id,
          player2_id,
          player1_score,
          player2_score,
          language,
          status,
          started_at,
          time_limit_seconds,
          duel_challenges (
            title,
            description,
            difficulty,
            test_cases
          )
        )
      `)
      .eq("id", id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Get spectators
    const { data: spectators } = await supabase
      .from("spectators")
      .select("user_id, username, joined_at")
      .eq("session_id", id)
      .is("left_at", null);

    // Get recent chat messages
    let chatQuery = supabase
      .from("spectate_chat")
      .select("*")
      .eq("session_id", id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (since) {
      chatQuery = chatQuery.gt("created_at", since);
    }

    const { data: chat } = await chatQuery;

    // Get recent emotes (last 10 seconds for real-time feel)
    const tenSecondsAgo = new Date(Date.now() - 10000).toISOString();
    const { data: emotes } = await supabase
      .from("spectate_emotes")
      .select("emote, user_id, timestamp")
      .eq("session_id", id)
      .gt("timestamp", tenSecondsAgo);

    // Get duel submissions if available
    let submissions = null;
    if (session.duel_id) {
      const { data: duelSubmissions } = await supabase
        .from("duel_submissions")
        .select("user_id, passed_tests, total_tests, submitted_at")
        .eq("duel_id", session.duel_id)
        .order("submitted_at", { ascending: false });
      submissions = duelSubmissions;
    }

    return NextResponse.json({
      session,
      spectators: spectators || [],
      chat: (chat || []).reverse(),
      emotes: emotes || [],
      submissions,
    });
  } catch (error) {
    console.error("Error in GET /api/spectate/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const authSession = await auth.api.getSession({
      headers: await headers(),
    });

    const params = use(props.params);
    const { id } = params;
    const { action, emote, message } = await request.json();

    const userId = authSession?.user?.id || `anon-${Math.random().toString(36).slice(2)}`;
    const username = authSession?.user?.name || authSession?.user?.email || "Anonymous";

    // Verify session exists
    const { data: session } = await supabase
      .from("spectate_sessions")
      .select("id, is_live")
      .eq("id", id)
      .single();

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    switch (action) {
      case "join":
        // Add spectator
        await supabase
          .from("spectators")
          .upsert({
            session_id: id,
            user_id: userId,
            username,
            joined_at: new Date().toISOString(),
            left_at: null,
          }, { onConflict: "session_id,user_id" });

        // Update viewer count by counting active viewers
        const { count } = await supabase
          .from("spectate_viewers")
          .select("*", { count: "exact", head: true })
          .eq("session_id", id)
          .is("left_at", null);

        await supabase
          .from("spectate_sessions")
          .update({ viewer_count: count || 0 })
          .eq("id", id);

        // Check achievement
        if (authSession?.user?.id) {
          await supabase.rpc("check_achievements", {
            p_user_id: authSession.user.id,
            p_category: "social",
            p_metric_type: "count",
            p_metric_value: 1,
          });
        }

        return NextResponse.json({ success: true, action: "joined" });

      case "emote":
        if (!emote) {
          return NextResponse.json(
            { error: "Emote is required" },
            { status: 400 }
          );
        }

        // Valid emotes
        const validEmotes = ["👏", "🔥", "😮", "🎉", "🤔", "😢", "💪", "⚡", "❤️", "👀"];
        if (!validEmotes.includes(emote)) {
          return NextResponse.json(
            { error: "Invalid emote" },
            { status: 400 }
          );
        }

        await supabase.from("spectate_emotes").insert({
          session_id: id,
          user_id: userId,
          emote,
        });

        // Track emote count for achievements
        if (authSession?.user?.id) {
          const { count } = await supabase
            .from("spectate_emotes")
            .select("*", { count: "exact", head: true })
            .eq("user_id", authSession.user.id);

          if (count) {
            await supabase.rpc("check_achievements", {
              p_user_id: authSession.user.id,
              p_category: "social",
              p_metric_type: "count",
              p_metric_value: count,
            });
          }
        }

        return NextResponse.json({ success: true, action: "emote_sent" });

      case "chat":
        if (!message || message.length > 500) {
          return NextResponse.json(
            { error: "Invalid message" },
            { status: 400 }
          );
        }

        const { data: chatMessage } = await supabase
          .from("spectate_chat")
          .insert({
            session_id: id,
            user_id: userId,
            username,
            message: message.trim(),
          })
          .select()
          .single();

        return NextResponse.json({ success: true, message: chatMessage });

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error in POST /api/spectate/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const authSession = await auth.api.getSession({
      headers: await headers(),
    });

    const params = use(props.params);
    const { id } = params;

    const userId = authSession?.user?.id;
    if (!userId) {
      return NextResponse.json({ success: true }); // Anonymous users don't need cleanup
    }

    // Mark spectator as left
    await supabase
      .from("spectate_viewers")
      .update({ left_at: new Date().toISOString() })
      .eq("session_id", id)
      .eq("user_id", userId);

    // Update viewer count
    const { count } = await supabase
      .from("spectate_viewers")
      .select("*", { count: "exact", head: true })
      .eq("session_id", id)
      .is("left_at", null);

    await supabase
      .from("spectate_sessions")
      .update({ viewer_count: count || 0 })
      .eq("id", id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/spectate/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
