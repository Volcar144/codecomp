"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Navbar from "@/components/layout/Navbar";
import { Loading } from "@/components/ui/Loading";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-gray-800">
      <Loading />
    </div>
  ),
});

interface PracticePageProps {
  params: Promise<{
    type: string;
    id: string;
  }>;
}

interface TestResult {
  input: string;
  expectedOutput: string;
  actualOutput: string;
  passed: boolean;
  error?: string;
  executionTime?: number;
}

const LANGUAGES = [
  { value: "python", label: "Python" },
  { value: "javascript", label: "JavaScript" },
  { value: "java", label: "Java" },
  { value: "cpp", label: "C++" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
];

export default function PracticeChallengePage({ params }: PracticePageProps) {
  const resolvedParams = use(params);
  const { type, id } = resolvedParams;
  const { data: session } = useSession();
  const router = useRouter();

  const [challenge, setChallenge] = useState<any>(null);
  const [testCases, setTestCases] = useState<any[]>([]);
  const [existingSession, setExistingSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[] | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(false);

  // Load challenge and existing session
  useEffect(() => {
    const fetchChallenge = async () => {
      try {
        const res = await fetch("/api/practice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "start",
            challengeType: type,
            challengeId: id,
          }),
        });

        const data = await res.json();

        if (data.error) {
          alert(data.error);
          router.push("/practice");
          return;
        }

        setChallenge(data.challenge);
        setTestCases(data.testCases || []);

        if (data.existingSession) {
          setExistingSession(data.existingSession);
          setCode(data.existingSession.code || "");
          setLanguage(data.existingSession.language || "python");
        } else {
          // Set default starter code
          setCode(getStarterCode("python", data.challenge));
        }
      } catch (error) {
        console.error("Error loading challenge:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchChallenge();
  }, [type, id, router]);

  const getStarterCode = (lang: string, challenge: any): string => {
    const starterCodes: Record<string, string> = {
      python: `# ${challenge?.title || "Challenge"}\n# Write your solution below\n\ndef solve():\n    # Your code here\n    pass\n\nif __name__ == "__main__":\n    solve()`,
      javascript: `// ${challenge?.title || "Challenge"}\n// Write your solution below\n\nfunction solve() {\n    // Your code here\n}\n\nsolve();`,
      java: `// ${challenge?.title || "Challenge"}\n// Write your solution below\n\nimport java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        // Your code here\n    }\n}`,
      cpp: `// ${challenge?.title || "Challenge"}\n// Write your solution below\n\n#include <iostream>\nusing namespace std;\n\nint main() {\n    // Your code here\n    return 0;\n}`,
      go: `// ${challenge?.title || "Challenge"}\n// Write your solution below\n\npackage main\n\nimport "fmt"\n\nfunc main() {\n    // Your code here\n    fmt.Println("Hello")\n}`,
      rust: `// ${challenge?.title || "Challenge"}\n// Write your solution below\n\nfn main() {\n    // Your code here\n    println!("Hello");\n}`,
    };
    return starterCodes[lang] || starterCodes.python;
  };

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    if (!existingSession || !existingSession.code) {
      setCode(getStarterCode(newLanguage, challenge));
    }
  };

  const handleRun = useCallback(async () => {
    setIsRunning(true);
    setResults(null);
    setScore(null);

    try {
      const res = await fetch("/api/practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "run",
          challengeType: type,
          challengeId: id,
          code,
          language,
        }),
      });

      const data = await res.json();

      if (data.error) {
        alert(data.error);
        return;
      }

      setResults(data.results || []);
      setScore(data.score);

      // Update existing session state
      setExistingSession((prev: any) => ({
        ...prev,
        score: data.score,
        attempts: (prev?.attempts || 0) + 1,
        best_score: Math.max(prev?.best_score || 0, data.score),
        completed: data.score === 100 || prev?.completed,
      }));
    } catch (error) {
      console.error("Error running code:", error);
      alert("Failed to run code");
    } finally {
      setIsRunning(false);
    }
  }, [type, id, code, language]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleRun();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleRun]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">
            Challenge Not Found
          </h1>
          <p className="text-gray-400 mb-4">
            This challenge doesn't exist or has been removed.
          </p>
          <button
            onClick={() => router.push("/practice")}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white"
          >
            Back to Practice
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <Navbar />

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Problem description panel */}
        <div className="w-full lg:w-1/3 bg-gray-800 border-r border-gray-700 overflow-y-auto">
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`text-xs px-2 py-0.5 rounded ${
                  type === "daily"
                    ? "bg-blue-600 text-blue-100"
                    : "bg-purple-600 text-purple-100"
                }`}
              >
                {type === "daily" ? "Daily" : "Tutorial"}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded ${
                  challenge.difficulty === "easy"
                    ? "bg-green-600"
                    : challenge.difficulty === "medium"
                    ? "bg-yellow-600"
                    : challenge.difficulty === "hard"
                    ? "bg-red-600"
                    : "bg-purple-600"
                } text-white`}
              >
                {challenge.difficulty}
              </span>
              <span className="text-xs text-gray-400">Practice Mode</span>
            </div>

            <h1 className="text-xl font-bold text-white">{challenge.title}</h1>
          </div>

          <div className="p-4">
            <h2 className="text-white font-medium mb-2">Description</h2>
            <div className="text-gray-300 whitespace-pre-wrap text-sm">
              {challenge.description}
            </div>

            {/* Hint section */}
            {challenge.hint && (
              <div className="mt-4">
                <button
                  onClick={() => setShowHint(!showHint)}
                  className="text-yellow-400 text-sm hover:underline"
                >
                  {showHint ? "Hide Hint" : "Show Hint"}
                </button>
                {showHint && (
                  <div className="mt-2 p-3 bg-yellow-900/20 border border-yellow-700 rounded text-yellow-200 text-sm">
                    {challenge.hint}
                  </div>
                )}
              </div>
            )}

            {/* Sample test cases */}
            {testCases.length > 0 && (
              <div className="mt-6">
                <h2 className="text-white font-medium mb-2">Sample Test Cases</h2>
                {testCases.slice(0, 2).map((tc, idx) => (
                  <div
                    key={idx}
                    className="mb-3 bg-gray-900 rounded p-3 text-sm"
                  >
                    <div className="text-gray-400 mb-1">Input:</div>
                    <pre className="text-white bg-gray-800 p-2 rounded mb-2 overflow-x-auto">
                      {tc.input || "(empty)"}
                    </pre>
                    <div className="text-gray-400 mb-1">Expected Output:</div>
                    <pre className="text-green-400 bg-gray-800 p-2 rounded overflow-x-auto">
                      {tc.expected_output || tc.expectedOutput || "(empty)"}
                    </pre>
                  </div>
                ))}
              </div>
            )}

            {/* Session stats */}
            {existingSession && (
              <div className="mt-6 p-3 bg-gray-900 rounded">
                <h2 className="text-white font-medium mb-2">Your Progress</h2>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-400">Attempts:</span>{" "}
                    <span className="text-white">{existingSession.attempts}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Best Score:</span>{" "}
                    <span className="text-green-400">
                      {existingSession.best_score}%
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-400">Status:</span>{" "}
                    {existingSession.completed ? (
                      <span className="text-green-400">✓ Completed</span>
                    ) : (
                      <span className="text-yellow-400">In Progress</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Code editor */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Toolbar */}
          <div className="bg-gray-800 border-b border-gray-700 p-3 flex items-center gap-3">
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>

            <div className="flex-1" />

            <button
              onClick={() => {
                setCode(getStarterCode(language, challenge));
                setResults(null);
                setScore(null);
              }}
              className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 rounded text-white text-sm"
            >
              Reset Code
            </button>

            <button
              onClick={handleRun}
              disabled={isRunning}
              className="px-4 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded text-white text-sm font-medium"
            >
              {isRunning ? "Running..." : "▶ Run (Ctrl+Enter)"}
            </button>
          </div>

          {/* Editor */}
          <div className="flex-1 min-h-[300px]">
            <MonacoEditor
              height="100%"
              language={
                language === "cpp" ? "cpp" : language === "csharp" ? "csharp" : language
              }
              value={code}
              onChange={(value) => setCode(value || "")}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: "on",
                roundedSelection: true,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 4,
                wordWrap: "on",
              }}
            />
          </div>

          {/* Results panel */}
          {(results || isRunning) && (
            <div className="h-64 border-t border-gray-700 overflow-y-auto bg-gray-800">
              <div className="p-3 border-b border-gray-700 flex items-center justify-between">
                <h3 className="text-white font-medium">Test Results</h3>
                {score !== null && (
                  <span
                    className={`font-bold ${
                      score === 100
                        ? "text-green-400"
                        : score >= 50
                        ? "text-yellow-400"
                        : "text-red-400"
                    }`}
                  >
                    Score: {score}%
                  </span>
                )}
              </div>

              <div className="p-3">
                {isRunning ? (
                  <div className="text-yellow-400">Running tests...</div>
                ) : results && results.length > 0 ? (
                  <div className="space-y-3">
                    {results.map((result, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded border ${
                          result.passed
                            ? "border-green-600 bg-green-900/20"
                            : "border-red-600 bg-red-900/20"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={`text-lg ${
                              result.passed ? "text-green-400" : "text-red-400"
                            }`}
                          >
                            {result.passed ? "✓" : "✗"}
                          </span>
                          <span className="text-white font-medium">
                            Test Case {idx + 1}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <div className="text-gray-400 mb-1">Input:</div>
                            <pre className="text-white bg-gray-900 p-2 rounded overflow-x-auto">
                              {result.input || "(empty)"}
                            </pre>
                          </div>
                          <div>
                            <div className="text-gray-400 mb-1">Expected:</div>
                            <pre className="text-green-400 bg-gray-900 p-2 rounded overflow-x-auto">
                              {result.expectedOutput || "(empty)"}
                            </pre>
                          </div>
                        </div>

                        {!result.passed && (
                          <div className="mt-2">
                            <div className="text-gray-400 mb-1 text-sm">
                              Your Output:
                            </div>
                            <pre className="text-red-400 bg-gray-900 p-2 rounded text-sm overflow-x-auto">
                              {result.error || result.actualOutput || "(empty)"}
                            </pre>
                          </div>
                        )}
                      </div>
                    ))}

                    {score === 100 && (
                      <div className="p-4 bg-green-900/30 border border-green-600 rounded text-center">
                        <div className="text-2xl mb-2">🎉</div>
                        <div className="text-green-400 font-bold">
                          Perfect Score!
                        </div>
                        <div className="text-gray-400 text-sm mt-1">
                          All test cases passed
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-500">No results yet</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
