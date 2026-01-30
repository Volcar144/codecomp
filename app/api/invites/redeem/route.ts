import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// POST /api/invites/redeem - Redeem an invite code
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json({ error: "Invite code required" }, { status: 400 });
    }

    // Try competition invite first
    let { data: compInvite, error: compError } = await supabase
      .from("competition_invites")
      .select(`
        *,
        competition:competitions(id, title)
      `)
      .eq("code", code.toUpperCase())
      .single();

    if (!compError && compInvite) {
      // Validate invite
      const now = new Date();
      if (compInvite.expires_at && new Date(compInvite.expires_at) < now) {
        return NextResponse.json({ error: "Invite has expired" }, { status: 410 });
      }
      if (compInvite.max_uses && compInvite.uses >= compInvite.max_uses) {
        return NextResponse.json({ error: "Invite has reached max uses" }, { status: 410 });
      }

      // Check if user already redeemed
      const { data: existingRedemption } = await supabase
        .from("invite_redemptions")
        .select("id")
        .eq("competition_invite_id", compInvite.id)
        .eq("user_id", session.user.id)
        .single();

      if (existingRedemption) {
        return NextResponse.json({ 
          error: "You have already redeemed this invite",
          competition: compInvite.competition
        }, { status: 400 });
      }

      // Record redemption
      const { error: redemptionError } = await supabase
        .from("invite_redemptions")
        .insert({
          competition_invite_id: compInvite.id,
          user_id: session.user.id,
        });

      if (redemptionError) throw redemptionError;

      // Increment uses
      await supabase
        .from("competition_invites")
        .update({ uses: compInvite.uses + 1 })
        .eq("id", compInvite.id);

      // If role is judge, add to judges table
      if (compInvite.role === "judge") {
        await supabase
          .from("judges")
          .upsert({
            competition_id: compInvite.competition_id,
            user_id: session.user.id,
          });
      }

      return NextResponse.json({
        success: true,
        type: "competition",
        role: compInvite.role,
        competition: compInvite.competition,
        redirectUrl: `/competitions/${compInvite.competition_id}`,
      });
    }

    // Try arena invite
    let { data: arenaInvite, error: arenaError } = await supabase
      .from("arena_invites")
      .select(`
        *,
        arena:arenas(id, name)
      `)
      .eq("code", code.toUpperCase())
      .single();

    if (!arenaError && arenaInvite) {
      // Validate invite
      const now = new Date();
      if (arenaInvite.expires_at && new Date(arenaInvite.expires_at) < now) {
        return NextResponse.json({ error: "Invite has expired" }, { status: 410 });
      }
      if (arenaInvite.max_uses && arenaInvite.uses >= arenaInvite.max_uses) {
        return NextResponse.json({ error: "Invite has reached max uses" }, { status: 410 });
      }

      // Check if user already redeemed
      const { data: existingRedemption } = await supabase
        .from("invite_redemptions")
        .select("id")
        .eq("arena_invite_id", arenaInvite.id)
        .eq("user_id", session.user.id)
        .single();

      if (existingRedemption) {
        return NextResponse.json({ 
          error: "You have already redeemed this invite",
          arena: arenaInvite.arena
        }, { status: 400 });
      }

      // Record redemption
      const { error: redemptionError } = await supabase
        .from("invite_redemptions")
        .insert({
          arena_invite_id: arenaInvite.id,
          user_id: session.user.id,
        });

      if (redemptionError) throw redemptionError;

      // Increment uses
      await supabase
        .from("arena_invites")
        .update({ uses: arenaInvite.uses + 1 })
        .eq("id", arenaInvite.id);

      // Join arena
      await supabase
        .from("arena_participants")
        .upsert({
          arena_id: arenaInvite.arena_id,
          user_id: session.user.id,
          role: arenaInvite.role || "participant",
        });

      return NextResponse.json({
        success: true,
        type: "arena",
        role: arenaInvite.role,
        arena: arenaInvite.arena,
        redirectUrl: `/arenas/${arenaInvite.arena_id}`,
      });
    }

    return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
  } catch (error) {
    console.error("Error redeeming invite:", error);
    return NextResponse.json(
      { error: "Failed to redeem invite" },
      { status: 500 }
    );
  }
}
