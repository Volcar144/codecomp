"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { Loading } from "@/components/ui/Loading";
import dynamic from "next/dynamic";
import { 
  Code2, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  ArrowLeft,
  Copy,
  Check,
  Eye,
  EyeOff
} from "lucide-react";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

interface TestResult {
  id: string;
  passed: boolean;
  execution_time: number | null;
  error_message: string | null;
  points: number;
  input: string;
  expected_output: string;
  actual_output: string | null;
  is_hidden: boolean;
}

interface Submission {
  id: string;
  competition_id: string;
  competition_title: string;
  user_id: string;
  code: string;
  language: string;
  status: string;
  score: number;
  execution_time: number | null;
  memory_used: number | null;
  error_message: string | null;
  submitted_at: string;
  test_results: TestResult[];
  is_owner: boolean;
  is_creator: boolean;
}

const STATUS_CONFIG = {
  passed: { color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/20", icon: CheckCircle, label: "Passed" },
  failed: { color: "text-red-600", bg: "bg-red-100 dark:bg-red-900/20", icon: XCircle, label: "Failed" },
  pending: { color: "text-yellow-600", bg: "bg-yellow-100 dark:bg-yellow-900/20", icon: AlertCircle, label: "Pending" },
  running: { color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/20", icon: Clock, label: "Running" },
};

const LANGUAGE_MAP: Record<string, string> = {
  python: "python",
  javascript: "javascript",
  java: "java",
  cpp: "cpp",
  csharp: "csharp",
  go: "go",
  rust: "rust",
};

export default function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session, isPending } = useSession();
  
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showHidden, setShowHidden] = useState(false);

  useEffect(() => {
    if (!isPending && session?.user) {
      fetchSubmission();
    }
  }, [isPending, session, id]);

  const fetchSubmission = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/submissions/${id}`);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch submission");
      }
      
      const data = await response.json();
      setSubmission(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async () => {
    if (!submission?.code) return;
    try {
      await navigator.clipboard.writeText(submission.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      console.error("Failed to copy code");
    }
  };

  if (isPending || loading) {
    return <Loading />;
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please sign in to view submissions</h1>
          <Link
            href="/login"
            className="bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded-lg"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error || "Submission not found"}
          </div>
          <Link href="/submissions" className="text-blue-600 hover:underline">
            ← Back to submissions
          </Link>
        </div>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[submission.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;
  const passedTests = submission.test_results.filter((t) => t.passed).length;
  const totalTests = submission.test_results.length;

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
              href="/submissions"
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
            >
              All Submissions
            </Link>
          </div>
        </nav>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Back Link & Header */}
        <Link
          href={`/submissions?competition_id=${submission.competition_id}`}
          className="inline-flex items-center gap-1 text-blue-600 hover:underline mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to submissions
        </Link>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Code Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <h2 className="font-semibold">Submitted Code</h2>
                  <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded font-mono text-xs">
                    {submission.language}
                  </span>
                </div>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <div className="h-[500px]">
                <MonacoEditor
                  height="100%"
                  language={LANGUAGE_MAP[submission.language] || "plaintext"}
                  value={submission.code}
                  theme="vs-dark"
                  options={{
                    readOnly: true,
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

          {/* Info Panel */}
          <div className="space-y-6">
            {/* Submission Info */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h2 className="font-semibold mb-4">Submission Details</h2>
              
              <div className="space-y-4">
                <div>
                  <Link 
                    href={`/competitions/${submission.competition_id}`}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    {submission.competition_title}
                  </Link>
                </div>

                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${statusConfig.bg}`}>
                  <StatusIcon className={`h-4 w-4 ${statusConfig.color}`} />
                  <span className={`font-medium ${statusConfig.color}`}>{statusConfig.label}</span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Score</p>
                    <p className="text-2xl font-bold text-blue-600">{submission.score}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Tests Passed</p>
                    <p className="text-2xl font-bold">{passedTests}/{totalTests}</p>
                  </div>
                </div>

                {submission.execution_time && (
                  <div className="text-sm">
                    <p className="text-gray-500">Execution Time</p>
                    <p className="font-medium">{submission.execution_time}ms</p>
                  </div>
                )}

                {submission.memory_used && (
                  <div className="text-sm">
                    <p className="text-gray-500">Memory Used</p>
                    <p className="font-medium">{submission.memory_used} KB</p>
                  </div>
                )}

                <div className="text-sm">
                  <p className="text-gray-500">Submitted</p>
                  <p className="font-medium">{new Date(submission.submitted_at).toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Test Results */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Test Results</h2>
                {submission.test_results.some((t) => t.is_hidden) && submission.is_creator && (
                  <button
                    onClick={() => setShowHidden(!showHidden)}
                    className="text-xs flex items-center gap-1 text-gray-500 hover:text-gray-700"
                  >
                    {showHidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    {showHidden ? "Hide details" : "Show hidden"}
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {submission.test_results.map((result, idx) => (
                  <div
                    key={result.id}
                    className={`p-3 rounded-lg ${
                      result.passed
                        ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                        : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {result.passed ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <span className="font-medium text-sm">
                          Test {idx + 1}
                          {result.is_hidden && " (Hidden)"}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">{result.points} pts</span>
                    </div>

                    {(!result.is_hidden || showHidden) && !result.passed && (
                      <div className="text-xs space-y-1 mt-2">
                        <div>
                          <span className="font-medium text-gray-600 dark:text-gray-400">Input:</span>
                          <pre className="mt-0.5 p-2 bg-gray-100 dark:bg-gray-700 rounded overflow-x-auto">
                            {result.input}
                          </pre>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600 dark:text-gray-400">Expected:</span>
                          <pre className="mt-0.5 p-2 bg-gray-100 dark:bg-gray-700 rounded overflow-x-auto">
                            {result.expected_output}
                          </pre>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600 dark:text-gray-400">Got:</span>
                          <pre className="mt-0.5 p-2 bg-gray-100 dark:bg-gray-700 rounded overflow-x-auto">
                            {result.actual_output || "(no output)"}
                          </pre>
                        </div>
                        {result.error_message && (
                          <div className="text-red-600 dark:text-red-400">
                            <span className="font-medium">Error:</span> {result.error_message}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
