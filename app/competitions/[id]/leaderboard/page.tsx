import Link from "next/link";
import { Code2, Trophy, Medal } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";

async function getLeaderboard(competitionId: string) {
  // Get competition details
  const { data: competition, error: compError } = await supabase
    .from("competitions")
    .select("id, title")
    .eq("id", competitionId)
    .single();

  if (compError || !competition) {
    return null;
  }

  // Get leaderboard data from the view
  const { data: leaderboardData, error: leaderboardError } = await supabase
    .from("leaderboard")
    .select("*")
    .eq("competition_id", competitionId)
    .order("rank", { ascending: true });

  return {
    competition,
    leaderboardData: leaderboardData || [],
  };
}

export default async function LeaderboardPage({ params }: { params: { id: string } }) {
  const data = await getLeaderboard(params.id);

  if (!data) {
    notFound();
  }

  const { competition, leaderboardData } = data;

  function getRankBadge(rank: number) {
    if (rank === 1)
      return (
        <div className="flex items-center justify-center w-10 h-10 bg-yellow-100 dark:bg-yellow-900 rounded-full">
          <Trophy className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
        </div>
      );
    if (rank === 2)
      return (
        <div className="flex items-center justify-center w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full">
          <Medal className="h-6 w-6 text-gray-600 dark:text-gray-400" />
        </div>
      );
    if (rank === 3)
      return (
        <div className="flex items-center justify-center w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-full">
          <Medal className="h-6 w-6 text-orange-600 dark:text-orange-400" />
        </div>
      );
    return (
      <div className="flex items-center justify-center w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full">
        <span className="text-lg font-bold">{rank}</span>
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
              href={`/competitions/${params.id}`}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
            >
              Back to Competition
            </Link>
          </div>
        </nav>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Leaderboard</h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">{competition.title}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          {/* Top 3 Podium */}
          {leaderboardData.length >= 3 && (
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-8">
              <div className="grid grid-cols-3 gap-4 max-w-3xl mx-auto">
                {/* Second Place */}
                <div className="flex flex-col items-center justify-end">
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 w-full text-center mb-2">
                    <div className="flex justify-center mb-2">
                      <Medal className="h-8 w-8 text-gray-400" />
                    </div>
                    <div className="font-bold text-lg mb-1">{leaderboardData[1].username}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Score: {leaderboardData[1].best_score}%
                    </div>
                  </div>
                  <div className="bg-gray-300 dark:bg-gray-700 w-full h-24 rounded-t-lg flex items-center justify-center">
                    <span className="text-2xl font-bold">2nd</span>
                  </div>
                </div>

                {/* First Place */}
                <div className="flex flex-col items-center justify-end">
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 w-full text-center mb-2">
                    <div className="flex justify-center mb-2">
                      <Trophy className="h-8 w-8 text-yellow-500" />
                    </div>
                    <div className="font-bold text-lg mb-1">{leaderboardData[0].username}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Score: {leaderboardData[0].best_score}%
                    </div>
                  </div>
                  <div className="bg-yellow-400 dark:bg-yellow-600 w-full h-32 rounded-t-lg flex items-center justify-center">
                    <span className="text-2xl font-bold">1st</span>
                  </div>
                </div>

                {/* Third Place */}
                <div className="flex flex-col items-center justify-end">
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 w-full text-center mb-2">
                    <div className="flex justify-center mb-2">
                      <Medal className="h-8 w-8 text-orange-500" />
                    </div>
                    <div className="font-bold text-lg mb-1">{leaderboardData[2].username}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Score: {leaderboardData[2].best_score}%
                    </div>
                  </div>
                  <div className="bg-orange-400 dark:bg-orange-600 w-full h-20 rounded-t-lg flex items-center justify-center">
                    <span className="text-2xl font-bold">3rd</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Full Leaderboard Table */}
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4">Rank</th>
                    <th className="text-left py-3 px-4">Participant</th>
                    <th className="text-right py-3 px-4">Score</th>
                    <th className="text-right py-3 px-4">Best Time (ms)</th>
                    <th className="text-right py-3 px-4">Submissions</th>
                    <th className="text-right py-3 px-4">Last Submission</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboardData.map((entry) => (
                    <tr
                      key={entry.user_id}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          {getRankBadge(entry.rank)}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-semibold">{entry.username}</div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 font-semibold">
                          {entry.best_score}%
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right text-gray-600 dark:text-gray-400">
                        {entry.best_time}
                      </td>
                      <td className="py-4 px-4 text-right text-gray-600 dark:text-gray-400">
                        {entry.total_submissions}
                      </td>
                      <td className="py-4 px-4 text-right text-gray-600 dark:text-gray-400">
                        {new Date(entry.last_submission).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {leaderboardData.length === 0 && (
              <div className="text-center py-16">
                <Trophy className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500 dark:text-gray-400 text-lg">
                  No submissions yet. Be the first to compete!
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
