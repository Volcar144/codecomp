"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { Loading } from "@/components/ui/Loading";
import { 
  Code2, Trophy, Clock, Target, Star, Calendar, TrendingUp, Award, 
  Swords, Flame, Medal, Users, Zap, Crown, ChevronRight 
} from "lucide-react";

interface Submission {
  id: string;
  competition_id: string;
  competition_title: string;
  language: string;
  score: number;
  status: string;
  submitted_at: string;
}

interface LeaderboardEntry {
  competition_id: string;
  competition_title: string;
  rank: number;
  best_score: number;
  best_time: number | null;
  submission_count: number;
}

interface DuelStats {
  total_duels: number;
  wins: number;
  losses: number;
  draws: number;
  win_streak: number;
  best_win_streak: number;
}

interface SkillInfo {
  skill_rating: number;
  skill_tier: string;
  total_competitions: number;
  total_wins: number;
  rating_change_30d: number;
}

interface Achievement {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  rarity: string;
  xp_reward: number;
  unlocked: boolean;
  unlocked_at: string | null;
  progress: number;
  requirement_value: number;
}

interface StreakInfo {
  current_streak: number;
  longest_streak: number;
  total_daily_completed: number;
  total_xp_earned: number;
  last_completed_date: string | null;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  type: string;
  role: string;
}

interface UserStats {
  totalSubmissions: number;
  totalCompetitions: number;
  totalWins: number;
  averageScore: number;
  bestRank: number;
  submissions: Submission[];
  leaderboardEntries: LeaderboardEntry[];
  duelStats: DuelStats;
  skillInfo: SkillInfo;
  achievements: Achievement[];
  streakInfo: StreakInfo;
  organizations: Organization[];
}

const SKILL_TIERS = [
  { name: "Bronze", min: 0, max: 1199, color: "text-amber-600", bg: "bg-amber-100" },
  { name: "Silver", min: 1200, max: 1399, color: "text-gray-400", bg: "bg-gray-200" },
  { name: "Gold", min: 1400, max: 1599, color: "text-yellow-500", bg: "bg-yellow-100" },
  { name: "Platinum", min: 1600, max: 1799, color: "text-cyan-500", bg: "bg-cyan-100" },
  { name: "Diamond", min: 1800, max: 1999, color: "text-blue-500", bg: "bg-blue-100" },
  { name: "Master", min: 2000, max: 2199, color: "text-purple-500", bg: "bg-purple-100" },
  { name: "Grandmaster", min: 2200, max: 9999, color: "text-red-500", bg: "bg-red-100" },
];

const RARITY_COLORS: Record<string, string> = {
  common: "border-gray-400 bg-gray-50",
  uncommon: "border-green-500 bg-green-50",
  rare: "border-blue-500 bg-blue-50",
  epic: "border-purple-500 bg-purple-50",
  legendary: "border-yellow-500 bg-yellow-50",
};

function getTierInfo(rating: number) {
  return SKILL_TIERS.find(t => rating >= t.min && rating <= t.max) || SKILL_TIERS[0];
}

export default function ProfilePage() {
  const { data: session, isPending } = useSession();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "submissions" | "rankings" | "duels" | "achievements">("overview");

  useEffect(() => {
    if (!isPending && session?.user) {
      fetchUserStats();
    }
  }, [isPending, session]);

  const fetchUserStats = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/profile/stats");
      
      if (!response.ok) {
        throw new Error("Failed to fetch profile data");
      }
      
      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (isPending || loading) {
    return <Loading />;
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please sign in to view your profile</h1>
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

  const tierInfo = stats?.skillInfo ? getTierInfo(stats.skillInfo.skill_rating) : SKILL_TIERS[0];
  const unlockedAchievements = stats?.achievements?.filter(a => a.unlocked) || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <header className="border-b bg-white dark:bg-gray-900">
        <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Code2 className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold">CodeComp</span>
          </Link>
          <div className="flex gap-4">
            <Link href="/competitions" className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100">
              Competitions
            </Link>
            <Link href="/duels" className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100">
              Duels
            </Link>
            <Link href="/daily" className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100">
              Daily
            </Link>
            <Link href="/dashboard" className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100">
              Dashboard
            </Link>
          </div>
        </nav>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Profile Header with Skill */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-white text-4xl font-bold shadow-lg">
              {session.user.name?.[0]?.toUpperCase() || session.user.email?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{session.user.name || "User"}</h1>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${tierInfo.bg} ${tierInfo.color}`}>
                  {tierInfo.name}
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-400">{session.user.email}</p>
              <p className="text-gray-500 text-sm mt-1">
                Member since {new Date(session.user.createdAt || Date.now()).toLocaleDateString()}
              </p>
              
              {/* Organizations */}
              {stats?.organizations && stats.organizations.length > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <Users className="h-4 w-4 text-gray-400" />
                  {stats.organizations.slice(0, 3).map(org => (
                    <Link 
                      key={org.id} 
                      href={`/organizations/${org.slug}`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {org.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            
            {/* Skill Rating Display */}
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <div className={`text-4xl font-bold ${tierInfo.color}`}>
                {stats?.skillInfo?.skill_rating || 1000}
              </div>
              <p className="text-sm text-gray-500">Skill Rating</p>
              {stats?.skillInfo?.rating_change_30d !== undefined && (
                <p className={`text-xs mt-1 ${stats.skillInfo.rating_change_30d >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {stats.skillInfo.rating_change_30d >= 0 ? "+" : ""}{stats.skillInfo.rating_change_30d} (30d)
                </p>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Target className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xl font-bold">{stats?.totalSubmissions || 0}</p>
                <p className="text-gray-500 text-xs">Submissions</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <Trophy className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xl font-bold">{stats?.totalWins || 0}</p>
                <p className="text-gray-500 text-xs">Wins</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Swords className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xl font-bold">{stats?.duelStats?.wins || 0}</p>
                <p className="text-gray-500 text-xs">Duel Wins</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <Flame className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xl font-bold">{stats?.streakInfo?.current_streak || 0}</p>
                <p className="text-gray-500 text-xs">Day Streak</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <Medal className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xl font-bold">{unlockedAchievements.length}</p>
                <p className="text-gray-500 text-xs">Achievements</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-100 dark:bg-cyan-900 rounded-lg">
                <Zap className="h-5 w-5 text-cyan-600" />
              </div>
              <div>
                <p className="text-xl font-bold">{stats?.streakInfo?.total_xp_earned || 0}</p>
                <p className="text-gray-500 text-xs">Total XP</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
            {[
              { id: "overview", label: "Overview" },
              { id: "submissions", label: "Submissions" },
              { id: "rankings", label: "Rankings" },
              { id: "duels", label: "Duel History" },
              { id: "achievements", label: "Achievements" },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex-shrink-0 py-4 px-6 text-center font-medium transition-colors ${
                  activeTab === tab.id
                    ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === "overview" && (
              <div className="space-y-8">
                {/* Duel Stats Card */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Swords className="h-5 w-5" /> Duel Statistics
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
                      <p className="text-2xl font-bold text-green-600">{stats?.duelStats?.wins || 0}</p>
                      <p className="text-sm text-gray-500">Wins</p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
                      <p className="text-2xl font-bold text-red-600">{stats?.duelStats?.losses || 0}</p>
                      <p className="text-sm text-gray-500">Losses</p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
                      <p className="text-2xl font-bold text-gray-600">{stats?.duelStats?.draws || 0}</p>
                      <p className="text-sm text-gray-500">Draws</p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
                      <p className="text-2xl font-bold text-orange-600">{stats?.duelStats?.best_win_streak || 0}</p>
                      <p className="text-sm text-gray-500">Best Streak</p>
                    </div>
                  </div>
                  <Link 
                    href="/duels/history" 
                    className="inline-flex items-center gap-1 text-blue-600 hover:underline text-sm mt-3"
                  >
                    View full history <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>

                {/* Streak Progress */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Flame className="h-5 w-5" /> Daily Challenge Streak
                  </h3>
                  <div className="p-4 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-3xl font-bold text-orange-600">
                          {stats?.streakInfo?.current_streak || 0} days
                        </p>
                        <p className="text-sm text-gray-500">Current Streak</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-semibold">
                          {stats?.streakInfo?.longest_streak || 0} days
                        </p>
                        <p className="text-sm text-gray-500">Best Streak</p>
                      </div>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>{stats?.streakInfo?.total_daily_completed || 0} challenges completed</span>
                      <span>{stats?.streakInfo?.total_xp_earned || 0} XP earned</span>
                    </div>
                  </div>
                  <Link 
                    href="/daily" 
                    className="inline-flex items-center gap-1 text-blue-600 hover:underline text-sm mt-3"
                  >
                    Today&apos;s Challenge <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>

                {/* Recent Achievements */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Medal className="h-5 w-5" /> Recent Achievements
                  </h3>
                  {unlockedAchievements.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {unlockedAchievements.slice(0, 4).map(achievement => (
                        <div 
                          key={achievement.id}
                          className={`p-3 rounded-lg border-2 ${RARITY_COLORS[achievement.rarity] || RARITY_COLORS.common}`}
                        >
                          <div className="text-2xl mb-1">{achievement.icon}</div>
                          <p className="font-medium text-sm">{achievement.name}</p>
                          <p className="text-xs text-gray-500 capitalize">{achievement.rarity}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No achievements unlocked yet. Start competing!</p>
                  )}
                  <Link 
                    href="#" 
                    onClick={(e) => { e.preventDefault(); setActiveTab("achievements"); }}
                    className="inline-flex items-center gap-1 text-blue-600 hover:underline text-sm mt-3"
                  >
                    View all achievements <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            )}

            {/* Submissions Tab */}
            {activeTab === "submissions" && (
              <div>
                {stats?.submissions && stats.submissions.length > 0 ? (
                  <div className="space-y-3">
                    {stats.submissions.map((submission) => (
                      <Link
                        key={submission.id}
                        href={`/competitions/${submission.competition_id}`}
                        className="block p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{submission.competition_title || "Competition"}</p>
                            <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {new Date(submission.submitted_at).toLocaleDateString()}
                              </span>
                              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded text-xs font-medium">
                                {submission.language}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-lg font-bold ${
                              submission.status === "passed" ? "text-green-600" : "text-yellow-600"
                            }`}>
                              {submission.score} pts
                            </p>
                            <p className={`text-xs ${
                              submission.status === "passed" 
                                ? "text-green-500" 
                                : submission.status === "failed" 
                                  ? "text-red-500" 
                                  : "text-yellow-500"
                            }`}>
                              {submission.status}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No submissions yet</p>
                    <Link href="/competitions" className="text-blue-600 hover:underline">
                      Browse competitions to get started →
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Rankings Tab */}
            {activeTab === "rankings" && (
              <div>
                {stats?.leaderboardEntries && stats.leaderboardEntries.length > 0 ? (
                  <div className="space-y-3">
                    {stats.leaderboardEntries.map((entry) => (
                      <Link
                        key={entry.competition_id}
                        href={`/competitions/${entry.competition_id}/leaderboard`}
                        className="block p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                              entry.rank === 1 ? "bg-yellow-100 text-yellow-600" :
                              entry.rank === 2 ? "bg-gray-200 text-gray-600" :
                              entry.rank === 3 ? "bg-orange-100 text-orange-600" :
                              "bg-gray-100 text-gray-500"
                            }`}>
                              #{entry.rank}
                            </div>
                            <div>
                              <p className="font-medium">{entry.competition_title || "Competition"}</p>
                              <p className="text-sm text-gray-500">
                                {entry.submission_count} submission{entry.submission_count !== 1 ? "s" : ""}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-blue-600">
                              {entry.best_score} pts
                            </p>
                            {entry.best_time && (
                              <p className="text-xs text-gray-500">
                                {entry.best_time}ms
                              </p>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No ranking data yet</p>
                    <p className="text-sm">Submit solutions to competitions to appear on leaderboards</p>
                  </div>
                )}
              </div>
            )}

            {/* Duels Tab */}
            {activeTab === "duels" && (
              <div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                    <p className="text-3xl font-bold text-green-600">{stats?.duelStats?.wins || 0}</p>
                    <p className="text-sm text-gray-600">Wins</p>
                  </div>
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
                    <p className="text-3xl font-bold text-red-600">{stats?.duelStats?.losses || 0}</p>
                    <p className="text-sm text-gray-600">Losses</p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
                    <p className="text-3xl font-bold">{stats?.duelStats?.draws || 0}</p>
                    <p className="text-sm text-gray-600">Draws</p>
                  </div>
                  <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-center">
                    <p className="text-3xl font-bold text-orange-600">{stats?.duelStats?.win_streak || 0}</p>
                    <p className="text-sm text-gray-600">Current Streak</p>
                  </div>
                </div>
                
                <div className="text-center">
                  <Link 
                    href="/duels/history"
                    className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    View Full Duel History
                  </Link>
                  <p className="mt-4">
                    <Link href="/duels" className="text-blue-600 hover:underline">
                      Find a new opponent →
                    </Link>
                  </p>
                </div>
              </div>
            )}

            {/* Achievements Tab */}
            {activeTab === "achievements" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-lg font-semibold">
                      {unlockedAchievements.length} / {stats?.achievements?.length || 0} Unlocked
                    </p>
                    <p className="text-sm text-gray-500">
                      Total XP: {unlockedAchievements.reduce((sum, a) => sum + a.xp_reward, 0)}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {stats?.achievements?.map(achievement => (
                    <div 
                      key={achievement.id}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        achievement.unlocked 
                          ? RARITY_COLORS[achievement.rarity] || RARITY_COLORS.common
                          : "border-gray-200 bg-gray-100 dark:bg-gray-700 opacity-50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-3xl">{achievement.unlocked ? achievement.icon : "🔒"}</div>
                        <div className="flex-1">
                          <p className="font-semibold">{achievement.name}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{achievement.description}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className={`text-xs px-2 py-0.5 rounded capitalize ${
                              achievement.unlocked ? "" : "bg-gray-200 text-gray-600"
                            }`}>
                              {achievement.rarity}
                            </span>
                            <span className="text-xs text-yellow-600">+{achievement.xp_reward} XP</span>
                          </div>
                          {!achievement.unlocked && achievement.requirement_value > 0 && (
                            <div className="mt-2">
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{ width: `${Math.min((achievement.progress / achievement.requirement_value) * 100, 100)}%` }}
                                />
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {achievement.progress} / {achievement.requirement_value}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
