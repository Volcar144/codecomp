"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loading } from "@/components/ui/Loading";
import { 
  Code2, Eye, Users, Swords, Trophy, Clock, Play, 
  Flame, Zap
} from "lucide-react";

interface DuelInfo {
  id: string;
  player1_id: string;
  player2_id: string;
  language: string;
  status: string;
  started_at: string;
  duel_challenges: {
    title: string;
    difficulty: string;
  } | null;
}

interface SpectateSession {
  id: string;
  duel_id: string | null;
  competition_id: string | null;
  arena_id: string | null;
  session_type: string;
  viewer_count: number;
  started_at: string;
  duels: DuelInfo | null;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  hard: "bg-red-100 text-red-700",
};

export default function SpectatePage() {
  const [sessions, setSessions] = useState<SpectateSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
    // Poll for new sessions every 10 seconds
    const interval = setInterval(fetchSessions, 10000);
    return () => clearInterval(interval);
  }, [filter]);

  const fetchSessions = async () => {
    try {
      const params = new URLSearchParams();
      if (filter) params.set("type", filter);

      const response = await fetch(`/api/spectate?${params}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch sessions");
      }
      
      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <header className="border-b bg-white dark:bg-gray-900">
        <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Code2 className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold">CodeComp</span>
          </Link>
          <div className="flex gap-4">
            <Link href="/duels" className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900">
              Duels
            </Link>
            <Link href="/competitions" className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900">
              Competitions
            </Link>
            <Link href="/profile" className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900">
              Profile
            </Link>
          </div>
        </nav>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center justify-center gap-3">
            <Eye className="h-8 w-8 text-purple-600" />
            Live Spectating
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Watch live coding duels and competitions in real-time
          </p>
        </div>

        {/* Filters */}
        <div className="flex justify-center gap-2 mb-8">
          {[
            { id: null, label: "All", icon: <Eye className="h-4 w-4" /> },
            { id: "duel", label: "Duels", icon: <Swords className="h-4 w-4" /> },
            { id: "competition", label: "Competitions", icon: <Trophy className="h-4 w-4" /> },
          ].map(type => (
            <button
              key={type.id || "all"}
              onClick={() => setFilter(type.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === type.id
                  ? "bg-purple-600 text-white"
                  : "bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              {type.icon}
              {type.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        {/* Live Sessions */}
        {loading ? (
          <Loading />
        ) : sessions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions.map(session => {
              const duel = session.duels;
              const challenge = duel?.duel_challenges;
              
              return (
                <Link
                  key={session.id}
                  href={`/spectate/${session.id}`}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow group"
                >
                  {/* Live Banner */}
                  <div className="bg-gradient-to-r from-red-500 to-pink-500 px-4 py-2 flex items-center justify-between">
                    <span className="flex items-center gap-2 text-white font-medium">
                      <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                      LIVE
                    </span>
                    <span className="flex items-center gap-1 text-white text-sm">
                      <Eye className="h-4 w-4" />
                      {session.viewer_count} watching
                    </span>
                  </div>

                  <div className="p-4">
                    {session.session_type === "duel" && duel && (
                      <>
                        <div className="flex items-center justify-between mb-3">
                          <span className="flex items-center gap-2 text-purple-600 font-medium">
                            <Swords className="h-4 w-4" />
                            1v1 Duel
                          </span>
                          {challenge && (
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${DIFFICULTY_COLORS[challenge.difficulty] || DIFFICULTY_COLORS.medium}`}>
                              {challenge.difficulty}
                            </span>
                          )}
                        </div>

                        {challenge && (
                          <h3 className="font-semibold text-lg mb-2">{challenge.title}</h3>
                        )}

                        <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                          <span className="flex items-center gap-1">
                            <Code2 className="h-4 w-4" />
                            {duel.language}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {Math.floor((Date.now() - new Date(duel.started_at).getTime()) / 60000)}m ago
                          </span>
                        </div>

                        {/* Players */}
                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                              P1
                            </div>
                            <span className="text-sm">Player 1</span>
                          </div>
                          <Zap className="h-5 w-5 text-yellow-500" />
                          <div className="flex items-center gap-2">
                            <span className="text-sm">Player 2</span>
                            <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                              P2
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {session.session_type === "competition" && (
                      <div className="flex items-center gap-2 text-green-600">
                        <Trophy className="h-5 w-5" />
                        <span className="font-medium">Competition</span>
                      </div>
                    )}

                    {/* Watch Button */}
                    <button className="w-full mt-4 py-2 bg-purple-600 text-white rounded-lg font-medium group-hover:bg-purple-700 transition-colors flex items-center justify-center gap-2">
                      <Play className="h-4 w-4" />
                      Watch Now
                    </button>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl">
            <Eye className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold mb-2">No Live Sessions</h3>
            <p className="text-gray-500 mb-4">
              There are no live matches to spectate right now
            </p>
            <div className="flex justify-center gap-4">
              <Link
                href="/duels"
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Start a Duel
              </Link>
              <Link
                href="/competitions"
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Browse Competitions
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
