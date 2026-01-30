"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import { Loading } from "@/components/ui/Loading";

interface Challenge {
  id: string;
  name: string;
  title: string;
  description: string;
  difficulty: string;
  type: "daily" | "tutorial";
}

interface PracticeSession {
  id: string;
  challenge_type: string;
  challenge_id: string;
  score: number;
  best_score: number;
  attempts: number;
  completed: boolean;
  updated_at: string;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "bg-green-600 text-green-100",
  medium: "bg-yellow-600 text-yellow-100",
  hard: "bg-red-600 text-red-100",
  expert: "bg-purple-600 text-purple-100",
};

export default function PracticePage() {
  const { data: session, isPending: sessionLoading } = useSession();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "daily" | "tutorial">("all");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch challenges
        const challengesRes = await fetch("/api/practice?action=challenges");
        const challengesData = await challengesRes.json();
        setChallenges(challengesData.challenges || []);

        // Fetch user's sessions
        if (session?.user) {
          const sessionsRes = await fetch("/api/practice");
          const sessionsData = await sessionsRes.json();
          setSessions(sessionsData.sessions || []);
        }
      } catch (error) {
        console.error("Error fetching practice data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [session]);

  const getSessionForChallenge = (
    type: string,
    id: string
  ): PracticeSession | undefined => {
    return sessions.find(
      (s) => s.challenge_type === type && s.challenge_id === id
    );
  };

  const filteredChallenges = challenges.filter((c) => {
    if (filter !== "all" && c.type !== filter) return false;
    if (difficultyFilter !== "all" && c.difficulty !== difficultyFilter)
      return false;
    return true;
  });

  const stats = {
    total: challenges.length,
    completed: sessions.filter((s) => s.completed).length,
    attempted: sessions.length,
    perfectScores: sessions.filter((s) => s.best_score === 100).length,
  };

  if (loading || sessionLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Practice Mode</h1>
          <p className="text-gray-400">
            Sharpen your skills without affecting your stats. Practice
            challenges as many times as you want!
          </p>
        </div>

        {/* Stats Cards */}
        {session?.user && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-2xl font-bold text-white">{stats.total}</div>
              <div className="text-gray-400 text-sm">Total Challenges</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-400">
                {stats.completed}
              </div>
              <div className="text-gray-400 text-sm">Completed</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-2xl font-bold text-yellow-400">
                {stats.attempted}
              </div>
              <div className="text-gray-400 text-sm">Attempted</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-400">
                {stats.perfectScores}
              </div>
              <div className="text-gray-400 text-sm">Perfect Scores</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">Type:</span>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm"
            >
              <option value="all">All Types</option>
              <option value="daily">Daily Challenges</option>
              <option value="tutorial">Tutorials</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">Difficulty:</span>
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm"
            >
              <option value="all">All Levels</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
              <option value="expert">Expert</option>
            </select>
          </div>
        </div>

        {/* Challenges Grid */}
        {filteredChallenges.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredChallenges.map((challenge) => {
              const practiceSession = getSessionForChallenge(
                challenge.type,
                challenge.id
              );
              const isCompleted = practiceSession?.completed;
              const bestScore = practiceSession?.best_score || 0;

              return (
                <Link
                  key={`${challenge.type}-${challenge.id}`}
                  href={`/practice/${challenge.type}/${challenge.id}`}
                  className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-green-500 transition-colors group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          challenge.type === "daily"
                            ? "bg-blue-600 text-blue-100"
                            : "bg-purple-600 text-purple-100"
                        }`}
                      >
                        {challenge.type === "daily" ? "Daily" : "Tutorial"}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          DIFFICULTY_COLORS[challenge.difficulty] ||
                          "bg-gray-600 text-gray-100"
                        }`}
                      >
                        {challenge.difficulty}
                      </span>
                    </div>

                    {isCompleted && (
                      <span className="text-green-400 text-xl">✓</span>
                    )}
                  </div>

                  <h3 className="text-white font-medium mb-2 group-hover:text-green-400 transition-colors">
                    {challenge.name || challenge.title}
                  </h3>

                  <p className="text-gray-400 text-sm line-clamp-2 mb-3">
                    {challenge.description}
                  </p>

                  {practiceSession && (
                    <div className="flex items-center justify-between text-sm">
                      <div className="text-gray-500">
                        {practiceSession.attempts} attempt
                        {practiceSession.attempts !== 1 ? "s" : ""}
                      </div>
                      <div
                        className={`font-medium ${
                          bestScore === 100
                            ? "text-green-400"
                            : bestScore >= 50
                            ? "text-yellow-400"
                            : "text-red-400"
                        }`}
                      >
                        Best: {bestScore}%
                      </div>
                    </div>
                  )}

                  {!practiceSession && (
                    <div className="text-gray-500 text-sm">Not attempted</div>
                  )}
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="text-xl font-medium text-white mb-2">
              No challenges found
            </h3>
            <p className="text-gray-400 mb-4">
              {challenges.length === 0
                ? "Check back later for practice challenges!"
                : "No challenges match your current filters."}
            </p>
            {challenges.length > 0 && (
              <button
                onClick={() => {
                  setFilter("all");
                  setDifficultyFilter("all");
                }}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}

        {/* Info Box */}
        <div className="mt-8 bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h3 className="text-white font-medium mb-2 flex items-center gap-2">
            <span>ℹ️</span> About Practice Mode
          </h3>
          <ul className="text-gray-400 text-sm space-y-1">
            <li>
              • Practice doesn't affect your competition stats or skill rating
            </li>
            <li>• Attempt challenges as many times as you want</li>
            <li>• Your best score and attempt count are tracked</li>
            <li>• Great for learning new concepts and improving skills</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
