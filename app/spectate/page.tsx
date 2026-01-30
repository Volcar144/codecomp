"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loading } from "@/components/ui/Loading";
import Navbar from "@/components/layout/Navbar";
import { 
  Eye, Users, Swords, Trophy, Clock, Play, 
  Flame, Zap, Code
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
      <Navbar />

      <main className="container mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2 flex items-center justify-center gap-2 sm:gap-3">
            <Eye className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
            Live Spectating
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 px-4">
            Watch live coding duels and competitions in real-time
          </p>
        </div>

        {/* Filters - scrollable on mobile */}
        <div className="flex justify-start sm:justify-center gap-2 mb-6 sm:mb-8 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
          {[
            { id: null, label: "All", icon: <Eye className="h-4 w-4" /> },
            { id: "duel", label: "Duels", icon: <Swords className="h-4 w-4" /> },
            { id: "competition", label: "Comps", icon: <Trophy className="h-4 w-4" /> },
          ].map(type => (
            <button
              key={type.id || "all"}
              onClick={() => setFilter(type.id)}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap text-sm sm:text-base flex-shrink-0 ${
                filter === type.id
                  ? "bg-purple-600 text-white"
                  : "bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              {type.icon}
              <span className="hidden xs:inline sm:inline">{type.label}</span>
              <span className="xs:hidden sm:hidden">{type.id === "competition" ? "Comps" : type.label}</span>
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm sm:text-base">
            {error}
          </div>
        )}

        {/* Live Sessions */}
        {loading ? (
          <Loading />
        ) : sessions.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {sessions.map(session => {
              const duel = session.duels;
              const challenge = duel?.duel_challenges;
              
              return (
                <Link
                  key={session.id}
                  href={`/spectate/${session.id}`}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow group active:scale-[0.98] touch-manipulation"
                >
                  {/* Live Banner */}
                  <div className="bg-gradient-to-r from-red-500 to-pink-500 px-3 sm:px-4 py-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 sm:gap-2 text-white font-medium text-sm sm:text-base">
                      <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                      LIVE
                    </span>
                    <span className="flex items-center gap-1 text-white text-xs sm:text-sm">
                      <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      {session.viewer_count}
                    </span>
                  </div>

                  <div className="p-3 sm:p-4">
                    {session.session_type === "duel" && duel && (
                      <>
                        <div className="flex items-center justify-between mb-2 sm:mb-3">
                          <span className="flex items-center gap-1.5 sm:gap-2 text-purple-600 font-medium text-sm sm:text-base">
                            <Swords className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            1v1 Duel
                          </span>
                          {challenge && (
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${DIFFICULTY_COLORS[challenge.difficulty] || DIFFICULTY_COLORS.medium}`}>
                              {challenge.difficulty}
                            </span>
                          )}
                        </div>

                        {challenge && (
                          <h3 className="font-semibold text-base sm:text-lg mb-2 line-clamp-1">{challenge.title}</h3>
                        )}

                        <div className="flex items-center justify-between text-xs sm:text-sm text-gray-500 mb-2 sm:mb-3">
                          <span className="flex items-center gap-1">
                            <Code className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            {duel.language}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            {Math.floor((Date.now() - new Date(duel.started_at).getTime()) / 60000)}m
                          </span>
                        </div>

                        {/* Players - compact on mobile */}
                        <div className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-bold">
                              P1
                            </div>
                            <span className="text-xs sm:text-sm hidden xs:inline">Player 1</span>
                          </div>
                          <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <span className="text-xs sm:text-sm hidden xs:inline">Player 2</span>
                            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-red-500 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-bold">
                              P2
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {session.session_type === "competition" && (
                      <div className="flex items-center gap-2 text-green-600">
                        <Trophy className="h-4 w-4 sm:h-5 sm:w-5" />
                        <span className="font-medium text-sm sm:text-base">Competition</span>
                      </div>
                    )}

                    {/* Watch Button */}
                    <button className="w-full mt-3 sm:mt-4 py-2 bg-purple-600 text-white rounded-lg font-medium group-hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base active:bg-purple-800">
                      <Play className="h-4 w-4" />
                      Watch Now
                    </button>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 sm:py-16 bg-white dark:bg-gray-800 rounded-xl mx-auto">
            <Eye className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4 text-gray-300" />
            <h3 className="text-lg sm:text-xl font-semibold mb-2">No Live Sessions</h3>
            <p className="text-gray-500 mb-4 text-sm sm:text-base px-4">
              There are no live matches to spectate right now
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 px-4">
              <Link
                href="/duels"
                className="px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 active:bg-purple-800 text-sm sm:text-base"
              >
                Start a Duel
              </Link>
              <Link
                href="/competitions"
                className="px-4 py-2.5 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm sm:text-base"
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
