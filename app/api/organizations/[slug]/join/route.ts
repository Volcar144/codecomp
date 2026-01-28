/**
 * Organization Join API
 * POST - Join an organization (via invite code or public)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { headers } from "next/headers";
import { use } from "react";

export async function POST(
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
    const { inviteCode } = await request.json();

    // Get organization
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id, name, is_public, invite_code, max_members")
      .eq("slug", slug)
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Check if already a member
    const { data: existingMember } = await supabase
      .from("organization_members")
      .select("id")
      .eq("organization_id", org.id)
      .eq("user_id", session.user.id)
      .single();

    if (existingMember) {
      return NextResponse.json(
        { error: "You are already a member of this organization" },
        { status: 400 }
      );
    }

    // Check if organization is public or invite code matches
    if (!org.is_public && org.invite_code !== inviteCode) {
      return NextResponse.json(
        { error: "Invalid invite code" },
        { status: 403 }
      );
    }

    // Check member limit
    const { count } = await supabase
      .from("organization_members")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", org.id);

    if (count && count >= org.max_members) {
      return NextResponse.json(
        { error: "This organization has reached its member limit" },
        { status: 400 }
      );
    }

    // Add member
    const { error: memberError } = await supabase
      .from("organization_members")
      .insert({
        organization_id: org.id,
        user_id: session.user.id,
        username: session.user.name || session.user.email,
        role: "member",
      });

    if (memberError) {
      console.error("Error joining organization:", memberError);
      return NextResponse.json(
        { error: "Failed to join organization" },
        { status: 500 }
      );
    }

    // Update stats
    await supabase.rpc("update_org_stats", { p_org_id: org.id });

    // Check achievement
    await supabase.rpc("check_achievements", {
      p_user_id: session.user.id,
      p_category: "social",
      p_metric_type: "count",
      p_metric_value: 1,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully joined ${org.name}`,
    });
  } catch (error) {
    console.error("Error in POST /api/organizations/[slug]/join:", error);
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

    // Owner cannot leave
    if (org.owner_id === session.user.id) {
      return NextResponse.json(
        { error: "Owner cannot leave the organization. Transfer ownership or delete the organization." },
        { status: 400 }
      );
    }

    // Remove member
    const { error } = await supabase
      .from("organization_members")
      .delete()
      .eq("organization_id", org.id)
      .eq("user_id", session.user.id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to leave organization" },
        { status: 500 }
      );
    }

    // Update stats
    await supabase.rpc("update_org_stats", { p_org_id: org.id });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/organizations/[slug]/join:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
