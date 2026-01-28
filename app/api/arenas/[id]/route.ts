/**
 * Individual Arena API Routes
 * Handles operations for a specific arena
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { headers } from "next/headers";
import crypto from "crypto";

// Generate a unique invite code
function generateInviteCode(): string {
  return crypto.randomBytes(6).toString("hex").toUpperCase();
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: arena, error } = await supabase
      .from("arenas")
      .select(`
        *,
        arena_participants(
          id,
          user_id,
          github_username,
          directory_path,
          joined_at
        ),
        arena_judges(
          id,
          user_id,
          added_at
        )
      `)
      .eq("id", id)
      .single();

    if (error || !arena) {
      return NextResponse.json({ error: "Arena not found" }, { status: 404 });
    }

    // Check access permissions
    const isCreator = arena.creator_id === session.user.id;
    const isParticipant = arena.arena_participants?.some(
      (p: { user_id: string }) => p.user_id === session.user.id
    );
    const isJudge = arena.arena_judges?.some(
      (j: { user_id: string }) => j.user_id === session.user.id
    );

    if (!arena.is_public && !isCreator && !isParticipant && !isJudge) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json({ arena, isCreator, isParticipant, isJudge });
  } catch (error) {
    console.error("Error in GET /api/arenas/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify ownership
    const { data: existing } = await supabase
      .from("arenas")
      .select("creator_id")
      .eq("id", id)
      .single();

    if (!existing || existing.creator_id !== session.user.id) {
      return NextResponse.json(
        { error: "Not authorized to update this arena" },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // Handle invite code regeneration
    if (body.regenerate_invite_code === true) {
      const newInviteCode = generateInviteCode();
      const { data: arena, error } = await supabase
        .from("arenas")
        .update({ 
          invite_code: newInviteCode,
          updated_at: new Date().toISOString()
        })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Error regenerating invite code:", error);
        return NextResponse.json(
          { error: "Failed to regenerate invite code" },
          { status: 500 }
        );
      }

      return NextResponse.json({ arena, invite_code: newInviteCode });
    }
    
    const allowedFields = [
      "title",
      "description",
      "github_repo",
      "start_date",
      "end_date",
      "judging_criteria",
      "max_participants",
      "is_public",
      "invite_code",
      "status",
    ];

    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    updates.updated_at = new Date().toISOString();

    const { data: arena, error } = await supabase
      .from("arenas")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating arena:", error);
      return NextResponse.json(
        { error: "Failed to update arena" },
        { status: 500 }
      );
    }

    return NextResponse.json({ arena });
  } catch (error) {
    console.error("Error in PATCH /api/arenas/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify ownership
    const { data: existing } = await supabase
      .from("arenas")
      .select("creator_id, status")
      .eq("id", id)
      .single();

    if (!existing || existing.creator_id !== session.user.id) {
      return NextResponse.json(
        { error: "Not authorized to delete this arena" },
        { status: 403 }
      );
    }

    // Don't allow deleting active arenas
    if (existing.status === "active") {
      return NextResponse.json(
        { error: "Cannot delete an active arena. End it first." },
        { status: 400 }
      );
    }

    const { error } = await supabase.from("arenas").delete().eq("id", id);

    if (error) {
      console.error("Error deleting arena:", error);
      return NextResponse.json(
        { error: "Failed to delete arena" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/arenas/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
