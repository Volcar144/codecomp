/**
 * Organizations API
 * GET - List organizations or search
 * POST - Create a new organization
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { headers } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const type = searchParams.get("type");
    const myOrgs = searchParams.get("my") === "true";

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    let query = supabase
      .from("organizations")
      .select(`
        id,
        name,
        slug,
        description,
        logo_url,
        type,
        is_public,
        max_members,
        created_at,
        organization_stats (
          total_members,
          avg_skill_rating,
          total_competitions_won
        )
      `)
      .eq("is_public", true)
      .order("created_at", { ascending: false });

    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    if (type) {
      query = query.eq("type", type);
    }

    const { data: organizations, error } = await query.limit(50);

    if (error) {
      console.error("Error fetching organizations:", error);
      return NextResponse.json(
        { error: "Failed to fetch organizations" },
        { status: 500 }
      );
    }

    // If user wants their organizations
    let myOrganizations = null;
    if (myOrgs && session?.user?.id) {
      const { data: memberOrgs } = await supabase
        .from("organization_members")
        .select(`
          role,
          joined_at,
          organizations (
            id,
            name,
            slug,
            description,
            type,
            organization_stats (
              total_members,
              avg_skill_rating
            )
          )
        `)
        .eq("user_id", session.user.id);

      myOrganizations = memberOrgs?.map(m => ({
        ...(m.organizations as object),
        role: m.role,
        joined_at: m.joined_at,
      }));
    }

    return NextResponse.json({
      organizations,
      myOrganizations,
    });
  } catch (error) {
    console.error("Error in GET /api/organizations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, description, type, isPublic } = await request.json();

    if (!name || name.length < 3) {
      return NextResponse.json(
        { error: "Name must be at least 3 characters" },
        { status: 400 }
      );
    }

    // Generate slug
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Check if slug exists
    const { data: existing } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", slug)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "An organization with this name already exists" },
        { status: 400 }
      );
    }

    // Generate invite code
    const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();

    // Create organization
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({
        name,
        slug,
        description,
        type: type || "team",
        is_public: isPublic !== false,
        owner_id: session.user.id,
        invite_code: inviteCode,
      })
      .select()
      .single();

    if (orgError) {
      console.error("Error creating organization:", orgError);
      return NextResponse.json(
        { error: "Failed to create organization" },
        { status: 500 }
      );
    }

    // Add creator as owner member
    await supabase.from("organization_members").insert({
      organization_id: org.id,
      user_id: session.user.id,
      username: session.user.name || session.user.email,
      role: "owner",
    });

    // Create initial stats
    await supabase.from("organization_stats").insert({
      organization_id: org.id,
      total_members: 1,
    });

    // Check achievement for creating org
    await supabase.rpc("check_achievements", {
      p_user_id: session.user.id,
      p_category: "social",
      p_metric_type: "count",
      p_metric_value: 1,
    });

    return NextResponse.json({ organization: org }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/organizations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
