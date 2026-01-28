import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { trackAPIRequest } from "@/lib/api-monitoring";
import { z } from "zod";

const reportSchema = z.object({
  competition_id: z.string().uuid(),
  report_type: z.enum(["too_easy", "too_hard", "rigged", "broken_tests", "misleading", "other"]),
  description: z.string().max(1000).optional(),
});

const ratingSchema = z.object({
  competition_id: z.string().uuid(),
  quality_rating: z.number().int().min(1).max(5),
  difficulty_rating: z.number().int().min(1).max(5).optional(),
  feedback: z.string().max(500).optional(),
});

// GET /api/challenges/[id]/verify - Get challenge verification status
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const searchParams = request.nextUrl.searchParams;
  const competitionId = searchParams.get("competition_id");
  const action = searchParams.get("action") || "metadata";

  try {
    if (!competitionId) {
      const response = NextResponse.json(
        { error: "competition_id is required" },
        { status: 400 }
      );
      trackAPIRequest("/api/challenges/verify", "GET", 400, Date.now() - startTime);
      return response;
    }

    if (action === "metadata") {
      // Get challenge metadata and verification status
      const { data, error } = await supabase
        .from("challenge_metadata")
        .select("*")
        .eq("competition_id", competitionId)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (!data) {
        const response = NextResponse.json({
          competition_id: competitionId,
          verification_status: "untracked",
          message: "No metrics collected yet",
        });
        trackAPIRequest("/api/challenges/verify", "GET", 200, Date.now() - startTime);
        return response;
      }

      const response = NextResponse.json(data);
      trackAPIRequest("/api/challenges/verify", "GET", 200, Date.now() - startTime);
      return response;
    }

    if (action === "ratings") {
      // Get challenge ratings summary
      const { data: ratings, error } = await supabase
        .from("challenge_ratings")
        .select("quality_rating, difficulty_rating")
        .eq("competition_id", competitionId);

      if (error) throw error;

      const totalRatings = ratings?.length || 0;
      const avgQuality =
        totalRatings > 0
          ? ratings!.reduce((sum, r) => sum + r.quality_rating, 0) / totalRatings
          : 0;
      const avgDifficulty =
        totalRatings > 0
          ? ratings!.filter(r => r.difficulty_rating).reduce((sum, r) => sum + (r.difficulty_rating || 0), 0) /
            ratings!.filter(r => r.difficulty_rating).length
          : null;

      const response = NextResponse.json({
        competition_id: competitionId,
        total_ratings: totalRatings,
        average_quality: avgQuality.toFixed(2),
        average_difficulty: avgDifficulty?.toFixed(2) || null,
        distribution: {
          quality: {
            1: ratings?.filter(r => r.quality_rating === 1).length || 0,
            2: ratings?.filter(r => r.quality_rating === 2).length || 0,
            3: ratings?.filter(r => r.quality_rating === 3).length || 0,
            4: ratings?.filter(r => r.quality_rating === 4).length || 0,
            5: ratings?.filter(r => r.quality_rating === 5).length || 0,
          },
        },
      });
      trackAPIRequest("/api/challenges/verify", "GET", 200, Date.now() - startTime);
      return response;
    }

    const response = NextResponse.json({ error: "Invalid action" }, { status: 400 });
    trackAPIRequest("/api/challenges/verify", "GET", 400, Date.now() - startTime);
    return response;
  } catch (error) {
    console.error("Error fetching challenge verification:", error);
    const response = NextResponse.json(
      { error: "Failed to fetch verification data" },
      { status: 500 }
    );
    trackAPIRequest("/api/challenges/verify", "GET", 500, Date.now() - startTime);
    return response;
  }
}

// POST /api/challenges/verify - Report or rate a challenge
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      trackAPIRequest("/api/challenges/verify", "POST", 401, Date.now() - startTime);
      return response;
    }

    const body = await request.json();
    const { action } = body;

    if (action === "report") {
      const validation = reportSchema.safeParse(body);
      if (!validation.success) {
        const response = NextResponse.json(
          { error: "Invalid input", details: validation.error.issues },
          { status: 400 }
        );
        trackAPIRequest("/api/challenges/verify", "POST", 400, Date.now() - startTime);
        return response;
      }

      const { competition_id, report_type, description } = validation.data;

      // Check if user has already reported this challenge
      const { data: existing } = await supabase
        .from("challenge_reports")
        .select("id")
        .eq("competition_id", competition_id)
        .eq("reporter_id", session.user.id)
        .single();

      if (existing) {
        const response = NextResponse.json(
          { error: "You have already reported this challenge" },
          { status: 400 }
        );
        trackAPIRequest("/api/challenges/verify", "POST", 400, Date.now() - startTime);
        return response;
      }

      // Create report
      const { data, error } = await supabase
        .from("challenge_reports")
        .insert({
          competition_id,
          reporter_id: session.user.id,
          report_type,
          description,
        })
        .select()
        .single();

      if (error) throw error;

      // Update report count in metadata
      await supabase.rpc("increment_report_count", {
        p_competition_id: competition_id,
      });

      // Check if challenge should be flagged
      await supabase.rpc("check_challenge_suspicious", {
        p_competition_id: competition_id,
      });

      const response = NextResponse.json({
        message: "Report submitted successfully",
        report: data,
      });
      trackAPIRequest("/api/challenges/verify", "POST", 200, Date.now() - startTime);
      return response;
    }

    if (action === "rate") {
      const validation = ratingSchema.safeParse(body);
      if (!validation.success) {
        const response = NextResponse.json(
          { error: "Invalid input", details: validation.error.issues },
          { status: 400 }
        );
        trackAPIRequest("/api/challenges/verify", "POST", 400, Date.now() - startTime);
        return response;
      }

      const { competition_id, quality_rating, difficulty_rating, feedback } = validation.data;

      // Check if user participated in this competition
      const { data: submission } = await supabase
        .from("submissions")
        .select("id")
        .eq("competition_id", competition_id)
        .eq("user_id", session.user.id)
        .limit(1)
        .single();

      if (!submission) {
        const response = NextResponse.json(
          { error: "You must participate in the competition to rate it" },
          { status: 403 }
        );
        trackAPIRequest("/api/challenges/verify", "POST", 403, Date.now() - startTime);
        return response;
      }

      // Upsert rating
      const { data, error } = await supabase
        .from("challenge_ratings")
        .upsert(
          {
            competition_id,
            user_id: session.user.id,
            quality_rating,
            difficulty_rating,
            feedback,
          },
          { onConflict: "competition_id,user_id" }
        )
        .select()
        .single();

      if (error) throw error;

      // Update average rating in metadata
      const { data: allRatings } = await supabase
        .from("challenge_ratings")
        .select("quality_rating")
        .eq("competition_id", competition_id);

      const totalRatings = allRatings?.length || 0;
      const avgRating =
        totalRatings > 0
          ? allRatings!.reduce((sum, r) => sum + r.quality_rating, 0) / totalRatings
          : 0;

      await supabase
        .from("challenge_metadata")
        .upsert(
          {
            competition_id,
            quality_score: avgRating,
            total_ratings: totalRatings,
          },
          { onConflict: "competition_id" }
        );

      const response = NextResponse.json({
        message: "Rating submitted successfully",
        rating: data,
      });
      trackAPIRequest("/api/challenges/verify", "POST", 200, Date.now() - startTime);
      return response;
    }

    const response = NextResponse.json({ error: "Invalid action" }, { status: 400 });
    trackAPIRequest("/api/challenges/verify", "POST", 400, Date.now() - startTime);
    return response;
  } catch (error) {
    console.error("Error in challenge verify API:", error);
    const response = NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
    trackAPIRequest("/api/challenges/verify", "POST", 500, Date.now() - startTime);
    return response;
  }
}
