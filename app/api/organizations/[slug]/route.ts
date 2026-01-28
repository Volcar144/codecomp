/**
 * Organization Detail API
 * GET - Get organization details
 * PUT - Update organization
 * DELETE - Delete organization
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { headers } from "next/headers";
import { use } from "react";

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ slug: string }> }
) {
  try {
    const params = use(props.params);
    const { slug } = params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    // Get organization
    const { data: org, error } = await supabase
      .from("organizations")
      .select(`
        *,
        organization_stats (
          total_members,
          avg_skill_rating,
          total_competitions_won,
          total_submissions
        )
      `)
      .eq("slug", slug)
      .single();

    if (error || !org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Check if user is a member
    let membership = null;
    if (session?.user?.id) {
      const { data: member } = await supabase
        .from("organization_members")
        .select("role, joined_at")
        .eq("organization_id", org.id)
        .eq("user_id", session.user.id)
        .single();
      membership = member;
    }

    // If not public and not a member, deny access
    if (!org.is_public && !membership) {
      return NextResponse.json(
        { error: "This organization is private" },
        { status: 403 }
      );
    }

    // Get members
    const { data: members } = await supabase
      .from("organization_members")
      .select("user_id, username, role, joined_at")
      .eq("organization_id", org.id)
      .order("joined_at", { ascending: true });

    // Get recent competitions
    const { data: competitions } = await supabase
      .from("organization_competitions")
      .select(`
        competition_id,
        is_team_event,
        competitions (
          id,
          title,
          status,
          start_date,
          end_date
        )
      `)
      .eq("organization_id", org.id)
      .limit(10);

    return NextResponse.json({
      organization: org,
      membership,
      members: members || [],
      competitions: competitions || [],
      isOwner: org.owner_id === session?.user?.id,
    });
  } catch (error) {
    console.error("Error in GET /api/organizations/[slug]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = use(props.params);
    const { slug } = params;
    const updates = await request.json();

    // Get organization and check ownership
    const { data: org } = await supabase
      .from("organizations")
      .select("id, owner_id")
      .eq("slug", slug)
      .single();

    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Check if user is owner or admin
    const { data: membership } = await supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", org.id)
      .eq("user_id", session.user.id)
      .single();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return NextResponse.json(
        { error: "Only owners and admins can update the organization" },
        { status: 403 }
      );
    }

    // Update organization
    const { data: updated, error } = await supabase
      .from("organizations")
      .update({
        name: updates.name,
        description: updates.description,
        logo_url: updates.logoUrl,
        website: updates.website,
        is_public: updates.isPublic,
        updated_at: new Date().toISOString(),
      })
      .eq("id", org.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to update organization" },
        { status: 500 }
      );
    }

    return NextResponse.json({ organization: updated });
  } catch (error) {
    console.error("Error in PUT /api/organizations/[slug]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = use(props.params);
    const { slug } = params;

    // Get organization
    const { data: org } = await supabase
      .from("organizations")
      .select("id, owner_id")
      .eq("slug", slug)
      .single();

    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Only owner can delete
    if (org.owner_id !== session.user.id) {
      return NextResponse.json(
        { error: "Only the owner can delete the organization" },
        { status: 403 }
      );
    }

    // Delete organization (cascades to members and stats)
    const { error } = await supabase
      .from("organizations")
      .delete()
      .eq("id", org.id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to delete organization" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/organizations/[slug]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
