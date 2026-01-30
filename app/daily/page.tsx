"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useSession } from "@/lib/auth-client";
import { Loading } from "@/components/ui/Loading";
import Navbar from "@/components/layout/Navbar";
import { 
  Flame, Clock, Trophy, CheckCircle, XCircle, 
  Calendar, Zap, ChevronRight, Play, Send, Users
} from "lucide-react";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

interface TestCase {
  input: string;
  expected_output: string;
  points: number;
}

interface Challenge {
  id: string;
  challenge_date: string;
  title: string;
  description: string;
  difficulty: string;
  category: string;
  time_limit_minutes: number;
  test_cases: TestCase[];
  starter_code: Record<string, string>;
  allowed_languages: string[];
  xp_reward: number;
  source_challenge_id?: string;
}

interface UserSubmission {
  id: string;
  score: number;
  passed: boolean;
  language: string;
  code: string;
  submitted_at: string;
}

interface StreakInfo {
  current_streak: number;
  longest_streak: number;
  total_daily_completed: number;
  total_xp_earned: number;
}

interface TestResult {
  input: string;
  expected: string;
  actual: string;
  passed: boolean;
  points: number;
}

const LANGUAGES = [
  { id: "python", name: "Python", monacoId: "python" },
  { id: "javascript", name: "JavaScript", monacoId: "javascript" },
  { id: "java", name: "Java", monacoId: "java" },
  { id: "cpp", name: "C++", monacoId: "cpp" },
  { id: "go", name: "Go", monacoId: "go" },
  { id: "rust", name: "Rust", monacoId: "rust" },
];

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  hard: "bg-red-100 text-red-700",
};

export default function DailyChallengePage() {
  const { data: session, isPending } = useSession();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [userSubmission, setUserSubmission] = useState<UserSubmission | null>(null);
  const [streakInfo, setStreakInfo] = useState<StreakInfo | null>(null);
  const [totalSolvers, setTotalSolvers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedLanguage, setSelectedLanguage] = useState("python");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[] | null>(null);
  const [submitResult, setSubmitResult] = useState<{
    passed: boolean;
    score: number;
    xpEarned: number;
    streak?: { new_streak: number; streak_bonus: number };
  } | null>(null);

  const fetchChallenge = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/daily");
      
      if (!response.ok) {
        throw new Error("Failed to fetch daily challenge");
      }
      
      const data = await response.json();
      setChallenge(data.challenge);
      setUserSubmission(data.userSubmission);
      setStreakInfo(data.streakInfo);
      setTotalSolvers(data.stats?.totalSolvers || 0);
      
      // Set starter code if available
      if (data.challenge?.starter_code?.[selectedLanguage]) {
        setCode(data.challenge.starter_code[selectedLanguage]);
      } else if (data.userSubmission?.code) {
        setCode(data.userSubmission.code);
        setSelectedLanguage(data.userSubmission.language);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [selectedLanguage]);

  useEffect(() => {
    fetchChallenge();
  }, [fetchChallenge]);

  const handleSubmit = async () => {
    if (!challenge || !code.trim() || !session?.user) return;

    setSubmitting(true);
    setTestResults(null);
    setSubmitResult(null);

    try {
      const response = await fetch("/api/daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          language: selectedLanguage,
          challengeId: challenge.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Submission failed");
      }

      setTestResults(data.results);
      setSubmitResult({
        passed: data.passed,
        score: data.totalScore,
        xpEarned: data.xpEarned,
        streak: data.streak,
      });

      if (data.passed) {
        setUserSubmission(data.submission);
        if (data.streak) {
          setStreakInfo(prev => prev ? {
            ...prev,
            current_streak: data.streak.new_streak,
            total_xp_earned: (prev.total_xp_earned || 0) + data.xpEarned,
          } : null);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (isPending || loading) {
    return <Loading />;
  }

  if (!challenge) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-500" />
          <h1 className="text-2xl font-bold mb-2">No Challenge Today</h1>
          <p className="text-gray-400">Check back tomorrow for a new daily challenge!</p>
        </div>
      </div>
    );
  }

  const alreadyCompleted = userSubmission?.passed;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        {/* Streak Banner */}
        <div className="bg-gradient-to-r from-orange-500 to-yellow-500 rounded-xl p-4 mb-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-full">
                <Flame className="h-8 w-8" />
              </div>
              <div>
                <p className="text-2xl font-bold">{streakInfo?.current_streak || 0} Day Streak</p>
                <p className="text-sm opacity-90">
                  {streakInfo?.total_daily_completed || 0} challenges completed • {streakInfo?.total_xp_earned || 0} XP earned
                </p>
              </div>
            </div>
            {alreadyCompleted && (
              <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-lg">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Completed!</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Challenge Info */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${DIFFICULTY_COLORS[challenge.difficulty] || DIFFICULTY_COLORS.medium}`}>
                  {challenge.difficulty}
                </span>
                <span className="text-sm text-gray-500">
                  {new Date(challenge.challenge_date).toLocaleDateString()}
                </span>
              </div>
              
              <h1 className="text-2xl font-bold mb-4">{challenge.title}</h1>
              <p className="text-gray-600 dark:text-gray-400 mb-4 whitespace-pre-wrap">
                {challenge.description}
              </p>
              
              <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {challenge.time_limit_minutes} min
                </span>
                <span className="flex items-center gap-1">
                  <Zap className="h-4 w-4" />
                  +{challenge.xp_reward} XP
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {totalSolvers} solved
                </span>
              </div>

              {challenge.category && (
                <span className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-xs">
                  {challenge.category}
                </span>
              )}
            </div>

            {/* Sample Test Cases */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h3 className="font-semibold mb-4">Sample Test Cases</h3>
              <div className="space-y-4">
                {challenge.test_cases.slice(0, 2).map((tc, i) => (
                  <div key={i} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="mb-2">
                      <p className="text-xs text-gray-500 mb-1">Input:</p>
                      <code className="text-sm">{tc.input}</code>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Expected Output:</p>
                      <code className="text-sm">{tc.expected_output}</code>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Code Editor */}
          <div className="lg:col-span-2 space-y-4">
            {/* Language Selection */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex gap-2 flex-wrap">
                  {LANGUAGES.filter(lang => 
                    !challenge.allowed_languages || 
                    challenge.allowed_languages.length === 0 || 
                    challenge.allowed_languages.includes(lang.id)
                  ).map(lang => (
                    <button
                      key={lang.id}
                      onClick={() => {
                        setSelectedLanguage(lang.id);
                        if (challenge.starter_code?.[lang.id]) {
                          setCode(challenge.starter_code[lang.id]);
                        }
                      }}
                      disabled={alreadyCompleted}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        selectedLanguage === lang.id
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                      } ${alreadyCompleted ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      {lang.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Editor */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
              <div className="h-[400px]">
                <MonacoEditor
                  height="100%"
                  language={LANGUAGES.find(l => l.id === selectedLanguage)?.monacoId || "python"}
                  value={code}
                  onChange={(value) => setCode(value || "")}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    readOnly: alreadyCompleted,
                  }}
                />
              </div>
            </div>

            {/* Submit Button */}
            {!alreadyCompleted && session?.user && (
              <button
                onClick={handleSubmit}
                disabled={submitting || !code.trim()}
                className="w-full py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                    Running Tests...
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5" />
                    Submit Solution
                  </>
                )}
              </button>
            )}

            {!session?.user && (
              <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
                <p className="text-yellow-700 dark:text-yellow-300">
                  <Link href="/login" className="underline font-medium">Sign in</Link> to submit your solution and track your streak!
                </p>
              </div>
            )}

            {/* Results */}
            {submitResult && (
              <div className={`rounded-xl p-6 ${submitResult.passed ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20"}`}>
                <div className="flex items-center gap-3 mb-4">
                  {submitResult.passed ? (
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  ) : (
                    <XCircle className="h-8 w-8 text-red-600" />
                  )}
                  <div>
                    <h3 className={`text-xl font-bold ${submitResult.passed ? "text-green-700" : "text-red-700"}`}>
                      {submitResult.passed ? "All Tests Passed! 🎉" : "Some Tests Failed"}
                    </h3>
                    <p className="text-gray-600">Score: {submitResult.score} points</p>
                  </div>
                </div>

                {submitResult.passed && (
                  <div className="flex items-center gap-4 mb-4 p-3 bg-white dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-yellow-500" />
                      <span className="font-medium">+{submitResult.xpEarned} XP</span>
                    </div>
                    {submitResult.streak && (
                      <div className="flex items-center gap-2">
                        <Flame className="h-5 w-5 text-orange-500" />
                        <span className="font-medium">{submitResult.streak.new_streak} Day Streak!</span>
                        {submitResult.streak.streak_bonus > 1 && (
                          <span className="text-sm text-gray-500">
                            ({submitResult.streak.streak_bonus.toFixed(1)}x bonus)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Test Results */}
                {testResults && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-600 mb-2">Test Results:</p>
                    {testResults.map((result, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-lg ${
                          result.passed
                            ? "bg-green-100 dark:bg-green-800/30"
                            : "bg-red-100 dark:bg-red-800/30"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">Test {i + 1}</span>
                          <span className={result.passed ? "text-green-600" : "text-red-600"}>
                            {result.passed ? `+${result.points} pts` : "0 pts"}
                          </span>
                        </div>
                        {!result.passed && (
                          <div className="text-sm space-y-1">
                            <p><span className="text-gray-500">Input:</span> <code>{result.input}</code></p>
                            <p><span className="text-gray-500">Expected:</span> <code>{result.expected}</code></p>
                            <p><span className="text-gray-500">Got:</span> <code>{result.actual}</code></p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Already Completed */}
            {alreadyCompleted && userSubmission && (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                  <div>
                    <h3 className="text-xl font-bold text-green-700">Challenge Completed!</h3>
                    <p className="text-gray-600">
                      You solved this on {new Date(userSubmission.submitted_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <p className="text-gray-600">
                  Score: {userSubmission.score} points • Language: {userSubmission.language}
                </p>
                <Link
                  href="/daily/leaderboard"
                  className="inline-flex items-center gap-1 text-green-600 hover:underline mt-4"
                >
                  View Today&apos;s Leaderboard <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            )}

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl">
                {error}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
