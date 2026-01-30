import { NextRequest, NextResponse } from "next/server";
import { isLanguageSupported } from "@/lib/code-execution";
import { executeCodeRateLimited, getRateLimitStatus } from "@/lib/rate-limited-execution";
import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { 
  canExecuteCode, 
  logExecution, 
  getExecutionTimeout,
  hasPriorityQueue,
  DISABLE_PAYMENT_GATING,
  PLAN_LIMITS
} from "@/lib/subscription-utils";

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

    // Get user session for subscription check
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const userId = session?.user?.id;
    
    // Check execution limits (only for authenticated users with daily limits)
    if (userId && !DISABLE_PAYMENT_GATING) {
      const executionCheck = await canExecuteCode(userId);
      
      if (!executionCheck.allowed) {
        return NextResponse.json({
          error: "Daily execution limit reached",
          message: `You've used all ${executionCheck.limit} executions for today. Upgrade to Pro for unlimited executions.`,
          limit: executionCheck.limit,
          remaining: 0,
          plan: executionCheck.plan,
          upgradeUrl: "/pricing",
        }, { status: 429 });
      }
      
      // Log this execution
      await logExecution(userId);
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

    // Get timeout based on user's plan
    const timeoutSeconds = userId 
      ? await getExecutionTimeout(userId) 
      : PLAN_LIMITS.free.executionTimeoutSeconds;

    // Check if user has priority queue access (Pro/Family/Team)
    const usePriorityQueue = userId 
      ? await hasPriorityQueue(userId)
      : false;

    // Run code against test cases (with rate limiting)
    const results = await Promise.all(
      casesToRun.map(async (testCase) => {
        try {
          const result = await executeCodeRateLimited(
            code, 
            language, 
            testCase.input, 
            timeoutSeconds,
            usePriorityQueue // Use priority queue for Pro users
          );
          
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

    // Get remaining executions to return to client
    let executionInfo = null;
    if (userId && !DISABLE_PAYMENT_GATING) {
      const check = await canExecuteCode(userId);
      executionInfo = {
        remaining: check.remaining,
        limit: check.limit,
        plan: check.plan,
      };
    }

    return NextResponse.json({
      results,
      score,
      passedTests,
      totalTests,
      executionInfo,
    });
  } catch (error) {
    console.error("Error executing code:", error);
    return NextResponse.json({ error: "Code execution failed" }, { status: 500 });
  }
}

/**
 * GET endpoint to check rate limit status and user's execution limits
 */
export async function GET(request: NextRequest) {
  try {
    const status = await getRateLimitStatus();
    
    // Also check user's subscription limits
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    let userLimits = null;
    if (session?.user?.id) {
      const check = await canExecuteCode(session.user.id);
      userLimits = {
        remaining: check.remaining,
        limit: check.limit,
        plan: check.plan,
        unlimited: check.limit === Infinity,
      };
    }

    return NextResponse.json({ 
      ...status,
      userLimits,
      paymentGatingDisabled: DISABLE_PAYMENT_GATING,
    });
  } catch (error) {
    console.error("Error getting rate limit status:", error);
    return NextResponse.json({ error: "Failed to get rate limit status" }, { status: 500 });
  }
}
