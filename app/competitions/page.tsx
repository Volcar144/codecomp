import Link from "next/link";
import { Code2, Calendar, Users } from "lucide-react";

// Mock data - in production this would come from Supabase
const competitions = [
  {
    id: "1",
    title: "Algorithm Challenge 2024",
    description: "Test your algorithmic skills in this competition featuring dynamic programming, graph theory, and more.",
    start_date: "2024-02-01T00:00:00Z",
    end_date: "2024-02-28T23:59:59Z",
    participants: 245,
    status: "active",
  },
  {
    id: "2",
    title: "Web Development Sprint",
    description: "Build a full-stack application in 48 hours using modern web technologies.",
    start_date: "2024-02-15T00:00:00Z",
    end_date: "2024-02-17T23:59:59Z",
    participants: 89,
    status: "upcoming",
  },
];

export default function CompetitionsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="border-b bg-white dark:bg-gray-900">
        <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Code2 className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold">CodeComp</span>
          </Link>
          <div className="flex gap-4">
            <Link
              href="/dashboard"
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
            >
              Dashboard
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
          <h1 className="text-4xl font-bold mb-4">Competitions</h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Browse and join coding competitions
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {competitions.map((competition) => (
            <div
              key={competition.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <h2 className="text-xl font-bold">{competition.title}</h2>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      competition.status === "active"
                        ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                    }`}
                  >
                    {competition.status}
                  </span>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {competition.description}
                </p>
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(competition.start_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{competition.participants} participants</span>
                  </div>
                </div>
                <Link
                  href={`/competitions/${competition.id}`}
                  className="block w-full text-center bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 font-semibold"
                >
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>

        {competitions.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-4">
              No competitions available yet
            </p>
            <Link
              href="/competitions/create"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
            >
              Create the First Competition
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
