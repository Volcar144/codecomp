import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// GET /api/code-templates - Get code templates/snippets
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const language = searchParams.get("language");
    const category = searchParams.get("category");
    const isStarter = searchParams.get("starter") === "true";
    const search = searchParams.get("search");

    let query = supabase
      .from("code_templates")
      .select("*")
      .order("use_count", { ascending: false });

    if (language) {
      query = query.eq("language", language);
    }
    if (category) {
      query = query.eq("category", category);
    }
    if (isStarter) {
      query = query.eq("is_starter", true);
    }
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data, error } = await query.limit(100);

    if (error) throw error;

    // Get unique categories
    const { data: categories } = await supabase
      .from("code_templates")
      .select("category")
      .not("category", "is", null);

    const uniqueCategories = [...new Set(categories?.map((c) => c.category) || [])];

    // Get available languages
    const { data: languages } = await supabase
      .from("code_templates")
      .select("language");

    const uniqueLanguages = [...new Set(languages?.map((l) => l.language) || [])];

    return NextResponse.json({
      templates: data || [],
      categories: uniqueCategories,
      languages: uniqueLanguages,
    });
  } catch (error) {
    console.error("Error fetching code templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}

// POST /api/code-templates - Create or use a code template
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const body = await request.json();
    const { action, templateId, name, language, code, description, category, tags, isStarter } = body;

    // Record template usage
    if (action === "use") {
      if (!templateId) {
        return NextResponse.json({ error: "Template ID required" }, { status: 400 });
      }

      // Increment use count
      const { data: template, error: fetchError } = await supabase
        .from("code_templates")
        .select("*")
        .eq("id", templateId)
        .single();

      if (fetchError || !template) {
        return NextResponse.json({ error: "Template not found" }, { status: 404 });
      }

      await supabase
        .from("code_templates")
        .update({ use_count: (template.use_count || 0) + 1 })
        .eq("id", templateId);

      return NextResponse.json(template);
    }

    // Create new template
    if (action === "create") {
      if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      if (!name || !language || !code) {
        return NextResponse.json(
          { error: "Name, language, and code are required" },
          { status: 400 }
        );
      }

      const { data, error } = await supabase
        .from("code_templates")
        .insert({
          name,
          language,
          code,
          description: description || null,
          category: category || "general",
          tags: tags || [],
          is_starter: isStarter || false,
          created_by: session.user.id,
        })
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json(data);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error in code templates:", error);
    return NextResponse.json(
      { error: "Failed to process template request" },
      { status: 500 }
    );
  }
}

// DELETE /api/code-templates - Delete a template
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Template ID required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("code_templates")
      .delete()
      .eq("id", id)
      .eq("created_by", session.user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting template:", error);
    return NextResponse.json(
      { error: "Failed to delete template" },
      { status: 500 }
    );
  }
}
