/**
 * Single Competition API Routes
 * GET, PUT, DELETE for individual competitions
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { headers } from "next/headers";
import crypto from "crypto";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Generate a unique invite code
function generateInviteCode(): string {
  return crypto.randomBytes(6).toString("hex").toUpperCase();
}

/**
 * GET - Fetch a single competition
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: competitionId } = await params;

    const { data: competition, error } = await supabase
      .from("competitions")
      .select("*")
      .eq("id", competitionId)
      .single();

    if (error || !competition) {
      return NextResponse.json(
        { error: "Competition not found" },
        { status: 404 }
      );
    }

    // Get prizes for this competition
    const { data: prizes } = await supabase
      .from("prizes")
      .select("*")
      .eq("competition_id", competitionId)
      .order("rank", { ascending: true });

    return NextResponse.json({
      ...competition,
      prizes: prizes || [],
    });
  } catch (error) {
    console.error("Error in GET /api/competitions/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update a competition
 * Only the creator can update
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: competitionId } = await params;

    // Get authenticated session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is the creator
    const { data: competition } = await supabase
      .from("competitions")
      .select("creator_id")
      .eq("id", competitionId)
      .single();

    if (!competition || competition.creator_id !== session.user.id) {
      return NextResponse.json(
        { error: "Only the competition creator can update this competition" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, description, rules, start_date, end_date, allowed_languages, status, is_public, regenerate_invite_code } = body;

    // Handle invite code regeneration
    if (regenerate_invite_code === true) {
      const newInviteCode = generateInviteCode();
      const { data: updated, error } = await supabase
        .from("competitions")
        .update({ 
          invite_code: newInviteCode,
          updated_at: new Date().toISOString()
        })
        .eq("id", competitionId)
        .select()
        .single();

      if (error) {
        console.error("Error regenerating invite code:", error);
        return NextResponse.json(
          { error: "Failed to regenerate invite code" },
          { status: 500 }
        );
      }

      return NextResponse.json({ ...updated, invite_code: newInviteCode });
    }

    // Build update object (only include provided fields)
    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description?.trim() || null;
    if (rules !== undefined) updates.rules = rules?.trim() || null;
    if (start_date !== undefined) updates.start_date = start_date;
    if (end_date !== undefined) updates.end_date = end_date;
    if (allowed_languages !== undefined) updates.allowed_languages = allowed_languages;
    if (status !== undefined) updates.status = status;
    if (is_public !== undefined) {
      updates.is_public = is_public;
      // Generate invite code when making private, clear when making public
      if (is_public === false) {
        // Fetch current competition to check if it already has an invite code
        const { data: current } = await supabase
          .from("competitions")
          .select("invite_code")
          .eq("id", competitionId)
          .single();
        
        if (!current?.invite_code) {
          updates.invite_code = generateInviteCode();
        }
      } else {
        updates.invite_code = null;
      }
    }

    const { data: updated, error } = await supabase
      .from("competitions")
      .update(updates)
      .eq("id", competitionId)
      .select()
      .single();

    if (error) {
      console.error("Error updating competition:", error);
      return NextResponse.json(
        { error: "Failed to update competition" },
        { status: 500 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error in PUT /api/competitions/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete a competition
 * Only the creator can delete
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: competitionId } = await params;

    // Get authenticated session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is the creator
    const { data: competition } = await supabase
      .from("competitions")
      .select("creator_id")
      .eq("id", competitionId)
      .single();

    if (!competition || competition.creator_id !== session.user.id) {
      return NextResponse.json(
        { error: "Only the competition creator can delete this competition" },
        { status: 403 }
      );
    }

    // Delete competition (cascades to test_cases, submissions, etc.)
    const { error } = await supabase
      .from("competitions")
      .delete()
      .eq("id", competitionId);

    if (error) {
      console.error("Error deleting competition:", error);
      return NextResponse.json(
        { error: "Failed to delete competition" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/competitions/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
