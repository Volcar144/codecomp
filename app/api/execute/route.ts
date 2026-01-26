import { NextRequest, NextResponse } from "next/server";

// Mock code execution - in production, this would use a sandboxed execution environment
// like Judge0, Piston, or a custom Docker-based solution

const MOCK_TEST_CASES = [
  { input: "5", expected: "5", points: 10 },
  { input: "10", expected: "10", points: 10 },
  { input: "1", expected: "1", points: 10 },
];

async function executeCode(code: string, language: string, input: string) {
  // In production, this would send the code to a sandboxed execution environment
  // For now, we'll return mock results
  
  // Simulate execution delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Mock execution - just return the input as output
  return {
    output: input,
    error: null,
    executionTime: Math.floor(Math.random() * 100),
    memoryUsed: Math.floor(Math.random() * 1000),
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, language, competition_id, test_only } = body;

    if (!code || !language) {
      return NextResponse.json({ error: "Code and language are required" }, { status: 400 });
    }

    // Get test cases for the competition
    const testCases = MOCK_TEST_CASES;

    // Run code against test cases
    const results = await Promise.all(
      testCases.map(async (testCase) => {
        try {
          const result = await executeCode(code, language, testCase.input);
          
          return {
            passed: result.output.trim() === testCase.expected.trim(),
            input: testCase.input,
            expected: testCase.expected,
            actual: result.output,
            error: result.error,
            executionTime: result.executionTime,
          };
        } catch (error) {
          return {
            passed: false,
            input: testCase.input,
            expected: testCase.expected,
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
