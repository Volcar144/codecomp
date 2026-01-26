import Link from "next/link";
import { Code2, Trophy, FileText, Clock } from "lucide-react";

// Mock data - in production this would come from Supabase
const userCompetitions = [
  {
    id: "1",
    title: "Algorithm Challenge 2024",
    role: "participant",
    submissions: 3,
    bestScore: 85,
    rank: 12,
  },
];

const userSubmissions = [
  {
    id: "1",
    competition: "Algorithm Challenge 2024",
    language: "Python",
    score: 85,
    status: "passed",
    submitted_at: "2024-02-15T10:30:00Z",
  },
];

export default function DashboardPage() {
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
              href="/competitions"
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
            >
              Competitions
            </Link>
            <Link
              href="/competitions/create"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create Competition
            </Link>
          </div>
        </nav>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Track your competitions and submissions
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-lg">
                <Trophy className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-3xl font-bold">{userCompetitions.length}</div>
                <div className="text-gray-600 dark:text-gray-400">Active Competitions</div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-4">
              <div className="bg-green-100 dark:bg-green-900 p-3 rounded-lg">
                <FileText className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="text-3xl font-bold">{userSubmissions.length}</div>
                <div className="text-gray-600 dark:text-gray-400">Total Submissions</div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-4">
              <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-lg">
                <Clock className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="text-3xl font-bold">
                  {userSubmissions.filter((s) => s.status === "passed").length}
                </div>
                <div className="text-gray-600 dark:text-gray-400">Passed Submissions</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4">My Competitions</h2>
            <div className="space-y-4">
              {userCompetitions.map((comp) => (
                <div
                  key={comp.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-blue-500 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold">{comp.title}</h3>
                    <span className="text-sm text-gray-500">Rank #{comp.rank}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <span>{comp.submissions} submissions</span>
                    <span>Best: {comp.bestScore}%</span>
                  </div>
                  <Link
                    href={`/competitions/${comp.id}`}
                    className="mt-3 inline-block text-blue-600 hover:text-blue-700 text-sm font-semibold"
                  >
                    View Details →
                  </Link>
                </div>
              ))}
              {userCompetitions.length === 0 && (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  You haven't joined any competitions yet
                </p>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Recent Submissions</h2>
            <div className="space-y-4">
              {userSubmissions.map((sub) => (
                <div
                  key={sub.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold">{sub.competition}</h3>
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        sub.status === "passed"
                          ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                          : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                      }`}
                    >
                      {sub.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <span>{sub.language}</span>
                    <span>Score: {sub.score}%</span>
                    <span>{new Date(sub.submitted_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
              {userSubmissions.length === 0 && (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  No submissions yet
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
