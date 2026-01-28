"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { Code2, Clock, Trophy, Swords, Check, X, Send, Play } from "lucide-react";
import dynamic from "next/dynamic";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

interface DuelData {
  id: string;
  status: string;
  language: string;
  challenge: {
    id: string;
    title: string;
    description: string;
    difficulty: string;
    category?: string;
    time_limit_seconds: number;
    test_cases: Array<{ input: string; expected_output: string; points: number }>;
    total_test_cases: number;
    starter_code?: Record<string, string>;
  };
  my_role: string;
  my_username: string;
  my_rating: number;
  my_score: number;
  my_submitted: boolean;
  opponent_username: string;
  opponent_rating: number;
  opponent_score: number;
  opponent_submitted: boolean;
  opponent_is_bot: boolean;
  winner_id?: string;
  did_win?: boolean;
  my_rating_change?: number;
  started_at: string;
  ended_at?: string;
  time_remaining?: number;
  submissions: Array<{
    id: string;
    score: number;
    tests_passed: number;
    tests_total: number;
    status: string;
    submitted_at: string;
  }>;
}

interface TestResult {
  input: string;
  expected: string;
  actual?: string;
  passed: boolean;
}

const STARTER_CODE: Record<string, string> = {
  python: `# Write your solution here
def solve(input_data):
    # Parse input and solve
    pass

# Read input
import sys
input_data = sys.stdin.read().strip()
result = solve(input_data)
print(result)`,
  javascript: `// Write your solution here
function solve(inputData) {
  // Parse input and solve
}

// Read input
const readline = require('readline');
let input = '';
process.stdin.on('data', data => input += data);
process.stdin.on('end', () => {
  const result = solve(input.trim());
  console.log(result);
});`,
  java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        // Read input and solve
        
    }
}`,
  cpp: `#include <iostream>
#include <vector>
#include <string>
using namespace std;

int main() {
    // Read input and solve
    
    return 0;
}`,
  go: `package main

import (
    "bufio"
    "fmt"
    "os"
)

func main() {
    reader := bufio.NewReader(os.Stdin)
    // Read input and solve
    
}`,
  rust: `use std::io::{self, BufRead};

fn main() {
    let stdin = io::stdin();
    // Read input and solve
    
}`,
};

export default function DuelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: duelId } = use(params);
  const { data: session } = useSession();
  const router = useRouter();

  const [duel, setDuel] = useState<DuelData | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [error, setError] = useState("");
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  // Fetch duel data
  const fetchDuel = useCallback(async () => {
    try {
      const res = await fetch(`/api/duels/${duelId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load duel");
      }

      setDuel(data);
      setTimeRemaining(data.time_remaining);

      // Set initial code if not already set
      if (!code && data.status === "active") {
        const starterCode =
          data.challenge?.starter_code?.[data.language] ||
          STARTER_CODE[data.language] ||
          "// Start coding here";
        setCode(starterCode);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load duel");
    } finally {
      setLoading(false);
    }
  }, [duelId, code]);

  useEffect(() => {
    fetchDuel();
  }, [fetchDuel]);

  // Countdown timer
  useEffect(() => {
    if (!duel || duel.status !== "active" || timeRemaining === null) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [duel?.status, timeRemaining]);

  // Poll for opponent status
  useEffect(() => {
    if (!duel || duel.status !== "active") return;

    const pollInterval = setInterval(async () => {
      const res = await fetch(`/api/duels/${duelId}`);
      const data = await res.json();

      if (res.ok) {
        setDuel(data);
        if (data.status === "completed") {
          clearInterval(pollInterval);
        }
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [duel?.status, duelId]);

  const runTests = async () => {
    if (!code.trim()) {
      setError("Please write some code first");
      return;
    }

    setTesting(true);
    setError("");
    setTestResults([]);

    try {
      const res = await fetch(`/api/duels/${duelId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, is_final: false }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Test failed");
      }

      // Show results
      setTestResults(
        duel?.challenge?.test_cases.map((tc, i) => ({
          input: tc.input,
          expected: tc.expected_output,
          passed: i < data.tests_passed,
        })) || []
      );

      // Refresh duel data
      fetchDuel();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Test failed");
    } finally {
      setTesting(false);
    }
  };

  const submitFinal = async () => {
    if (!code.trim()) {
      setError("Please write some code first");
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to submit? This is your final answer."
    );
    if (!confirmed) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/duels/${duelId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, is_final: true }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Submission failed");
      }

      // Refresh duel data
      fetchDuel();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case "easy":
        return "text-green-400";
      case "medium":
        return "text-yellow-400";
      case "hard":
        return "text-orange-400";
      case "expert":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading duel...</p>
        </div>
      </div>
    );
  }

  if (!duel) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <X className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Duel Not Found</h1>
          <p className="text-gray-400 mb-6">{error || "This duel doesn't exist or you don't have access."}</p>
          <Link href="/duels" className="text-blue-400 hover:text-blue-300">
            Back to Duels
          </Link>
        </div>
      </div>
    );
  }

  // Completed duel view
  if (duel.status === "completed") {
    return (
      <div className="min-h-screen bg-gray-900">
        <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur">
          <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Code2 className="h-8 w-8 text-blue-500" />
              <span className="text-2xl font-bold text-white">CodeComp</span>
            </Link>
            <Link
              href="/duels"
              className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700"
            >
              Back to Duels
            </Link>
          </nav>
        </header>

        <main className="container mx-auto px-4 py-12 max-w-2xl">
          <div className="bg-gray-800 rounded-xl p-8 text-center">
            {duel.did_win ? (
              <>
                <Trophy className="h-20 w-20 text-yellow-400 mx-auto mb-4" />
                <h1 className="text-4xl font-bold text-yellow-400 mb-2">Victory!</h1>
              </>
            ) : duel.winner_id ? (
              <>
                <X className="h-20 w-20 text-red-400 mx-auto mb-4" />
                <h1 className="text-4xl font-bold text-red-400 mb-2">Defeat</h1>
              </>
            ) : (
              <>
                <Swords className="h-20 w-20 text-gray-400 mx-auto mb-4" />
                <h1 className="text-4xl font-bold text-gray-400 mb-2">Draw</h1>
              </>
            )}

            <p className="text-gray-400 mb-8">
              {duel.challenge?.title} • {duel.challenge?.difficulty}
            </p>

            {/* Score Comparison */}
            <div className="flex items-center justify-center gap-8 mb-8">
              <div className="text-center">
                <p className="text-gray-400 text-sm">{duel.my_username}</p>
                <p className="text-4xl font-bold text-white">{duel.my_score}</p>
                <p className="text-gray-500">Rating: {duel.my_rating}</p>
              </div>
              <div className="text-2xl text-gray-600">vs</div>
              <div className="text-center">
                <p className="text-gray-400 text-sm">
                  {duel.opponent_username}
                  {duel.opponent_is_bot && " 🤖"}
                </p>
                <p className="text-4xl font-bold text-white">{duel.opponent_score}</p>
                <p className="text-gray-500">Rating: {duel.opponent_rating}</p>
              </div>
            </div>

            {/* Rating Change */}
            {duel.my_rating_change !== undefined && (
              <div className="bg-gray-700 rounded-lg p-4 mb-6">
                <p className="text-gray-400 mb-1">Rating Change</p>
                <p
                  className={`text-3xl font-bold ${
                    duel.my_rating_change > 0
                      ? "text-green-400"
                      : duel.my_rating_change < 0
                      ? "text-red-400"
                      : "text-gray-400"
                  }`}
                >
                  {duel.my_rating_change > 0 ? "+" : ""}
                  {duel.my_rating_change}
                </p>
              </div>
            )}

            <div className="flex gap-4 justify-center">
              <Link
                href="/duels"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Play Again
              </Link>
              <Link
                href="/leaderboard/skill"
                className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                View Leaderboard
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Active duel view
  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Top Bar */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <Code2 className="h-6 w-6 text-blue-500" />
            <span className="font-bold text-white hidden sm:block">CodeComp</span>
          </Link>
          <div className="h-6 w-px bg-gray-700" />
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-1 rounded text-xs font-medium ${getDifficultyColor(
                duel.challenge?.difficulty || ""
              )} bg-gray-700`}
            >
              {duel.challenge?.difficulty}
            </span>
            <span className="text-white font-medium">{duel.challenge?.title}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Timer */}
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-lg ${
              timeRemaining !== null && timeRemaining < 60
                ? "bg-red-900/50 text-red-400"
                : "bg-gray-700 text-white"
            }`}
          >
            <Clock className="h-4 w-4" />
            <span className="font-mono font-bold">
              {timeRemaining !== null ? formatTime(timeRemaining) : "--:--"}
            </span>
          </div>

          {/* Players */}
          <div className="hidden md:flex items-center gap-4">
            <div className="text-right">
              <p className="text-white text-sm font-medium">
                {duel.my_username}
                {duel.my_submitted && <Check className="h-4 w-4 inline ml-1 text-green-400" />}
              </p>
              <p className="text-gray-400 text-xs">{duel.my_rating}</p>
            </div>
            <span className="text-gray-500">vs</span>
            <div>
              <p className="text-white text-sm font-medium">
                {duel.opponent_username}
                {duel.opponent_is_bot && " 🤖"}
                {duel.opponent_submitted && <Check className="h-4 w-4 inline ml-1 text-green-400" />}
              </p>
              <p className="text-gray-400 text-xs">{duel.opponent_rating}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Problem Panel */}
        <div className="w-1/3 min-w-[300px] border-r border-gray-700 overflow-y-auto p-4 bg-gray-850">
          <h2 className="text-xl font-bold text-white mb-4">{duel.challenge?.title}</h2>
          
          <div className="prose prose-invert prose-sm max-w-none mb-6">
            <p className="text-gray-300 whitespace-pre-wrap">{duel.challenge?.description}</p>
          </div>

          <h3 className="text-lg font-semibold text-white mb-3">Sample Test Cases</h3>
          <div className="space-y-4">
            {duel.challenge?.test_cases.map((tc, i) => (
              <div key={i} className="bg-gray-800 rounded-lg p-3">
                <div className="mb-2">
                  <span className="text-gray-400 text-xs">Input:</span>
                  <pre className="text-green-400 text-sm mt-1 bg-gray-900 p-2 rounded overflow-x-auto">
                    {tc.input}
                  </pre>
                </div>
                <div>
                  <span className="text-gray-400 text-xs">Expected Output:</span>
                  <pre className="text-blue-400 text-sm mt-1 bg-gray-900 p-2 rounded overflow-x-auto">
                    {tc.expected_output}
                  </pre>
                </div>
              </div>
            ))}
          </div>

          <p className="text-gray-500 text-sm mt-4">
            {duel.challenge?.total_test_cases} total test cases (some hidden)
          </p>

          {/* Test Results */}
          {testResults.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-white mb-3">Test Results</h3>
              <div className="space-y-2">
                {testResults.map((result, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-2 p-2 rounded ${
                      result.passed ? "bg-green-900/30" : "bg-red-900/30"
                    }`}
                  >
                    {result.passed ? (
                      <Check className="h-4 w-4 text-green-400" />
                    ) : (
                      <X className="h-4 w-4 text-red-400" />
                    )}
                    <span className={result.passed ? "text-green-400" : "text-red-400"}>
                      Test {i + 1}: {result.passed ? "Passed" : "Failed"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Code Editor Panel */}
        <div className="flex-1 flex flex-col">
          {error && (
            <div className="bg-red-900/50 border-b border-red-700 px-4 py-2 text-red-300 text-sm">
              {error}
            </div>
          )}

          <div className="flex-1">
            <MonacoEditor
              height="100%"
              language={duel.language}
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value || "")}
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                padding: { top: 16 },
                automaticLayout: true,
              }}
            />
          </div>

          {/* Bottom Action Bar */}
          <div className="bg-gray-800 border-t border-gray-700 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">Language:</span>
              <span className="text-white font-medium">{duel.language}</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={runTests}
                disabled={testing || submitting || duel.my_submitted}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50"
              >
                <Play className="h-4 w-4" />
                {testing ? "Running..." : "Run Tests"}
              </button>
              <button
                onClick={submitFinal}
                disabled={submitting || testing || duel.my_submitted}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-semibold"
              >
                <Send className="h-4 w-4" />
                {submitting ? "Submitting..." : duel.my_submitted ? "Submitted" : "Submit Final"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
