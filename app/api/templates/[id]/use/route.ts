/**
 * Template Use Tracking API
 * POST - Increment use count for a template
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Increment the use count using Supabase's RPC or raw SQL
    const { error } = await supabase.rpc("increment_template_use_count", {
      template_id: id,
    });

    // If RPC doesn't exist, fall back to a simple update
    if (error) {
      // Try direct update instead
      const { data: template } = await supabase
        .from("competition_templates")
        .select("use_count")
        .eq("id", id)
        .single();

      if (template) {
        await supabase
          .from("competition_templates")
          .update({ use_count: (template.use_count || 0) + 1 })
          .eq("id", id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error incrementing template use count:", error);
    // Don't fail - this is just tracking
    return NextResponse.json({ success: true });
  }
}
