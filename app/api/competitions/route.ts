import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    // Get authenticated session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized. Please sign in to create a competition." }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, rules, start_date, end_date, allowed_languages } = body;

    // Validate required fields
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    if (title.length > 200) {
      return NextResponse.json({ error: "Title must be less than 200 characters" }, { status: 400 });
    }
    if (!start_date || !end_date) {
      return NextResponse.json({ error: "Start date and end date are required" }, { status: 400 });
    }
    if (new Date(end_date) <= new Date(start_date)) {
      return NextResponse.json({ error: "End date must be after start date" }, { status: 400 });
    }
    if (new Date(start_date) < new Date()) {
      return NextResponse.json({ error: "Start date cannot be in the past" }, { status: 400 });
    }
    if (!Array.isArray(allowed_languages) || allowed_languages.length === 0) {
      return NextResponse.json({ error: "At least one programming language must be selected" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("competitions")
      .insert({
        title: title.trim(),
        description: description?.trim() || null,
        rules: rules?.trim() || null,
        start_date,
        end_date,
        creator_id: session.user.id,
        allowed_languages,
        status: "draft",
      })
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json({ error: "Failed to create competition" }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabase
      .from("competitions")
      .select("*")
      .neq("status", "draft") // Don't show drafts in public list
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by status if provided
    if (status && ["active", "upcoming", "ended"].includes(status)) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json({ error: "Failed to fetch competitions" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
