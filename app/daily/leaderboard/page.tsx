"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { Loading } from "@/components/ui/Loading";
import { Code2, Trophy, Clock, Calendar, Medal, ChevronLeft, ChevronRight } from "lucide-react";

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  score: number;
  execution_time: number;
  language: string;
  submitted_at: string;
}

interface Challenge {
  id: string;
  title: string;
  difficulty: string;
}

export default function DailyLeaderboardPage() {
  const { data: session } = useSession();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchLeaderboard();
  }, [selectedDate]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/daily/leaderboard?date=${selectedDate}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch leaderboard");
      }
      
      const data = await response.json();
      setChallenge(data.challenge);
      setLeaderboard(data.leaderboard || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const changeDate = (days: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    const today = new Date();
    if (date <= today) {
      setSelectedDate(date.toISOString().split('T')[0]);
    }
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  if (loading) {
    return <Loading />;
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
            <Link href="/daily" className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900">
              Daily Challenge
            </Link>
            <Link href="/profile" className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900">
              Profile
            </Link>
          </div>
        </nav>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold mb-1">Daily Challenge Leaderboard</h1>
              {challenge && (
                <p className="text-gray-600 dark:text-gray-400">{challenge.title}</p>
              )}
            </div>
            
            {/* Date Navigator */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => changeDate(-1)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-gray-400" />
                <span className="font-medium">
                  {new Date(selectedDate).toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </span>
                {isToday && (
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                    Today
                  </span>
                )}
              </div>
              <button
                onClick={() => changeDate(1)}
                disabled={isToday}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          <Link
            href="/daily"
            className="text-blue-600 hover:underline text-sm"
          >
            ← Back to Today&apos;s Challenge
          </Link>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        {/* Leaderboard */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          {leaderboard.length > 0 ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {/* Header */}
              <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 dark:bg-gray-700 text-sm font-medium text-gray-500">
                <div className="col-span-1">Rank</div>
                <div className="col-span-5">User</div>
                <div className="col-span-2 text-center">Score</div>
                <div className="col-span-2 text-center">Time</div>
                <div className="col-span-2 text-center">Language</div>
              </div>
              
              {/* Entries */}
              {leaderboard.map((entry) => {
                const isCurrentUser = session?.user?.id === entry.user_id;
                return (
                  <div
                    key={`${entry.user_id}-${entry.rank}`}
                    className={`grid grid-cols-12 gap-4 px-6 py-4 items-center ${
                      isCurrentUser ? "bg-blue-50 dark:bg-blue-900/20" : ""
                    }`}
                  >
                    <div className="col-span-1">
                      {entry.rank <= 3 ? (
                        <span className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                          entry.rank === 1 ? "bg-yellow-100 text-yellow-600" :
                          entry.rank === 2 ? "bg-gray-200 text-gray-600" :
                          "bg-orange-100 text-orange-600"
                        }`}>
                          {entry.rank === 1 && <Trophy className="h-5 w-5" />}
                          {entry.rank === 2 && <Medal className="h-5 w-5" />}
                          {entry.rank === 3 && <Medal className="h-5 w-5" />}
                        </span>
                      ) : (
                        <span className="text-gray-500 font-medium">#{entry.rank}</span>
                      )}
                    </div>
                    <div className="col-span-5 font-medium flex items-center gap-2">
                      <span className="truncate">User {entry.user_id.slice(0, 8)}</span>
                      {isCurrentUser && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">You</span>
                      )}
                    </div>
                    <div className="col-span-2 text-center font-semibold text-green-600">
                      {entry.score} pts
                    </div>
                    <div className="col-span-2 text-center text-gray-500 flex items-center justify-center gap-1">
                      <Clock className="h-4 w-4" />
                      {entry.execution_time}ms
                    </div>
                    <div className="col-span-2 text-center">
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-600 rounded text-sm">
                        {entry.language}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No submissions yet for this challenge</p>
              <Link href="/daily" className="text-blue-600 hover:underline">
                Be the first to solve it! →
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
