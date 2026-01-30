import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET /api/cron/spectate - Clean up stale spectate sessions
// This should be run periodically via Vercel cron or external scheduler
export async function GET() {
  try {
    const STALE_THRESHOLD_MINUTES = 5;
    const staleTime = new Date();
    staleTime.setMinutes(staleTime.getMinutes() - STALE_THRESHOLD_MINUTES);

    // Remove stale spectators (not heartbeating)
    const { data: staleSpectators, error: spectatorError } = await supabase
      .from("spectators")
      .delete()
      .lt("last_heartbeat", staleTime.toISOString())
      .select();

    if (spectatorError) {
      console.error("Error cleaning up spectators:", spectatorError);
    }

    // Update spectator counts for affected duels
    if (staleSpectators && staleSpectators.length > 0) {
      const duelIds = [...new Set(staleSpectators.map((s) => s.duel_id))];

      for (const duelId of duelIds) {
        const { count } = await supabase
          .from("spectators")
          .select("*", { count: "exact", head: true })
          .eq("duel_id", duelId);

        await supabase
          .from("duels")
          .update({ spectator_count: count || 0 })
          .eq("id", duelId);
      }
    }

    // Clean up old spectator emotes (older than 1 hour)
    const emoteStaleTime = new Date();
    emoteStaleTime.setHours(emoteStaleTime.getHours() - 1);

    const { error: emoteError } = await supabase
      .from("spectator_emotes")
      .delete()
      .lt("created_at", emoteStaleTime.toISOString());

    if (emoteError) {
      console.error("Error cleaning up emotes:", emoteError);
    }

    // Update user presence - mark offline if no recent activity
    const presenceStaleTime = new Date();
    presenceStaleTime.setMinutes(presenceStaleTime.getMinutes() - 10);

    const { data: stalePresence, error: presenceError } = await supabase
      .from("user_presence")
      .update({ is_online: false })
      .lt("last_seen", presenceStaleTime.toISOString())
      .eq("is_online", true)
      .select();

    if (presenceError) {
      console.error("Error updating presence:", presenceError);
    }

    // Clean up very old presence records (older than 30 days)
    const oldPresenceTime = new Date();
    oldPresenceTime.setDate(oldPresenceTime.getDate() - 30);

    await supabase
      .from("user_presence")
      .delete()
      .lt("last_seen", oldPresenceTime.toISOString())
      .eq("is_online", false);

    return NextResponse.json({
      success: true,
      cleaned: {
        spectators: staleSpectators?.length || 0,
        presenceUpdated: stalePresence?.length || 0,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in spectate cleanup cron:", error);
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
