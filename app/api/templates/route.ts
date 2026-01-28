/**
 * Competition Templates API
 * GET - List templates (user's own + public)
 * POST - Create a new template
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { headers } from "next/headers";

interface TestCaseTemplate {
  input: string;
  expected_output: string;
  points: number;
  is_hidden: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const { searchParams } = new URL(request.url);
    const publicOnly = searchParams.get("public") === "true";

    let query = supabase
      .from("competition_templates")
      .select("*")
      .order("created_at", { ascending: false });

    if (publicOnly) {
      // Only public templates
      query = query.eq("is_public", true);
    } else if (session?.user?.id) {
      // User's own templates + public templates
      query = query.or(`creator_id.eq.${session.user.id},is_public.eq.true`);
    } else {
      // Not logged in - only public templates
      query = query.eq("is_public", true);
    }

    const { data: templates, error } = await query;

    if (error) {
      console.error("Error fetching templates:", error);
      return NextResponse.json(
        { error: "Failed to fetch templates" },
        { status: 500 }
      );
    }

    return NextResponse.json(templates || []);
  } catch (error) {
    console.error("Error in GET /api/templates:", error);
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

    const body = await request.json();
    const {
      name,
      description,
      is_public,
      template_title,
      template_description,
      template_rules,
      allowed_languages,
      default_duration_hours,
      test_cases,
    } = body;

    // Validate required fields
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Template name is required" },
        { status: 400 }
      );
    }

    // Validate test_cases structure if provided
    if (test_cases && !Array.isArray(test_cases)) {
      return NextResponse.json(
        { error: "Test cases must be an array" },
        { status: 400 }
      );
    }

    const { data: template, error } = await supabase
      .from("competition_templates")
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        creator_id: session.user.id,
        is_public: is_public ?? false,
        template_title: template_title?.trim() || null,
        template_description: template_description?.trim() || null,
        template_rules: template_rules?.trim() || null,
        allowed_languages: allowed_languages || ["python", "javascript", "java", "cpp"],
        default_duration_hours: default_duration_hours || 24,
        test_cases: test_cases || [],
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating template:", error);
      return NextResponse.json(
        { error: "Failed to create template" },
        { status: 500 }
      );
    }

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/templates:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
