import Link from "next/link";
import { Code2, Calendar, Trophy, Users, FileText } from "lucide-react";

// Mock data - in production this would come from Supabase
const competition = {
  id: "1",
  title: "Algorithm Challenge 2024",
  description: "Test your algorithmic skills in this competition featuring dynamic programming, graph theory, and more.",
  rules: "1. No plagiarism allowed\n2. You can submit multiple times\n3. Your best submission will be counted\n4. Time limit: 2 seconds per test case",
  start_date: "2024-02-01T00:00:00Z",
  end_date: "2024-02-28T23:59:59Z",
  allowed_languages: ["python", "javascript", "java", "cpp"],
  participants: 245,
  status: "active",
  prizes: [
    { rank: 1, title: "First Place", value: "$1000" },
    { rank: 2, title: "Second Place", value: "$500" },
    { rank: 3, title: "Third Place", value: "$250" },
  ],
};

export default function CompetitionDetailPage({ params }: { params: { id: string } }) {
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
              All Competitions
            </Link>
          </div>
        </nav>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <h1 className="text-4xl font-bold">{competition.title}</h1>
            <span
              className={`px-4 py-2 rounded-full text-sm font-semibold ${
                competition.status === "active"
                  ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                  : "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
              }`}
            >
              {competition.status}
            </span>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-lg mb-6">
            {competition.description}
          </p>

          <div className="flex gap-6 text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              <span>
                {new Date(competition.start_date).toLocaleDateString()} -{" "}
                {new Date(competition.end_date).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <span>{competition.participants} participants</span>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <FileText className="h-6 w-6" />
                Rules & Guidelines
              </h2>
              <div className="prose dark:prose-invert max-w-none">
                <pre className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                  {competition.rules}
                </pre>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-4">Allowed Languages</h2>
              <div className="flex flex-wrap gap-2">
                {competition.allowed_languages.map((lang) => (
                  <span
                    key={lang}
                    className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-sm font-semibold"
                  >
                    {lang}
                  </span>
                ))}
              </div>
            </div>

            <Link
              href={`/competitions/${params.id}/submit`}
              className="block w-full bg-blue-600 text-white text-center py-4 px-6 rounded-lg hover:bg-blue-700 font-semibold text-lg"
            >
              Start Coding →
            </Link>
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Trophy className="h-6 w-6 text-yellow-500" />
                Prizes
              </h2>
              <div className="space-y-3">
                {competition.prizes.map((prize) => (
                  <div key={prize.rank} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <div className="font-semibold">{prize.title}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Rank #{prize.rank}
                      </div>
                    </div>
                    <div className="text-xl font-bold text-blue-600">{prize.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-4">Leaderboard</h2>
              <Link
                href={`/competitions/${params.id}/leaderboard`}
                className="block text-center bg-gray-100 dark:bg-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-semibold"
              >
                View Full Leaderboard
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
