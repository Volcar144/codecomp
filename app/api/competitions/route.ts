import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, rules, start_date, end_date, allowed_languages } = body;

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
