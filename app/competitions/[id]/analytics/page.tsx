"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { 
  ArrowLeft, 
  Users, 
  FileCode, 
  Trophy, 
  TrendingUp,
  BarChart3,
  PieChart,
  Calendar,
  Loader2,
  AlertCircle
} from "lucide-react";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface AnalyticsData {
  competition: {
    id: string;
    title: string;
  };
  summary: {
    totalSubmissions: number;
    uniqueParticipants: number;
    passRate: number;
    averageScore: number;
  };
  languageStats: { language: string; count: number }[];
  scoreDistribution: { range: string; count: number }[];
  dailySubmissions: { date: string; count: number }[];
  topPerformers: { user_id: string; name: string | null; email: string; best_score: number; rank: number }[];
}

export default function CompetitionAnalyticsPage({ params }: RouteParams) {
  const resolvedParams = use(params);
  const competitionId = resolvedParams.id;
  
  const { data: session, isPending: sessionLoading } = useSession();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch(`/api/competitions/${competitionId}/analytics`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to fetch analytics");
        }
        const data = await res.json();
        setAnalytics(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    }

    if (!sessionLoading && session) {
      fetchAnalytics();
    }
  }, [competitionId, session, sessionLoading]);

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Please sign in to view analytics</p>
          <Link href="/login" className="mt-4 inline-block text-blue-600 hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">{error}</p>
          <Link 
            href={`/competitions/${competitionId}`}
            className="mt-4 inline-block text-blue-600 hover:underline"
          >
            Back to Competition
          </Link>
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  const maxDailyCount = Math.max(...analytics.dailySubmissions.map(d => d.count), 1);
  const maxScoreCount = Math.max(...analytics.scoreDistribution.map(d => d.count), 1);
  const maxLangCount = Math.max(...analytics.languageStats.map(d => d.count), 1);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <Link
            href={`/competitions/${competitionId}`}
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Competition
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <BarChart3 className="w-7 h-7 text-blue-600" />
            Analytics: {analytics.competition.title}
          </h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={<FileCode className="w-6 h-6" />}
            label="Total Submissions"
            value={analytics.summary.totalSubmissions}
            color="blue"
          />
          <StatCard
            icon={<Users className="w-6 h-6" />}
            label="Unique Participants"
            value={analytics.summary.uniqueParticipants}
            color="green"
          />
          <StatCard
            icon={<Trophy className="w-6 h-6" />}
            label="Pass Rate"
            value={`${analytics.summary.passRate}%`}
            color="yellow"
          />
          <StatCard
            icon={<TrendingUp className="w-6 h-6" />}
            label="Average Score"
            value={analytics.summary.averageScore}
            color="purple"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Language Distribution */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-blue-600" />
              Language Distribution
            </h2>
            {analytics.languageStats.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">No submissions yet</p>
            ) : (
              <div className="space-y-3">
                {analytics.languageStats.map((lang) => (
                  <div key={lang.language}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 dark:text-gray-300 capitalize">{lang.language}</span>
                      <span className="text-gray-500">{lang.count}</span>
                    </div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-500"
                        style={{ width: `${(lang.count / maxLangCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Score Distribution */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-green-600" />
              Score Distribution
            </h2>
            <div className="flex items-end justify-between h-48 gap-2">
              {analytics.scoreDistribution.map((bucket) => (
                <div key={bucket.range} className="flex-1 flex flex-col items-center">
                  <div className="w-full flex flex-col items-center justify-end h-40">
                    <span className="text-xs text-gray-500 mb-1">{bucket.count}</span>
                    <div
                      className="w-full bg-green-500 rounded-t transition-all duration-500"
                      style={{ 
                        height: bucket.count > 0 ? `${(bucket.count / maxScoreCount) * 100}%` : '4px',
                        minHeight: '4px'
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-400 mt-2">{bucket.range}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Daily Submissions Trend */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              Daily Submissions (Last 30 Days)
            </h2>
            {analytics.dailySubmissions.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">No submissions in the last 30 days</p>
            ) : (
              <div className="flex items-end gap-1 h-48 overflow-x-auto">
                {analytics.dailySubmissions.map((day) => (
                  <div key={day.date} className="flex-shrink-0 flex flex-col items-center" style={{ minWidth: '20px' }}>
                    <div className="w-full flex flex-col items-center justify-end h-40">
                      <div
                        className="w-4 bg-purple-500 rounded-t transition-all duration-300 hover:bg-purple-600"
                        style={{ 
                          height: day.count > 0 ? `${(day.count / maxDailyCount) * 100}%` : '4px',
                          minHeight: '4px'
                        }}
                        title={`${day.date}: ${day.count} submissions`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Performers */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-600" />
              Top Performers
            </h2>
            {analytics.topPerformers.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">No successful submissions yet</p>
            ) : (
              <div className="space-y-3">
                {analytics.topPerformers.map((performer) => (
                  <div
                    key={performer.user_id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        performer.rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                        performer.rank === 2 ? 'bg-gray-100 text-gray-700' :
                        performer.rank === 3 ? 'bg-orange-100 text-orange-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        #{performer.rank}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {performer.name || performer.email.split('@')[0]}
                        </p>
                        <p className="text-xs text-gray-500">{performer.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900 dark:text-white">{performer.best_score}</p>
                      <p className="text-xs text-gray-500">points</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ 
  icon, 
  label, 
  value, 
  color 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string | number; 
  color: 'blue' | 'green' | 'yellow' | 'purple';
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    yellow: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${colorClasses[color]}`}>
        {icon}
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}
