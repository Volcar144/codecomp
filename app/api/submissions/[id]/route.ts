/**
 * Single Submission API
 * GET - Get details of a specific submission (including code)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { headers } from "next/headers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch submission with test results
    const { data: submission, error } = await supabase
      .from("submissions")
      .select(`
        *,
        competitions (
          id,
          title,
          creator_id
        ),
        test_results (
          id,
          test_case_id,
          passed,
          actual_output,
          execution_time,
          error_message,
          test_cases (
            input,
            expected_output,
            points,
            is_hidden
          )
        )
      `)
      .eq("id", id)
      .single();

    if (error || !submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    // Check access - user can only view their own submissions
    // or competition creator can view all submissions
    const competition = submission.competitions as { id: string; title: string; creator_id: string } | null;
    const isCreator = competition?.creator_id === session.user.id;
    const isOwner = submission.user_id === session.user.id;

    if (!isOwner && !isCreator) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Format test results - hide hidden test case inputs/outputs for non-creators
    const testResults = (submission.test_results as Array<{
      id: string;
      test_case_id: string;
      passed: boolean;
      actual_output: string | null;
      execution_time: number | null;
      error_message: string | null;
      test_cases: {
        input: string;
        expected_output: string;
        points: number;
        is_hidden: boolean;
      } | null;
    }>) || [];

    const formattedTestResults = testResults.map((tr) => {
      const testCase = tr.test_cases;
      const isHidden = testCase?.is_hidden && !isCreator;
      
      return {
        id: tr.id,
        passed: tr.passed,
        execution_time: tr.execution_time,
        error_message: tr.error_message,
        points: testCase?.points || 0,
        input: isHidden ? "[Hidden]" : testCase?.input,
        expected_output: isHidden ? "[Hidden]" : testCase?.expected_output,
        actual_output: isHidden ? "[Hidden]" : tr.actual_output,
        is_hidden: testCase?.is_hidden || false,
      };
    });

    return NextResponse.json({
      id: submission.id,
      competition_id: submission.competition_id,
      competition_title: competition?.title || "Unknown Competition",
      user_id: submission.user_id,
      code: submission.code,
      language: submission.language,
      status: submission.status,
      score: submission.score,
      execution_time: submission.execution_time,
      memory_used: submission.memory_used,
      error_message: submission.error_message,
      submitted_at: submission.submitted_at,
      test_results: formattedTestResults,
      is_owner: isOwner,
      is_creator: isCreator,
    });
  } catch (error) {
    console.error("Error in GET /api/submissions/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
