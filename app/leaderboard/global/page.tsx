"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  image?: string;
  skillRating?: number;
  skillTier?: string;
  competitions?: number;
  wins?: number;
  winsThisWeek?: number;
  totalScore?: number;
  currentStreak?: number;
  longestStreak?: number;
  totalChallenges?: number;
  totalXp?: number;
}

type LeaderboardType = "skill" | "weekly" | "streaks" | "xp";

export default function GlobalLeaderboardPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<LeaderboardType>("skill");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [limit] = useState(100);

  useEffect(() => {
    fetchLeaderboard(activeTab);
  }, [activeTab, session?.user?.id]);

  async function fetchLeaderboard(type: LeaderboardType) {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/leaderboard/global?type=${type}&limit=${limit}`);
      const data = await res.json();
      setLeaderboard(data.leaderboard || []);
      setUserRank(data.userRank);
      setUserData(data.userData);
    } catch (err) {
      console.error("Error fetching leaderboard:", err);
    } finally {
      setIsLoading(false);
    }
  }

  function getTierColor(tier?: string) {
    const colors: Record<string, string> = {
      Bronze: "text-orange-500",
      Silver: "text-gray-300",
      Gold: "text-yellow-400",
      Platinum: "text-cyan-300",
      Diamond: "text-blue-400",
      Master: "text-purple-400",
      Grandmaster: "text-red-400",
    };
    return colors[tier || ""] || "text-gray-400";
  }

  function getTierBg(tier?: string) {
    const colors: Record<string, string> = {
      Bronze: "bg-orange-500/20",
      Silver: "bg-gray-400/20",
      Gold: "bg-yellow-400/20",
      Platinum: "bg-cyan-400/20",
      Diamond: "bg-blue-400/20",
      Master: "bg-purple-400/20",
      Grandmaster: "bg-red-400/20",
    };
    return colors[tier || ""] || "bg-gray-400/20";
  }

  function getRankStyle(rank: number) {
    if (rank === 1) return "bg-gradient-to-r from-yellow-600/40 to-yellow-700/40 border-yellow-500";
    if (rank === 2) return "bg-gradient-to-r from-gray-400/30 to-gray-500/30 border-gray-400";
    if (rank === 3) return "bg-gradient-to-r from-orange-600/30 to-orange-700/30 border-orange-500";
    return "bg-gray-800/50 border-gray-700";
  }

  function getRankBadge(rank: number) {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  }

  const tabs: { id: LeaderboardType; label: string; icon: string }[] = [
    { id: "skill", label: "Skill Rating", icon: "🏆" },
    { id: "weekly", label: "Weekly Wins", icon: "📅" },
    { id: "streaks", label: "Daily Streaks", icon: "🔥" },
    { id: "xp", label: "Total XP", icon: "⭐" },
  ];

  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">🌍 Global Leaderboard</h1>
          <p className="text-gray-400">See how you stack up against the best coders</p>
        </div>

        {/* User's Rank Card */}
        {session?.user && userRank && userData && (
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-xl p-6 mb-8 border border-blue-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {session.user.image ? (
                    <img
                      src={session.user.image}
                      alt={session.user.name || ""}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    session.user.name?.charAt(0).toUpperCase() || "?"
                  )}
                </div>
                <div>
                  <h3 className="text-white font-semibold">Your Rank</h3>
                  <p className="text-gray-400 text-sm">{session.user.name}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-white">#{userRank}</div>
                {activeTab === "skill" && (
                  <div className={`text-sm ${getTierColor(userData.skillTier)}`}>
                    {userData.skillRating} SR
                  </div>
                )}
                {activeTab === "streaks" && (
                  <div className="text-sm text-orange-400">
                    {userData.currentStreak} day streak
                  </div>
                )}
                {activeTab === "xp" && (
                  <div className="text-sm text-purple-400">
                    {userData.totalXp?.toLocaleString()} XP
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              <span>{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        )}

        {/* Leaderboard */}
        {!isLoading && (
          <div className="space-y-2">
            {leaderboard.map((entry) => (
              <div
                key={entry.userId}
                className={`rounded-xl p-4 border transition-all hover:scale-[1.01] ${getRankStyle(
                  entry.rank
                )} ${entry.userId === session?.user?.id ? "ring-2 ring-blue-500" : ""}`}
              >
                <div className="flex items-center gap-4">
                  {/* Rank */}
                  <div className="w-12 text-center">
                    {entry.rank <= 3 ? (
                      <span className="text-2xl">{getRankBadge(entry.rank)}</span>
                    ) : (
                      <span className="text-gray-400 font-mono">#{entry.rank}</span>
                    )}
                  </div>

                  {/* Avatar */}
                  <Link href={`/profile/${entry.userId}`}>
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold cursor-pointer hover:scale-110 transition-transform">
                      {entry.image ? (
                        <img
                          src={entry.image}
                          alt={entry.username}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        entry.username.charAt(0).toUpperCase()
                      )}
                    </div>
                  </Link>

                  {/* Name & Tier */}
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/profile/${entry.userId}`}
                      className="text-white font-medium hover:text-blue-400 transition-colors truncate block"
                    >
                      {entry.username}
                      {entry.userId === session?.user?.id && (
                        <span className="text-blue-400 text-sm ml-2">(You)</span>
                      )}
                    </Link>
                    {activeTab === "skill" && entry.skillTier && (
                      <span
                        className={`text-sm px-2 py-0.5 rounded ${getTierBg(
                          entry.skillTier
                        )} ${getTierColor(entry.skillTier)}`}
                      >
                        {entry.skillTier}
                      </span>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-6 text-right">
                    {activeTab === "skill" && (
                      <>
                        <div className="hidden sm:block">
                          <div className="text-white font-semibold">{entry.skillRating}</div>
                          <div className="text-gray-400 text-xs">Rating</div>
                        </div>
                        <div className="hidden md:block">
                          <div className="text-white">{entry.competitions || 0}</div>
                          <div className="text-gray-400 text-xs">Competitions</div>
                        </div>
                        <div>
                          <div className="text-yellow-400 font-semibold">{entry.wins || 0}</div>
                          <div className="text-gray-400 text-xs">Wins</div>
                        </div>
                      </>
                    )}

                    {activeTab === "weekly" && (
                      <>
                        <div>
                          <div className="text-green-400 font-semibold text-xl">
                            {entry.winsThisWeek}
                          </div>
                          <div className="text-gray-400 text-xs">Wins this week</div>
                        </div>
                      </>
                    )}

                    {activeTab === "streaks" && (
                      <>
                        <div className="hidden sm:block">
                          <div className="text-gray-300">{entry.longestStreak || 0}</div>
                          <div className="text-gray-400 text-xs">Best Streak</div>
                        </div>
                        <div className="hidden md:block">
                          <div className="text-gray-300">{entry.totalChallenges || 0}</div>
                          <div className="text-gray-400 text-xs">Challenges</div>
                        </div>
                        <div>
                          <div className="text-orange-400 font-semibold text-xl flex items-center gap-1">
                            🔥 {entry.currentStreak}
                          </div>
                          <div className="text-gray-400 text-xs">Current</div>
                        </div>
                      </>
                    )}

                    {activeTab === "xp" && (
                      <div>
                        <div className="text-purple-400 font-semibold text-xl">
                          {entry.totalXp?.toLocaleString()}
                        </div>
                        <div className="text-gray-400 text-xs">Total XP</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {leaderboard.length === 0 && (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">🏆</div>
                <h2 className="text-2xl font-bold text-white mb-2">No Rankings Yet</h2>
                <p className="text-gray-400">Be the first to compete and claim the top spot!</p>
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-800/50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-white">{leaderboard.length}</div>
            <div className="text-gray-400 text-sm">Total Players</div>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-yellow-400">
              {leaderboard[0]?.skillRating || 0}
            </div>
            <div className="text-gray-400 text-sm">Top Rating</div>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-orange-400">
              {Math.max(...leaderboard.map((e) => e.currentStreak || 0), 0)}
            </div>
            <div className="text-gray-400 text-sm">Best Streak</div>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-purple-400">
              {leaderboard.reduce((sum, e) => sum + (e.totalXp || 0), 0).toLocaleString()}
            </div>
            <div className="text-gray-400 text-sm">Total XP Earned</div>
          </div>
        </div>
      </main>
    </div>
  );
}
