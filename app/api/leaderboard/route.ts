import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const competition_id = url.searchParams.get("competition_id");

    if (!competition_id) {
      return NextResponse.json({ error: "competition_id is required" }, { status: 400 });
    }

    // Query the leaderboard view
    const { data, error } = await supabase
      .from("leaderboard")
      .select("*")
      .eq("competition_id", competition_id)
      .order("rank", { ascending: true });

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
