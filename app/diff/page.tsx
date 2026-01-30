"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "@/lib/auth-client";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import { Loading } from "@/components/ui/Loading";

const MonacoDiffEditor = dynamic(
  () => import("@monaco-editor/react").then((mod) => mod.DiffEditor),
  {
    ssr: false,
    loading: () => (
      <div className="h-full flex items-center justify-center bg-gray-800">
        <Loading />
      </div>
    ),
  }
);

interface Submission {
  id: string;
  code: string;
  language: string;
  score: number;
  execution_time: number;
  created_at: string;
  user_id?: string;
}

export default function DiffPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loading />
      </div>
    }>
      <DiffPageContent />
    </Suspense>
  );
}

function DiffPageContent() {
  const { data: session, isPending } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [submission1, setSubmission1] = useState<Submission | null>(null);
  const [submission2, setSubmission2] = useState<Submission | null>(null);
  const [userSubmissions, setUserSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sub1Id = searchParams.get("sub1");
  const sub2Id = searchParams.get("sub2");
  const competitionId = searchParams.get("competition");

  useEffect(() => {
    const fetchData = async () => {
      try {
        // If specific submissions are provided
        if (sub1Id && sub2Id) {
          const res = await fetch(
            `/api/diff?submission1=${sub1Id}&submission2=${sub2Id}`
          );
          const data = await res.json();

          if (data.error) {
            setError(data.error);
          } else {
            setSubmission1(data.submission1);
            setSubmission2(data.submission2);
          }
        }

        // If competition is provided, fetch user's submissions for selection
        if (competitionId && session?.user) {
          const res = await fetch(`/api/diff?competitionId=${competitionId}`);
          const data = await res.json();

          if (!data.error) {
            setUserSubmissions(data.submissions || []);
          }
        }
      } catch (err) {
        setError("Failed to load submissions");
      } finally {
        setLoading(false);
      }
    };

    if (!isPending) {
      fetchData();
    }
  }, [sub1Id, sub2Id, competitionId, session, isPending]);

  const handleSelectSubmission = (position: "left" | "right", id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (position === "left") {
      params.set("sub1", id);
    } else {
      params.set("sub2", id);
    }
    router.push(`/diff?${params.toString()}`);
  };

  if (isPending || loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <Navbar />

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 border-b border-gray-700 p-4">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-xl font-bold text-white mb-3">
              Code Diff Viewer
            </h1>

            {error && (
              <div className="p-3 bg-red-900/50 border border-red-600 rounded text-red-200 mb-3">
                {error}
              </div>
            )}

            {/* Submission selectors */}
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-sm">Left:</span>
                {userSubmissions.length > 0 ? (
                  <select
                    value={sub1Id || ""}
                    onChange={(e) =>
                      handleSelectSubmission("left", e.target.value)
                    }
                    className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                  >
                    <option value="">Select submission</option>
                    {userSubmissions.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {new Date(sub.created_at).toLocaleString()} - Score:{" "}
                        {sub.score}%
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-gray-500 text-sm">
                    {submission1
                      ? `Score: ${submission1.score}% - ${new Date(
                          submission1.created_at
                        ).toLocaleString()}`
                      : "No submission"}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-sm">Right:</span>
                {userSubmissions.length > 0 ? (
                  <select
                    value={sub2Id || ""}
                    onChange={(e) =>
                      handleSelectSubmission("right", e.target.value)
                    }
                    className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                  >
                    <option value="">Select submission</option>
                    {userSubmissions.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {new Date(sub.created_at).toLocaleString()} - Score:{" "}
                        {sub.score}%
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-gray-500 text-sm">
                    {submission2
                      ? `Score: ${submission2.score}% - ${new Date(
                          submission2.created_at
                        ).toLocaleString()}`
                      : "No submission"}
                  </span>
                )}
              </div>

              {submission1 && submission2 && (
                <div className="flex-1 text-right">
                  <span className="text-gray-500 text-sm">
                    {submission1.language} •{" "}
                    {calculateDiffStats(submission1.code, submission2.code)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Diff viewer */}
        <div className="flex-1 min-h-[500px]">
          {submission1 && submission2 ? (
            <MonacoDiffEditor
              height="100%"
              original={submission1.code}
              modified={submission2.code}
              language={submission1.language === "cpp" ? "cpp" : submission1.language}
              theme="vs-dark"
              options={{
                readOnly: true,
                renderSideBySide: true,
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                automaticLayout: true,
                wordWrap: "on",
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <div className="text-4xl mb-4">📊</div>
                <h2 className="text-xl font-medium text-white mb-2">
                  Compare Submissions
                </h2>
                <p className="mb-4">
                  Select two submissions to see the differences
                </p>
                {!session?.user && (
                  <Link
                    href="/login"
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white inline-block"
                  >
                    Log in to compare
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Stats footer */}
        {submission1 && submission2 && (
          <div className="bg-gray-800 border-t border-gray-700 p-4">
            <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-900 rounded p-3">
                <div className="text-gray-400 text-sm">Left Score</div>
                <div
                  className={`text-xl font-bold ${
                    submission1.score >= 70
                      ? "text-green-400"
                      : submission1.score >= 40
                      ? "text-yellow-400"
                      : "text-red-400"
                  }`}
                >
                  {submission1.score}%
                </div>
              </div>
              <div className="bg-gray-900 rounded p-3">
                <div className="text-gray-400 text-sm">Right Score</div>
                <div
                  className={`text-xl font-bold ${
                    submission2.score >= 70
                      ? "text-green-400"
                      : submission2.score >= 40
                      ? "text-yellow-400"
                      : "text-red-400"
                  }`}
                >
                  {submission2.score}%
                </div>
              </div>
              <div className="bg-gray-900 rounded p-3">
                <div className="text-gray-400 text-sm">Score Change</div>
                <div
                  className={`text-xl font-bold ${
                    submission2.score > submission1.score
                      ? "text-green-400"
                      : submission2.score < submission1.score
                      ? "text-red-400"
                      : "text-gray-400"
                  }`}
                >
                  {submission2.score > submission1.score ? "+" : ""}
                  {submission2.score - submission1.score}%
                </div>
              </div>
              <div className="bg-gray-900 rounded p-3">
                <div className="text-gray-400 text-sm">Lines Changed</div>
                <div className="text-xl font-bold text-blue-400">
                  {calculateLineChanges(submission1.code, submission2.code)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function calculateDiffStats(code1: string, code2: string): string {
  const lines1 = code1.split("\n").length;
  const lines2 = code2.split("\n").length;
  const diff = Math.abs(lines2 - lines1);
  return `${lines1} → ${lines2} lines (${diff > 0 ? (lines2 > lines1 ? "+" : "-") + diff : "no change"})`;
}

function calculateLineChanges(code1: string, code2: string): number {
  const lines1 = code1.split("\n");
  const lines2 = code2.split("\n");
  
  // Simple diff - count lines that are different
  let changes = 0;
  const maxLen = Math.max(lines1.length, lines2.length);
  
  for (let i = 0; i < maxLen; i++) {
    if (lines1[i] !== lines2[i]) {
      changes++;
    }
  }
  
  return changes;
}
