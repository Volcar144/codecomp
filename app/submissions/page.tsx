"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { Loading } from "@/components/ui/Loading";
import { 
  Code2, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  ChevronRight,
  Filter,
  Calendar,
  Loader2
} from "lucide-react";

interface Submission {
  id: string;
  competition_id: string;
  competition_title: string;
  code: string;
  language: string;
  status: string;
  score: number;
  execution_time: number | null;
  memory_used: number | null;
  error_message: string | null;
  submitted_at: string;
}

const STATUS_CONFIG = {
  passed: { color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/20", icon: CheckCircle },
  failed: { color: "text-red-600", bg: "bg-red-100 dark:bg-red-900/20", icon: XCircle },
  pending: { color: "text-yellow-600", bg: "bg-yellow-100 dark:bg-yellow-900/20", icon: AlertCircle },
  running: { color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/20", icon: Clock },
};

export default function SubmissionHistoryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Loading submissions...</p>
        </div>
      </div>
    }>
      <SubmissionHistoryContent />
    </Suspense>
  );
}

function SubmissionHistoryContent() {
  const { data: session, isPending } = useSession();
  const searchParams = useSearchParams();
  const competitionId = searchParams.get("competition_id");
  
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");

  useEffect(() => {
    if (!isPending && session?.user) {
      fetchSubmissions();
    }
  }, [isPending, session, competitionId]);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (competitionId) params.set("competition_id", competitionId);
      
      const response = await fetch(`/api/submissions/history?${params}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch submissions");
      }
      
      const data = await response.json();
      setSubmissions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const filteredSubmissions = submissions.filter((s) => {
    if (selectedLanguage && s.language !== selectedLanguage) return false;
    if (selectedStatus && s.status !== selectedStatus) return false;
    return true;
  });

  const uniqueLanguages = [...new Set(submissions.map((s) => s.language))];
  const uniqueStatuses = [...new Set(submissions.map((s) => s.status))];

  if (isPending || loading) {
    return <Loading />;
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please sign in to view your submissions</h1>
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
              href="/profile"
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
            >
              Profile
            </Link>
            <Link
              href="/competitions"
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
            >
              Competitions
            </Link>
          </div>
        </nav>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Submission History</h1>
            <p className="text-gray-600 dark:text-gray-400">
              {competitionId 
                ? "Your submissions for this competition" 
                : "All your code submissions across competitions"}
            </p>
          </div>
          {competitionId && (
            <Link
              href="/submissions"
              className="text-blue-600 hover:underline"
            >
              View all submissions →
            </Link>
          )}
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
            >
              <option value="">All Languages</option>
              {uniqueLanguages.map((lang) => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
            
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
            >
              <option value="">All Statuses</option>
              {uniqueStatuses.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>

            {(selectedLanguage || selectedStatus) && (
              <button
                onClick={() => { setSelectedLanguage(""); setSelectedStatus(""); }}
                className="text-sm text-blue-600 hover:underline"
              >
                Clear filters
              </button>
            )}
            
            <span className="text-sm text-gray-500 ml-auto">
              {filteredSubmissions.length} submission{filteredSubmissions.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Submissions List */}
        {filteredSubmissions.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
            <Code2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No submissions yet</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Start solving challenges to see your submission history here.
            </p>
            <Link
              href="/competitions"
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Browse Competitions
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSubmissions.map((submission) => {
              const statusConfig = STATUS_CONFIG[submission.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
              const StatusIcon = statusConfig.icon;
              
              return (
                <Link
                  key={submission.id}
                  href={`/submissions/${submission.id}`}
                  className="block bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{submission.competition_title}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                          <StatusIcon className="inline h-3 w-3 mr-1" />
                          {submission.status}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(submission.submitted_at).toLocaleString()}
                        </span>
                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded font-mono text-xs">
                          {submission.language}
                        </span>
                        {submission.execution_time && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {submission.execution_time}ms
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">{submission.score}</div>
                        <div className="text-xs text-gray-500">points</div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
