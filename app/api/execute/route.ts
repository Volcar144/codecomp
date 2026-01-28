import { NextRequest, NextResponse } from "next/server";
import { isLanguageSupported } from "@/lib/code-execution";
import { executeCodeRateLimited, getRateLimitStatus } from "@/lib/rate-limited-execution";
import { supabase } from "@/lib/supabase";

// Default test cases if none are found in database
// These are simple echo-style tests for basic validation
// Competition creators should define their own meaningful test cases
const DEFAULT_TEST_CASES = [
  { input: "5", expected: "5", points: 10, isHidden: false },
  { input: "10", expected: "10", points: 10, isHidden: false },
  { input: "1", expected: "1", points: 10, isHidden: false },
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, language, competition_id, test_only } = body;

    if (!code || !language) {
      return NextResponse.json({ error: "Code and language are required" }, { status: 400 });
    }

    // Validate language is supported
    if (!isLanguageSupported(language)) {
      return NextResponse.json({ error: `Unsupported language: ${language}` }, { status: 400 });
    }

    // Get test cases for the competition from database
    let testCases = DEFAULT_TEST_CASES;
    
    if (competition_id) {
      const { data: dbTestCases, error } = await supabase
        .from("test_cases")
        .select("input, expected_output, points, is_hidden")
        .eq("competition_id", competition_id)
        .order("created_at", { ascending: true });

      if (!error && dbTestCases && dbTestCases.length > 0) {
        testCases = dbTestCases.map((tc) => ({
          input: tc.input,
          expected: tc.expected_output,
          points: tc.points,
          isHidden: tc.is_hidden,
        }));
      }
    }

    // Filter out hidden test cases if this is just a test run
    const casesToRun = test_only 
      ? testCases.filter((tc) => !tc.isHidden) 
      : testCases;

    // Run code against test cases (with rate limiting)
    const results = await Promise.all(
      casesToRun.map(async (testCase) => {
        try {
          const result = await executeCodeRateLimited(code, language, testCase.input);
          
          // Check if execution had an error
          if (result.error) {
            return {
              passed: false,
              input: test_only ? testCase.input : "Hidden",
              expected: test_only ? testCase.expected : "Hidden",
              actual: result.output || "",
              error: result.error,
              executionTime: result.executionTime,
              stderr: result.stderr,
            };
          }
          
          // Compare output with expected
          const passed = result.output.trim() === testCase.expected.trim();
          
          return {
            passed,
            input: test_only ? testCase.input : "Hidden",
            expected: test_only ? testCase.expected : "Hidden",
            actual: result.output.trim(),
            error: null,
            executionTime: result.executionTime,
            stderr: result.stderr,
          };
        } catch (error) {
          return {
            passed: false,
            input: test_only ? testCase.input : "Hidden",
            expected: test_only ? testCase.expected : "Hidden",
            actual: "",
            error: error instanceof Error ? error.message : "Execution error",
          };
        }
      })
    );

    // Calculate score
    const passedTests = results.filter((r) => r.passed).length;
    const totalTests = results.length;
    const score = Math.floor((passedTests / totalTests) * 100);

    return NextResponse.json({
      results,
      score,
      passedTests,
      totalTests,
    });
  } catch (error) {
    console.error("Error executing code:", error);
    return NextResponse.json({ error: "Code execution failed" }, { status: 500 });
  }
}

/**
 * GET endpoint to check rate limit status
 */
export async function GET() {
  try {
    const status = await getRateLimitStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error("Error getting rate limit status:", error);
    return NextResponse.json({ error: "Failed to get rate limit status" }, { status: 500 });
  }
}
