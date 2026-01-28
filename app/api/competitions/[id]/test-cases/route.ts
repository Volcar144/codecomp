/**
 * Test Cases API Routes
 * CRUD operations for test cases in competitions
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { headers } from "next/headers";

interface RouteParams {
  params: Promise<{ id: string }>;
}
/**
 * GET - Fetch test cases for a competition
 * Returns all test cases if user is the creator, otherwise only visible ones
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: competitionId } = await params;

    // Get session (optional)
    let userId: string | null = null;
    try {
      const session = await auth.api.getSession({
        headers: await headers(),
      });
      userId = session?.user?.id || null;
    } catch {
      // User not authenticated
    }

    // Check if user is the competition creator
    const { data: competition } = await supabase
      .from("competitions")
      .select("creator_id")
      .eq("id", competitionId)
      .single();

    const isCreator = competition?.creator_id === userId;

    // Fetch test cases
    let query = supabase
      .from("test_cases")
      .select("id, input, expected_output, points, is_hidden, created_at")
      .eq("competition_id", competitionId)
      .order("created_at", { ascending: true });

    // Non-creators only see visible test cases
    if (!isCreator) {
      query = query.eq("is_hidden", false);
    }

    const { data: testCases, error } = await query;

    if (error) {
      console.error("Error fetching test cases:", error);
      return NextResponse.json(
        { error: "Failed to fetch test cases" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      testCases,
      isCreator,
      total: testCases?.length || 0,
    });
  } catch (error) {
    console.error("Error in GET /api/competitions/[id]/test-cases:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a new test case
 * Only competition creators can add test cases
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: competitionId } = await params;

    // Get authenticated session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is the competition creator
    const { data: competition } = await supabase
      .from("competitions")
      .select("creator_id")
      .eq("id", competitionId)
      .single();

    if (!competition || competition.creator_id !== session.user.id) {
      return NextResponse.json(
        { error: "Only competition creators can add test cases" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { input, expected_output, points, is_hidden } = body;

    // Validation
    if (input === undefined || expected_output === undefined) {
      return NextResponse.json(
        { error: "Input and expected output are required" },
        { status: 400 }
      );
    }

    // Create test case
    const { data: testCase, error } = await supabase
      .from("test_cases")
      .insert({
        competition_id: competitionId,
        input: input.toString(),
        expected_output: expected_output.toString(),
        points: points || 10,
        is_hidden: is_hidden || false,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating test case:", error);
      return NextResponse.json(
        { error: "Failed to create test case" },
        { status: 500 }
      );
    }

    return NextResponse.json({ testCase }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/competitions/[id]/test-cases:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update a test case
 * Only competition creators can update test cases
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: competitionId } = await params;

    // Get authenticated session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is the competition creator
    const { data: competition } = await supabase
      .from("competitions")
      .select("creator_id")
      .eq("id", competitionId)
      .single();

    if (!competition || competition.creator_id !== session.user.id) {
      return NextResponse.json(
        { error: "Only competition creators can update test cases" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, input, expected_output, points, is_hidden } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Test case ID is required" },
        { status: 400 }
      );
    }

    // Update test case
    const { data: testCase, error } = await supabase
      .from("test_cases")
      .update({
        input: input?.toString(),
        expected_output: expected_output?.toString(),
        points,
        is_hidden,
      })
      .eq("id", id)
      .eq("competition_id", competitionId)
      .select()
      .single();

    if (error) {
      console.error("Error updating test case:", error);
      return NextResponse.json(
        { error: "Failed to update test case" },
        { status: 500 }
      );
    }

    return NextResponse.json({ testCase });
  } catch (error) {
    console.error("Error in PUT /api/competitions/[id]/test-cases:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete a test case
 * Only competition creators can delete test cases
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: competitionId } = await params;
    const { searchParams } = new URL(request.url);
    const testCaseId = searchParams.get("testCaseId");

    if (!testCaseId) {
      return NextResponse.json(
        { error: "Test case ID is required" },
        { status: 400 }
      );
    }

    // Get authenticated session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is the competition creator
    const { data: competition } = await supabase
      .from("competitions")
      .select("creator_id")
      .eq("id", competitionId)
      .single();

    if (!competition || competition.creator_id !== session.user.id) {
      return NextResponse.json(
        { error: "Only competition creators can delete test cases" },
        { status: 403 }
      );
    }

    // Delete test case
    const { error } = await supabase
      .from("test_cases")
      .delete()
      .eq("id", testCaseId)
      .eq("competition_id", competitionId);

    if (error) {
      console.error("Error deleting test case:", error);
      return NextResponse.json(
        { error: "Failed to delete test case" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/competitions/[id]/test-cases:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
