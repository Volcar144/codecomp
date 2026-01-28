"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";

interface SkillRating {
  user_id: string;
  skill_rating: number;
  skill_tier: string;
  peak_rating: number;
  competitions_completed: number;
  win_count: number;
  top3_count: number;
  top10_count: number;
  average_percentile: number;
  current_streak: number;
  best_streak: number;
  last_competition_at: string | null;
  global_rank: number;
}

interface MySkillRating extends SkillRating {
  is_new?: boolean;
}

const TIER_COLORS: Record<string, string> = {
  grandmaster: "bg-gradient-to-r from-red-500 to-orange-500 text-white",
  master: "bg-gradient-to-r from-purple-500 to-pink-500 text-white",
  diamond: "bg-gradient-to-r from-cyan-400 to-blue-500 text-white",
  platinum: "bg-gradient-to-r from-emerald-400 to-teal-500 text-white",
  gold: "bg-gradient-to-r from-yellow-400 to-amber-500 text-black",
  silver: "bg-gradient-to-r from-gray-300 to-gray-400 text-black",
  bronze: "bg-gradient-to-r from-orange-600 to-amber-700 text-white",
};

const TIER_BADGES: Record<string, string> = {
  grandmaster: "🏆",
  master: "💎",
  diamond: "💠",
  platinum: "⭐",
  gold: "🥇",
  silver: "🥈",
  bronze: "🥉",
};

export default function SkillLeaderboardPage() {
  const { data: session } = useSession();
  const [leaderboard, setLeaderboard] = useState<SkillRating[]>([]);
  const [myRating, setMyRating] = useState<MySkillRating | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState<string>("");

  useEffect(() => {
    fetchLeaderboard();
    if (session?.user) {
      fetchMyRating();
    }
  }, [session, selectedTier]);

  const fetchLeaderboard = async () => {
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (selectedTier) params.set("tier", selectedTier);
      
      const res = await fetch(`/api/skill?${params}`);
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error);
      setLeaderboard(data.leaderboard);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  };

  const fetchMyRating = async () => {
    if (!session?.user) return;
    
    try {
      const res = await fetch(`/api/skill?user_id=${session.user.id}`);
      const data = await res.json();
      
      if (res.ok) {
        setMyRating(data);
      }
    } catch (err) {
      console.error("Error fetching my rating:", err);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Skill Leaderboard</h1>
          <p className="text-gray-600 mt-2">
            Rankings based on competition performance. Complete at least 3 competitions to appear.
          </p>
        </div>

        {/* My Rating Card */}
        {myRating && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border-2 border-blue-200">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Your Rating</h2>
            <div className="flex items-center gap-6 flex-wrap">
              <div className="flex items-center gap-3">
                <span className={`px-4 py-2 rounded-lg font-bold text-lg ${TIER_COLORS[myRating.skill_tier]}`}>
                  {TIER_BADGES[myRating.skill_tier]} {myRating.skill_tier.toUpperCase()}
                </span>
                <span className="text-3xl font-bold text-gray-900">{myRating.skill_rating}</span>
              </div>
              
              {!myRating.is_new && (
                <>
                  <div className="text-center px-4 border-l border-gray-200">
                    <div className="text-2xl font-bold text-gray-900">#{myRating.global_rank}</div>
                    <div className="text-sm text-gray-500">Global Rank</div>
                  </div>
                  <div className="text-center px-4 border-l border-gray-200">
                    <div className="text-2xl font-bold text-gray-900">{myRating.competitions_completed}</div>
                    <div className="text-sm text-gray-500">Competitions</div>
                  </div>
                  <div className="text-center px-4 border-l border-gray-200">
                    <div className="text-2xl font-bold text-yellow-500">{myRating.win_count}</div>
                    <div className="text-sm text-gray-500">Wins</div>
                  </div>
                  <div className="text-center px-4 border-l border-gray-200">
                    <div className="text-2xl font-bold text-gray-900">{myRating.peak_rating}</div>
                    <div className="text-sm text-gray-500">Peak Rating</div>
                  </div>
                </>
              )}
              
              {myRating.is_new && (
                <p className="text-gray-500">Complete competitions to build your rating!</p>
              )}
            </div>
          </div>
        )}

        {/* Tier Filter */}
        <div className="bg-white rounded-xl shadow p-4 mb-6">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-gray-700 font-medium">Filter by tier:</span>
            <button
              onClick={() => setSelectedTier("")}
              className={`px-3 py-1 rounded-lg text-sm ${
                !selectedTier ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              All
            </button>
            {Object.keys(TIER_COLORS).map((tier) => (
              <button
                key={tier}
                onClick={() => setSelectedTier(tier)}
                className={`px-3 py-1 rounded-lg text-sm capitalize ${
                  selectedTier === tier
                    ? TIER_COLORS[tier]
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {TIER_BADGES[tier]} {tier}
              </button>
            ))}
          </div>
        </div>

        {/* Leaderboard Table */}
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-8 text-center">
            <p className="text-gray-500">No players found. Be the first to compete!</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Rank</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Player</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Tier</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Rating</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Peak</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Comps</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Wins</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Top 3</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Avg %ile</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Last Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leaderboard.map((player) => (
                  <tr
                    key={player.user_id}
                    className={`hover:bg-gray-50 ${
                      session?.user?.id === player.user_id ? "bg-blue-50" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <span className={`font-bold ${
                        player.global_rank === 1 ? "text-yellow-500 text-xl" :
                        player.global_rank === 2 ? "text-gray-400 text-lg" :
                        player.global_rank === 3 ? "text-orange-500 text-lg" :
                        "text-gray-700"
                      }`}>
                        #{player.global_rank}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900">
                        {player.user_id.slice(0, 8)}...
                        {session?.user?.id === player.user_id && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">You</span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold capitalize ${TIER_COLORS[player.skill_tier]}`}>
                        {TIER_BADGES[player.skill_tier]} {player.skill_tier}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">{player.skill_rating}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{player.peak_rating}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{player.competitions_completed}</td>
                    <td className="px-4 py-3 text-right text-yellow-600 font-semibold">{player.win_count}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{player.top3_count}</td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {player.average_percentile?.toFixed(1) || "N/A"}%
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 text-sm">
                      {formatDate(player.last_competition_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tier Explanations */}
        <div className="mt-8 bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Skill Tiers</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { tier: "bronze", min: 0, max: 1399 },
              { tier: "silver", min: 1400, max: 1599 },
              { tier: "gold", min: 1600, max: 1799 },
              { tier: "platinum", min: 1800, max: 1999 },
              { tier: "diamond", min: 2000, max: 2199 },
              { tier: "master", min: 2200, max: 2399 },
              { tier: "grandmaster", min: 2400, max: "∞" },
            ].map(({ tier, min, max }) => (
              <div key={tier} className={`p-3 rounded-lg text-center ${TIER_COLORS[tier]}`}>
                <div className="text-2xl">{TIER_BADGES[tier]}</div>
                <div className="font-semibold capitalize">{tier}</div>
                <div className="text-xs opacity-80">{min} - {max}</div>
              </div>
            ))}
          </div>
        </div>

        {/* How It Works */}
        <div className="mt-6 bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">How Skill Rating Works</h3>
          <ul className="space-y-2 text-gray-600">
            <li className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span>Starting rating: 1000 (Bronze tier)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span>Win a competition: +15 bonus points (plus percentile-based gains)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span>Top 3 finish: +8 bonus points</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span>Top 10 finish: +3 bonus points</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500">ℹ</span>
              <span>New players (first 10 competitions) have reduced rating loss</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500">ℹ</span>
              <span>Must complete at least 3 competitions to appear on the leaderboard</span>
            </li>
          </ul>
        </div>

        {/* Navigation */}
        <div className="mt-6 flex gap-4">
          <Link
            href="/competitions"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Browse Competitions
          </Link>
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
