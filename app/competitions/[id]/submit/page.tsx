"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Code2, Play, Send, CheckCircle, XCircle, Lock } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import posthog from "posthog-js";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

const LANGUAGE_CONFIGS = {
  python: { language: "python", defaultCode: "# Write your Python code here\ndef solve():\n    pass\n\nsolve()" },
  javascript: { language: "javascript", defaultCode: "// Write your JavaScript code here\nfunction solve() {\n    \n}\n\nsolve();" },
  java: { language: "java", defaultCode: "// Write your Java code here\npublic class Solution {\n    public static void main(String[] args) {\n        \n    }\n}" },
  cpp: { language: "cpp", defaultCode: "// Write your C++ code here\n#include <iostream>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}" },
};

type TestResult = {
  passed: boolean;
  input: string;
  expected: string;
  actual: string;
  error?: string;
};

export default function SubmitPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState(LANGUAGE_CONFIGS.python.defaultCode);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [inviteCode, setInviteCode] = useState<string>("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Get invite code from URL if present
  useEffect(() => {
    const codeFromUrl = searchParams.get("invite");
    if (codeFromUrl) {
      setInviteCode(codeFromUrl);
    }
  }, [searchParams]);

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    setCode(LANGUAGE_CONFIGS[newLang as keyof typeof LANGUAGE_CONFIGS].defaultCode);
    setTestResults([]);
  };

  const handleRunCode = async () => {
    setRunning(true);
    setTestResults([]);

    try {
      const response = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          language,
          competition_id: params.id,
          test_only: true,
        }),
      });

      const data = await response.json();
      setTestResults(data.results || []);

      // Capture code execution event
      posthog.capture("code_executed", {
        competition_id: params.id,
        language: language,
        passed_tests: data.passedTests || 0,
        total_tests: data.totalTests || 0,
        score: data.score || 0,
      });
    } catch (error) {
      console.error("Error running code:", error);
      posthog.captureException(error);
    } finally {
      setRunning(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          language,
          competition_id: params.id,
          invite_code: inviteCode || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        router.push(`/competitions/${params.id}`);
      } else {
        setSubmitError(data.error || "Failed to submit code");
      }
    } catch (error) {
      console.error("Error submitting code:", error);
      setSubmitError("An error occurred while submitting");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <header className="border-b bg-white dark:bg-gray-900">
        <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Code2 className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold">CodeComp</span>
          </Link>
          <div className="flex gap-4">
            <Link
              href={`/competitions/${params.id}`}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
            >
              Back to Competition
            </Link>
          </div>
        </nav>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Code Editor</h1>
          <p className="text-gray-600 dark:text-gray-400">Write and test your solution</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
              <div className="border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium">Language:</label>
                  <select
                    value={language}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                  >
                    <option value="python">Python</option>
                    <option value="javascript">JavaScript</option>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleRunCode}
                    disabled={running}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Play className="h-4 w-4" />
                    {running ? "Running..." : "Run Tests"}
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="h-4 w-4" />
                    {submitting ? "Submitting..." : "Submit"}
                  </button>
                </div>
              </div>
              <div className="h-[600px]">
                <MonacoEditor
                  height="100%"
                  language={LANGUAGE_CONFIGS[language as keyof typeof LANGUAGE_CONFIGS].language}
                  value={code}
                  onChange={(value) => setCode(value || "")}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: "on",
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4">Test Results</h2>
              {testResults.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">
                  Run your code to see test results
                </p>
              ) : (
                <div className="space-y-3">
                  {testResults.map((result, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg ${
                        result.passed
                          ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                          : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {result.passed ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                        <span className="font-semibold">Test Case {idx + 1}</span>
                      </div>
                      {!result.passed && (
                        <div className="text-sm space-y-1">
                          <div>
                            <span className="font-medium">Input:</span> {result.input}
                          </div>
                          <div>
                            <span className="font-medium">Expected:</span> {result.expected}
                          </div>
                          <div>
                            <span className="font-medium">Got:</span> {result.actual}
                          </div>
                          {result.error && (
                            <div className="text-red-600 dark:text-red-400">
                              <span className="font-medium">Error:</span> {result.error}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4">Tips</h2>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>• Test your code before submitting</li>
                <li>• You can submit multiple times</li>
                <li>• Your best score will be counted</li>
                <li>• Make sure to handle edge cases</li>
              </ul>
            </div>

            {/* Submit Error */}
            {submitError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-700 dark:text-red-300 font-medium">Submission Error</p>
                    <p className="text-red-600 dark:text-red-400 text-sm">{submitError}</p>
                  </div>
                </div>
                
                {/* Show invite code input if error suggests private competition */}
                {submitError.includes("private") && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <Lock className="inline h-4 w-4 mr-1" />
                      Enter Invite Code
                    </label>
                    <input
                      type="text"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      placeholder="Enter invite code"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      This competition is private. You need an invite code to submit.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
