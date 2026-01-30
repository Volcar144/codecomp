import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// GET /api/invites - Get user's invites or invite details
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const type = searchParams.get("type"); // competition or arena
    const targetId = searchParams.get("targetId");

    // Get invite by code
    if (code) {
      // Try competition invite
      let { data: compInvite, error: compError } = await supabase
        .from("competition_invites")
        .select(`
          *,
          competition:competitions(id, title, description, start_time, end_time)
        `)
        .eq("code", code)
        .single();

      if (!compError && compInvite) {
        // Check if invite is valid
        const now = new Date();
        if (compInvite.expires_at && new Date(compInvite.expires_at) < now) {
          return NextResponse.json({ error: "Invite has expired" }, { status: 410 });
        }
        if (compInvite.max_uses && compInvite.uses >= compInvite.max_uses) {
          return NextResponse.json({ error: "Invite has reached max uses" }, { status: 410 });
        }
        return NextResponse.json({ type: "competition", invite: compInvite });
      }

      // Try arena invite
      let { data: arenaInvite, error: arenaError } = await supabase
        .from("arena_invites")
        .select(`
          *,
          arena:arenas(id, name, description, difficulty)
        `)
        .eq("code", code)
        .single();

      if (!arenaError && arenaInvite) {
        const now = new Date();
        if (arenaInvite.expires_at && new Date(arenaInvite.expires_at) < now) {
          return NextResponse.json({ error: "Invite has expired" }, { status: 410 });
        }
        if (arenaInvite.max_uses && arenaInvite.uses >= arenaInvite.max_uses) {
          return NextResponse.json({ error: "Invite has reached max uses" }, { status: 410 });
        }
        return NextResponse.json({ type: "arena", invite: arenaInvite });
      }

      return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
    }

    // Get invites for a competition/arena
    if (type && targetId) {
      const session = await auth.api.getSession({ headers: await headers() });
      if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const table = type === "competition" ? "competition_invites" : "arena_invites";
      const foreignKey = type === "competition" ? "competition_id" : "arena_id";

      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq(foreignKey, targetId)
        .eq("created_by", session.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return NextResponse.json({ invites: data || [] });
    }

    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  } catch (error) {
    console.error("Error fetching invites:", error);
    return NextResponse.json(
      { error: "Failed to fetch invites" },
      { status: 500 }
    );
  }
}

// POST /api/invites - Create an invite
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { type, targetId, maxUses, expiresInDays, role } = body;

    if (!type || !targetId) {
      return NextResponse.json({ error: "Type and targetId are required" }, { status: 400 });
    }

    // Verify user has permission to create invites
    if (type === "competition") {
      const { data: competition, error } = await supabase
        .from("competitions")
        .select("creator_id")
        .eq("id", targetId)
        .single();

      if (error || !competition || competition.creator_id !== session.user.id) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }

      // Create competition invite
      const code = generateInviteCode();
      const expiresAt = expiresInDays
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
        : null;

      const { data, error: insertError } = await supabase
        .from("competition_invites")
        .insert({
          competition_id: targetId,
          code,
          created_by: session.user.id,
          max_uses: maxUses || null,
          expires_at: expiresAt,
          role: role || "participant",
        })
        .select()
        .single();

      if (insertError) throw insertError;

      return NextResponse.json(data);
    }

    if (type === "arena") {
      const { data: arena, error } = await supabase
        .from("arenas")
        .select("created_by")
        .eq("id", targetId)
        .single();

      if (error || !arena || arena.created_by !== session.user.id) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }

      // Create arena invite
      const code = generateInviteCode();
      const expiresAt = expiresInDays
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
        : null;

      const { data, error: insertError } = await supabase
        .from("arena_invites")
        .insert({
          arena_id: targetId,
          code,
          created_by: session.user.id,
          max_uses: maxUses || null,
          expires_at: expiresAt,
          role: role || "participant",
        })
        .select()
        .single();

      if (insertError) throw insertError;

      return NextResponse.json(data);
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error) {
    console.error("Error creating invite:", error);
    return NextResponse.json(
      { error: "Failed to create invite" },
      { status: 500 }
    );
  }
}

// DELETE /api/invites - Delete an invite
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const id = searchParams.get("id");

    if (!type || !id) {
      return NextResponse.json({ error: "Type and ID required" }, { status: 400 });
    }

    const table = type === "competition" ? "competition_invites" : "arena_invites";

    const { error } = await supabase
      .from(table)
      .delete()
      .eq("id", id)
      .eq("created_by", session.user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting invite:", error);
    return NextResponse.json(
      { error: "Failed to delete invite" },
      { status: 500 }
    );
  }
}

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
