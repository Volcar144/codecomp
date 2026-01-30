"use client";

import { useState, useEffect, use } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import Navbar from "@/components/layout/Navbar";
import ReactMarkdown from "react-markdown";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

interface TutorialLesson {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  content: string;
  hints: string[];
  starter_code: Record<string, string>;
  solution_code: Record<string, string>;
  test_cases: { input: string; expected_output: string; points: number }[];
  xp_reward: number;
  estimated_minutes: number;
  progress?: {
    status: string;
    hintsUsed: number;
    attempts: number;
    completedAt: string | null;
  };
}

export default function TutorialLessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { data: session } = useSession();
  const router = useRouter();

  const [lesson, setLesson] = useState<TutorialLesson | null>(null);
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("python");
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<
    { input: string; expected: string; actual: string; passed: boolean }[]
  >([]);
  const [hintsUnlocked, setHintsUnlocked] = useState<string[]>([]);
  const [showSolution, setShowSolution] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [attempts, setAttempts] = useState(0);

  const supportedLanguages = ["python", "javascript"];

  useEffect(() => {
    fetchLesson();
  }, [slug]);

  async function fetchLesson() {
    try {
      const res = await fetch(`/api/tutorial?slug=${slug}`);
      const data = await res.json();

      // Find the lesson in categories
      for (const category of data.categories || []) {
        const found = category.lessons.find((l: TutorialLesson) => l.slug === slug);
        if (found) {
          setLesson(found);
          setCode(found.starter_code[language] || "");
          if (found.progress) {
            setHintsUnlocked(found.hints.slice(0, found.progress.hintsUsed));
            setAttempts(found.progress.attempts);
            setIsCompleted(found.progress.status === "completed");
          }
          break;
        }
      }
    } catch (err) {
      console.error("Error fetching lesson:", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function runCode() {
    if (!lesson) return;

    setIsRunning(true);
    setOutput(null);
    setTestResults([]);

    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          language,
          test_cases: lesson.test_cases.map((tc) => ({
            input: tc.input,
            expected_output: tc.expected_output,
          })),
          test_only: true,
        }),
      });

      const data = await res.json();

      if (data.error) {
        setOutput(data.error);
        return;
      }

      const results =
        data.results?.map((r: any, i: number) => ({
          input: lesson.test_cases[i]?.input || "",
          expected: lesson.test_cases[i]?.expected_output || "",
          actual: r.actual_output || r.error || "",
          passed: r.passed,
        })) || [];

      setTestResults(results);

      const allPassed = results.every((r: any) => r.passed);

      // Submit progress if logged in
      if (session?.user?.id) {
        const submitRes = await fetch("/api/tutorial", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lessonId: lesson.id,
            code,
            language,
            passed: allPassed,
            testResults: results,
          }),
        });

        const submitData = await submitRes.json();
        setAttempts(submitData.attempts || attempts + 1);

        if (submitData.isFirstCompletion) {
          setIsCompleted(true);
          setXpEarned(submitData.xpEarned);
        }
      }

      if (allPassed && !isCompleted) {
        setOutput("🎉 All tests passed! Great job!");
      } else if (!allPassed) {
        setOutput("Some tests failed. Check the results below.");
      }
    } catch (err) {
      setOutput("Error running code");
      console.error(err);
    } finally {
      setIsRunning(false);
    }
  }

  async function useHint() {
    if (!lesson || !session?.user?.id) return;

    const nextHintIndex = hintsUnlocked.length;
    if (nextHintIndex >= lesson.hints.length) return;

    try {
      const res = await fetch("/api/tutorial/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId: lesson.id,
          hintIndex: nextHintIndex,
        }),
      });

      const data = await res.json();
      if (data.hintsUnlocked) {
        setHintsUnlocked(data.hintsUnlocked);
      }
    } catch (err) {
      console.error("Error getting hint:", err);
    }
  }

  function handleLanguageChange(newLang: string) {
    setLanguage(newLang);
    if (lesson) {
      setCode(lesson.starter_code[newLang] || "");
    }
  }

  function resetCode() {
    if (lesson) {
      setCode(lesson.starter_code[language] || "");
      setOutput(null);
      setTestResults([]);
    }
  }

  function getDifficultyColor(difficulty: string) {
    switch (difficulty) {
      case "beginner":
        return "text-green-400 bg-green-400/10";
      case "intermediate":
        return "text-yellow-400 bg-yellow-400/10";
      case "advanced":
        return "text-red-400 bg-red-400/10";
      default:
        return "text-gray-400 bg-gray-400/10";
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Lesson Not Found</h1>
          <p className="text-gray-400 mb-8">This tutorial lesson doesn't exist.</p>
          <Link href="/tutorial" className="text-blue-400 hover:text-blue-300">
            ← Back to Tutorials
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/tutorial" className="text-gray-400 hover:text-white text-sm mb-2 inline-block">
              ← Back to Tutorials
            </Link>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              {lesson.title}
              {isCompleted && <span className="text-green-400">✅</span>}
            </h1>
            <div className="flex items-center gap-4 mt-2">
              <span className={`px-2 py-1 rounded text-xs font-medium ${getDifficultyColor(lesson.difficulty)}`}>
                {lesson.difficulty}
              </span>
              <span className="text-gray-400 text-sm">~{lesson.estimated_minutes} min</span>
              <span className="text-purple-400 text-sm">+{lesson.xp_reward} XP</span>
              {attempts > 0 && (
                <span className="text-gray-400 text-sm">{attempts} attempts</span>
              )}
            </div>
          </div>
        </div>

        {/* XP Earned Notification */}
        {xpEarned > 0 && (
          <div className="bg-gradient-to-r from-purple-600/30 to-blue-600/30 border border-purple-500/50 rounded-xl p-4 mb-6 animate-pulse">
            <div className="flex items-center gap-4">
              <span className="text-4xl">🎉</span>
              <div>
                <h3 className="text-white font-bold text-lg">Congratulations!</h3>
                <p className="text-purple-200">
                  You completed this lesson and earned <strong>{xpEarned} XP</strong>!
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Panel - Instructions */}
          <div className="bg-gray-800/50 rounded-xl p-6 h-fit lg:sticky lg:top-6">
            <div className="prose prose-invert max-w-none">
              <ReactMarkdown>{lesson.content}</ReactMarkdown>
            </div>

            {/* Hints Section */}
            <div className="mt-6 pt-6 border-t border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-medium">
                  💡 Hints ({hintsUnlocked.length}/{lesson.hints.length})
                </h3>
                {!session?.user && (
                  <span className="text-gray-400 text-sm">Sign in to use hints</span>
                )}
              </div>

              {hintsUnlocked.length > 0 && (
                <div className="space-y-3 mb-4">
                  {hintsUnlocked.map((hint, i) => (
                    <div key={i} className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-3">
                      <p className="text-yellow-200 text-sm">{hint}</p>
                    </div>
                  ))}
                </div>
              )}

              {session?.user && hintsUnlocked.length < lesson.hints.length && (
                <button
                  onClick={useHint}
                  className="w-full bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-600/50 text-yellow-300 py-2 px-4 rounded-lg transition-colors"
                >
                  Reveal Next Hint
                </button>
              )}
            </div>

            {/* Solution Toggle */}
            {isCompleted && (
              <div className="mt-4">
                <button
                  onClick={() => setShowSolution(!showSolution)}
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  {showSolution ? "Hide Solution" : "View Solution"}
                </button>
                {showSolution && (
                  <pre className="mt-2 bg-gray-900 rounded-lg p-4 overflow-x-auto text-sm text-gray-300">
                    {lesson.solution_code[language]}
                  </pre>
                )}
              </div>
            )}
          </div>

          {/* Right Panel - Code Editor */}
          <div className="space-y-4">
            {/* Language Selector */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {supportedLanguages.map((lang) => (
                  <button
                    key={lang}
                    onClick={() => handleLanguageChange(lang)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      language === lang
                        ? "bg-blue-600 text-white"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }`}
                  >
                    {lang === "python" ? "🐍 Python" : "📜 JavaScript"}
                  </button>
                ))}
              </div>
              <button
                onClick={resetCode}
                className="text-gray-400 hover:text-white text-sm"
              >
                Reset Code
              </button>
            </div>

            {/* Editor */}
            <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700">
              <MonacoEditor
                height="400px"
                language={language}
                theme="vs-dark"
                value={code}
                onChange={(value) => setCode(value || "")}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                }}
              />
            </div>

            {/* Run Button */}
            <button
              onClick={runCode}
              disabled={isRunning}
              className={`w-full py-3 rounded-lg font-semibold text-lg transition-colors ${
                isRunning
                  ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700 text-white"
              }`}
            >
              {isRunning ? "Running..." : "▶ Run Code"}
            </button>

            {/* Output */}
            {output && (
              <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                <h3 className="text-white font-medium mb-2">Output</h3>
                <pre className="text-gray-300 whitespace-pre-wrap">{output}</pre>
              </div>
            )}

            {/* Test Results */}
            {testResults.length > 0 && (
              <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700">
                <h3 className="text-white font-medium p-4 border-b border-gray-700">
                  Test Results ({testResults.filter((r) => r.passed).length}/{testResults.length} passed)
                </h3>
                <div className="divide-y divide-gray-700">
                  {testResults.map((result, i) => (
                    <div
                      key={i}
                      className={`p-4 ${result.passed ? "bg-green-900/10" : "bg-red-900/10"}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white font-medium">Test {i + 1}</span>
                        <span className={result.passed ? "text-green-400" : "text-red-400"}>
                          {result.passed ? "✓ Passed" : "✗ Failed"}
                        </span>
                      </div>
                      <div className="grid gap-2 text-sm">
                        {result.input && (
                          <div>
                            <span className="text-gray-400">Input: </span>
                            <code className="text-gray-300">{result.input}</code>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-400">Expected: </span>
                          <code className="text-green-300">{result.expected}</code>
                        </div>
                        <div>
                          <span className="text-gray-400">Got: </span>
                          <code className={result.passed ? "text-green-300" : "text-red-300"}>
                            {result.actual || "(empty)"}
                          </code>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
