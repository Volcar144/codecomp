import Link from "next/link";
import { Code2, Calendar, Trophy, Users, FileText } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { CompetitionManagement } from "@/components/CompetitionManagement";

async function getCompetition(id: string) {
  const { data, error } = await supabase
    .from("competitions")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return null;
  }

  // Get prizes for this competition
  const { data: prizes } = await supabase
    .from("prizes")
    .select("*")
    .eq("competition_id", id)
    .order("rank", { ascending: true });

  // Get test case count
  const { count: testCaseCount } = await supabase
    .from("test_cases")
    .select("*", { count: "exact", head: true })
    .eq("competition_id", id);

  return {
    ...data,
    prizes: prizes || [],
    testCaseCount: testCaseCount || 0,
  };
}

async function getCurrentUser() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    return session?.user?.id || null;
  } catch {
    return null;
  }
}

export default async function CompetitionDetailPage({ params }: { params: { id: string } }) {
  const competition = await getCompetition(params.id);
  const currentUserId = await getCurrentUser();
  const isCreator = currentUserId === competition?.creator_id;

  if (!competition) {
    notFound();
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
                {competition.allowed_languages.map((lang: string) => (
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

            {/* Creator Management Section */}
            {isCreator && (
              <CompetitionManagement
                competitionId={params.id}
                isPublic={competition.is_public ?? true}
                inviteCode={competition.invite_code}
                testCaseCount={competition.testCaseCount}
              />
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Trophy className="h-6 w-6 text-yellow-500" />
                Prizes
              </h2>
              <div className="space-y-3">
                {competition.prizes.map((prize: any) => (
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
