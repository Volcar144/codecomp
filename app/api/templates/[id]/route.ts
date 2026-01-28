/**
 * Single Template API Routes
 * GET - Get template details
 * PUT - Update template
 * DELETE - Delete template
 * POST - Use template to create a competition
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { headers } from "next/headers";
import crypto from "crypto";

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

    const { data: template, error } = await supabase
      .from("competition_templates")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // Check access - must be owner or public template
    if (!template.is_public && template.creator_id !== session?.user?.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error("Error in GET /api/templates/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check ownership
    const { data: existing } = await supabase
      .from("competition_templates")
      .select("creator_id")
      .eq("id", id)
      .single();

    if (!existing || existing.creator_id !== session.user.id) {
      return NextResponse.json(
        { error: "Not authorized to update this template" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const allowedFields = [
      "name",
      "description",
      "is_public",
      "template_title",
      "template_description",
      "template_rules",
      "allowed_languages",
      "default_duration_hours",
      "test_cases",
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

    const { data: template, error } = await supabase
      .from("competition_templates")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating template:", error);
      return NextResponse.json(
        { error: "Failed to update template" },
        { status: 500 }
      );
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error("Error in PUT /api/templates/[id]:", error);
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

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check ownership
    const { data: existing } = await supabase
      .from("competition_templates")
      .select("creator_id")
      .eq("id", id)
      .single();

    if (!existing || existing.creator_id !== session.user.id) {
      return NextResponse.json(
        { error: "Not authorized to delete this template" },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from("competition_templates")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting template:", error);
      return NextResponse.json(
        { error: "Failed to delete template" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/templates/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a competition from this template
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch template
    const { data: template, error: templateError } = await supabase
      .from("competition_templates")
      .select("*")
      .eq("id", id)
      .single();

    if (templateError || !template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // Check access
    if (!template.is_public && template.creator_id !== session.user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await request.json();
    const { title, start_date, end_date, is_public } = body;

    // Validate required fields for competition
    if (!title || typeof title !== "string") {
      return NextResponse.json(
        { error: "Competition title is required" },
        { status: 400 }
      );
    }

    if (!start_date || !end_date) {
      return NextResponse.json(
        { error: "Start and end dates are required" },
        { status: 400 }
      );
    }

    // Create competition from template
    const { data: competition, error: compError } = await supabase
      .from("competitions")
      .insert({
        title: title.trim(),
        description: template.template_description || body.description || null,
        rules: template.template_rules || body.rules || null,
        start_date,
        end_date,
        creator_id: session.user.id,
        allowed_languages: template.allowed_languages,
        is_public: is_public ?? true,
        invite_code: is_public === false ? generateInviteCode() : null,
        status: "draft",
      })
      .select()
      .single();

    if (compError) {
      console.error("Error creating competition from template:", compError);
      return NextResponse.json(
        { error: "Failed to create competition" },
        { status: 500 }
      );
    }

    // Create test cases from template
    const templateTestCases = template.test_cases || [];
    if (templateTestCases.length > 0) {
      const testCasesToInsert = templateTestCases.map((tc: {
        input: string;
        expected_output: string;
        points?: number;
        is_hidden?: boolean;
      }) => ({
        competition_id: competition.id,
        input: tc.input,
        expected_output: tc.expected_output,
        points: tc.points || 10,
        is_hidden: tc.is_hidden || false,
      }));

      const { error: tcError } = await supabase
        .from("test_cases")
        .insert(testCasesToInsert);

      if (tcError) {
        console.error("Error creating test cases:", tcError);
        // Don't fail the whole operation, just log it
      }
    }

    // Increment template use count
    await supabase
      .from("competition_templates")
      .update({ use_count: (template.use_count || 0) + 1 })
      .eq("id", id);

    return NextResponse.json(
      { 
        competition,
        testCasesCreated: templateTestCases.length,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in POST /api/templates/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
