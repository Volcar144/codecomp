"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { Code2, Trophy, Swords, TrendingUp, TrendingDown, Minus, Bot } from "lucide-react";

interface Duel {
  id: string;
  status: string;
  language: string;
  my_score: number;
  opponent_score: number;
  opponent_username: string;
  opponent_rating: number;
  opponent_is_bot: boolean;
  did_win: boolean;
  winner_id: string | null;
  my_rating_change: number;
  created_at: string;
  ended_at: string | null;
  challenge: {
    title: string;
    difficulty: string;
  };
}

export default function DuelHistoryPage() {
  const { data: session, isPending } = useSession();
  const [duels, setDuels] = useState<Duel[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "wins" | "losses">("all");

  useEffect(() => {
    if (!session?.user) return;

    const fetchDuels = async () => {
      try {
        const res = await fetch("/api/duels?status=completed&limit=50");
        const data = await res.json();
        setDuels(data.duels || []);
      } catch (err) {
        console.error("Error fetching duels:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDuels();
  }, [session]);

  const filteredDuels = duels.filter((duel) => {
    if (filter === "wins") return duel.did_win;
    if (filter === "losses") return duel.winner_id && !duel.did_win;
    return true;
  });

  const stats = {
    total: duels.length,
    wins: duels.filter((d) => d.did_win).length,
    losses: duels.filter((d) => d.winner_id && !d.did_win).length,
    draws: duels.filter((d) => !d.winner_id).length,
    ratingChange: duels.reduce((sum, d) => sum + (d.my_rating_change || 0), 0),
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case "easy":
        return "text-green-400 bg-green-900/30";
      case "medium":
        return "text-yellow-400 bg-yellow-900/30";
      case "hard":
        return "text-orange-400 bg-orange-900/30";
      case "expert":
        return "text-red-400 bg-red-900/30";
      default:
        return "text-gray-400 bg-gray-700";
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (isPending || loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Sign in to view your duel history</p>
          <Link href="/login" className="text-blue-400 hover:text-blue-300">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur">
        <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Code2 className="h-8 w-8 text-blue-500" />
            <span className="text-2xl font-bold text-white">CodeComp</span>
          </Link>
          <Link
            href="/duels"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            New Duel
          </Link>
        </nav>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
          <Swords className="h-8 w-8 text-purple-500" />
          Duel History
        </h1>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-white">{stats.total}</p>
            <p className="text-gray-400 text-sm">Total Duels</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-green-400">{stats.wins}</p>
            <p className="text-gray-400 text-sm">Wins</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-red-400">{stats.losses}</p>
            <p className="text-gray-400 text-sm">Losses</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-gray-400">{stats.draws}</p>
            <p className="text-gray-400 text-sm">Draws</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <p
              className={`text-3xl font-bold ${
                stats.ratingChange > 0
                  ? "text-green-400"
                  : stats.ratingChange < 0
                  ? "text-red-400"
                  : "text-gray-400"
              }`}
            >
              {stats.ratingChange > 0 ? "+" : ""}
              {stats.ratingChange}
            </p>
            <p className="text-gray-400 text-sm">Net Rating</p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-6">
          {(["all", "wins", "losses"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg capitalize ${
                filter === f
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Duel List */}
        {filteredDuels.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <Swords className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">
              {duels.length === 0
                ? "No duels yet. Start your first duel!"
                : "No duels match this filter."}
            </p>
            {duels.length === 0 && (
              <Link
                href="/duels"
                className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Start a Duel
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDuels.map((duel) => (
              <Link
                key={duel.id}
                href={`/duels/${duel.id}`}
                className="block bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Result Icon */}
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        duel.did_win
                          ? "bg-green-900/50"
                          : duel.winner_id
                          ? "bg-red-900/50"
                          : "bg-gray-700"
                      }`}
                    >
                      {duel.did_win ? (
                        <Trophy className="h-5 w-5 text-green-400" />
                      ) : duel.winner_id ? (
                        <TrendingDown className="h-5 w-5 text-red-400" />
                      ) : (
                        <Minus className="h-5 w-5 text-gray-400" />
                      )}
                    </div>

                    {/* Challenge Info */}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">
                          {duel.challenge?.title || "Duel"}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${getDifficultyColor(
                            duel.challenge?.difficulty || ""
                          )}`}
                        >
                          {duel.challenge?.difficulty}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm">
                        vs {duel.opponent_username}
                        {duel.opponent_is_bot && (
                          <Bot className="h-3 w-3 inline ml-1" />
                        )}{" "}
                        ({duel.opponent_rating})
                      </p>
                    </div>
                  </div>

                  {/* Score & Rating */}
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-white font-medium">
                        {duel.my_score} - {duel.opponent_score}
                      </p>
                      <p className="text-gray-500 text-xs">{duel.language}</p>
                    </div>

                    <div
                      className={`text-right min-w-[60px] ${
                        duel.my_rating_change > 0
                          ? "text-green-400"
                          : duel.my_rating_change < 0
                          ? "text-red-400"
                          : "text-gray-400"
                      }`}
                    >
                      <div className="flex items-center justify-end gap-1">
                        {duel.my_rating_change > 0 ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : duel.my_rating_change < 0 ? (
                          <TrendingDown className="h-4 w-4" />
                        ) : null}
                        <span className="font-semibold">
                          {duel.my_rating_change > 0 ? "+" : ""}
                          {duel.my_rating_change}
                        </span>
                      </div>
                      <p className="text-gray-500 text-xs">
                        {duel.ended_at ? formatDate(duel.ended_at) : ""}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
