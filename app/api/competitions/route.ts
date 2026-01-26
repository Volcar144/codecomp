import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, rules, start_date, end_date, allowed_languages } = body;

    // Validate required fields
    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }
    if (!start_date || !end_date) {
      return NextResponse.json({ error: "start_date and end_date are required" }, { status: 400 });
    }
    if (new Date(end_date) <= new Date(start_date)) {
      return NextResponse.json({ error: "end_date must be after start_date" }, { status: 400 });
    }
    if (!Array.isArray(allowed_languages) || allowed_languages.length === 0) {
      return NextResponse.json({ error: "allowed_languages must be a non-empty array" }, { status: 400 });
    }

    // In production, get user ID from session
    const creator_id = "user-123"; // Mock user ID

    const { data, error } = await supabase
      .from("competitions")
      .insert({
        title,
        description,
        rules,
        start_date,
        end_date,
        creator_id,
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
    const { data, error } = await supabase
      .from("competitions")
      .select("*")
      .order("created_at", { ascending: false });

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
