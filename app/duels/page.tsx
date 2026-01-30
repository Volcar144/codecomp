"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { Swords, Bot, Users, Clock, Trophy, Zap, Search } from "lucide-react";
import Navbar from "@/components/layout/Navbar";

const LANGUAGES = [
  { value: "python", label: "Python", icon: "🐍" },
  { value: "javascript", label: "JavaScript", icon: "🟨" },
  { value: "java", label: "Java", icon: "☕" },
  { value: "cpp", label: "C++", icon: "⚡" },
  { value: "go", label: "Go", icon: "🐹" },
  { value: "rust", label: "Rust", icon: "🦀" },
];

const DIFFICULTIES = [
  { value: "easy", label: "Easy", color: "bg-green-500", time: "3 min" },
  { value: "medium", label: "Medium", color: "bg-yellow-500", time: "5 min" },
  { value: "hard", label: "Hard", color: "bg-orange-500", time: "7 min" },
  { value: "expert", label: "Expert", color: "bg-red-500", time: "10 min" },
];

interface QueueStatus {
  status: string;
  duel_id?: string;
  opponent?: {
    username: string;
    rating: number;
  };
  expires_in?: number;
  message?: string;
}

interface Challenge {
  id: string;
  challenger_username: string;
  language: string;
  difficulty: string;
  message?: string;
  created_at: string;
}

export default function DuelsPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  
  const [selectedLanguage, setSelectedLanguage] = useState("python");
  const [selectedDifficulty, setSelectedDifficulty] = useState("medium");
  const [challengeUsername, setChallengeUsername] = useState("");
  const [challengeMessage, setChallengeMessage] = useState("");
  
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [isQueuing, setIsQueuing] = useState(false);
  const [isChallengingUser, setIsChallengingUser] = useState(false);
  const [pendingChallenges, setPendingChallenges] = useState<Challenge[]>([]);
  const [error, setError] = useState("");

  // Poll queue status when queuing
  useEffect(() => {
    if (!queueStatus || queueStatus.status !== "waiting") return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/duels/queue");
        const data = await res.json();
        
        if (data.status === "matched" && data.duel_id) {
          setQueueStatus(null);
          router.push(`/duels/${data.duel_id}`);
        } else if (data.status === "expired") {
          setQueueStatus({ status: "expired", message: data.message });
        } else {
          setQueueStatus(data);
        }
      } catch (err) {
        console.error("Error polling queue:", err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [queueStatus, router]);

  // Fetch pending challenges
  useEffect(() => {
    if (!session?.user) return;
    
    const fetchChallenges = async () => {
      try {
        const res = await fetch("/api/duels/challenge");
        const data = await res.json();
        setPendingChallenges(data.received || []);
      } catch (err) {
        console.error("Error fetching challenges:", err);
      }
    };

    fetchChallenges();
    const interval = setInterval(fetchChallenges, 10000);
    return () => clearInterval(interval);
  }, [session]);

  const joinQueue = async () => {
    setError("");
    setIsQueuing(true);
    
    try {
      const res = await fetch("/api/duels/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: selectedLanguage,
          difficulty: selectedDifficulty,
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to join queue");
      }
      
      if (data.status === "matched" && data.duel_id) {
        router.push(`/duels/${data.duel_id}`);
      } else {
        setQueueStatus(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join queue");
    } finally {
      setIsQueuing(false);
    }
  };

  const leaveQueue = async () => {
    try {
      await fetch("/api/duels/queue", { method: "DELETE" });
      setQueueStatus(null);
    } catch (err) {
      console.error("Error leaving queue:", err);
    }
  };

  const playVsBot = async () => {
    setError("");
    setIsQueuing(true);
    
    try {
      const res = await fetch("/api/duels/bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: selectedLanguage,
          difficulty: selectedDifficulty,
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to start bot duel");
      }
      
      router.push(`/duels/${data.duel_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start");
    } finally {
      setIsQueuing(false);
    }
  };

  const sendChallenge = async () => {
    if (!challengeUsername.trim()) {
      setError("Enter a username to challenge");
      return;
    }
    
    setError("");
    setIsChallengingUser(true);
    
    try {
      const res = await fetch("/api/duels/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: challengeUsername,
          language: selectedLanguage,
          difficulty: selectedDifficulty,
          message: challengeMessage || undefined,
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to send challenge");
      }
      
      setChallengeUsername("");
      setChallengeMessage("");
      setError("");
      alert("Challenge sent! They have 24 hours to respond.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send challenge");
    } finally {
      setIsChallengingUser(false);
    }
  };

  const respondToChallenge = async (challengeId: string, action: "accept" | "decline") => {
    try {
      const res = await fetch(`/api/duels/challenge/${challengeId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to respond");
      }
      
      if (action === "accept" && data.duel_id) {
        router.push(`/duels/${data.duel_id}`);
      } else {
        // Remove from list
        setPendingChallenges(prev => prev.filter(c => c.id !== challengeId));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to respond");
    }
  };

  if (isPending) {
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
          <Swords className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-4">1v1 Coding Duels</h1>
          <p className="text-gray-400 mb-6">Sign in to challenge other coders</p>
          <Link
            href="/login"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Swords className="h-10 w-10 text-purple-500" />
            <h1 className="text-4xl font-bold text-white">1v1 Coding Duels</h1>
          </div>
          <p className="text-gray-400">
            Battle other coders in real-time. Win to gain skill rating, lose to drop.
          </p>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Pending Challenges */}
        {pendingChallenges.length > 0 && (
          <div className="bg-purple-900/30 border border-purple-700 rounded-xl p-6 mb-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-400" />
              Incoming Challenges ({pendingChallenges.length})
            </h2>
            <div className="space-y-3">
              {pendingChallenges.map((challenge) => (
                <div
                  key={challenge.id}
                  className="bg-gray-800 rounded-lg p-4 flex items-center justify-between"
                >
                  <div>
                    <span className="text-white font-medium">{challenge.challenger_username}</span>
                    <span className="text-gray-400 ml-2">
                      challenges you to a {challenge.difficulty} duel in {challenge.language}
                    </span>
                    {challenge.message && (
                      <p className="text-gray-500 text-sm mt-1">"{challenge.message}"</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => respondToChallenge(challenge.id, "accept")}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => respondToChallenge(challenge.id, "decline")}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Queue Status */}
        {queueStatus && queueStatus.status === "waiting" && (
          <div className="bg-blue-900/30 border border-blue-700 rounded-xl p-8 mb-6 text-center">
            <div className="animate-pulse mb-4">
              <Search className="h-12 w-12 text-blue-400 mx-auto" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Finding Opponent...</h2>
            <p className="text-gray-400 mb-4">
              Language: {selectedLanguage} • Difficulty: {selectedDifficulty}
            </p>
            <p className="text-gray-500 mb-6">
              Time remaining: {queueStatus.expires_in}s
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={leaveQueue}
                className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={playVsBot}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
              >
                <Bot className="h-5 w-5" />
                Play vs Bot Instead
              </button>
            </div>
          </div>
        )}

        {queueStatus?.status === "expired" && (
          <div className="bg-yellow-900/30 border border-yellow-700 rounded-xl p-6 mb-6 text-center">
            <h2 className="text-xl font-bold text-white mb-2">No Opponent Found</h2>
            <p className="text-gray-400 mb-4">
              {queueStatus.message || "Queue expired. Try again or play against a bot."}
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setQueueStatus(null)}
                className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                Try Again
              </button>
              <button
                onClick={playVsBot}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
              >
                <Bot className="h-5 w-5" />
                Play vs Bot
              </button>
            </div>
          </div>
        )}

        {/* Main Options - Only show if not in queue */}
        {(!queueStatus || queueStatus.status === "expired") && (
          <>
            {/* Language & Difficulty Selection */}
            <div className="bg-gray-800 rounded-xl p-6 mb-6">
              <h2 className="text-lg font-bold text-white mb-4">Select Your Setup</h2>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-400 mb-3">Language</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.value}
                      onClick={() => setSelectedLanguage(lang.value)}
                      className={`p-3 rounded-lg text-center transition-all ${
                        selectedLanguage === lang.value
                          ? "bg-blue-600 text-white ring-2 ring-blue-400"
                          : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      }`}
                    >
                      <span className="text-2xl block mb-1">{lang.icon}</span>
                      <span className="text-xs">{lang.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-3">Difficulty</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {DIFFICULTIES.map((diff) => (
                    <button
                      key={diff.value}
                      onClick={() => setSelectedDifficulty(diff.value)}
                      className={`p-4 rounded-lg text-center transition-all ${
                        selectedDifficulty === diff.value
                          ? "bg-gray-700 ring-2 ring-blue-400"
                          : "bg-gray-700/50 hover:bg-gray-700"
                      }`}
                    >
                      <div className={`w-3 h-3 rounded-full ${diff.color} mx-auto mb-2`}></div>
                      <span className="text-white font-medium block">{diff.label}</span>
                      <span className="text-gray-400 text-xs flex items-center justify-center gap-1">
                        <Clock className="h-3 w-3" />
                        {diff.time}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Play Options */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {/* Find Match */}
              <div className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 border border-blue-700 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Users className="h-8 w-8 text-blue-400" />
                  <h2 className="text-xl font-bold text-white">Find Match</h2>
                </div>
                <p className="text-gray-400 mb-6">
                  Join the matchmaking queue and battle a player with similar skill rating.
                </p>
                <button
                  onClick={joinQueue}
                  disabled={isQueuing}
                  className="w-full py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold text-lg"
                >
                  {isQueuing ? "Finding Match..." : "Find Opponent"}
                </button>
              </div>

              {/* Play vs Bot */}
              <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 border border-purple-700 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Bot className="h-8 w-8 text-purple-400" />
                  <h2 className="text-xl font-bold text-white">Play vs Bot</h2>
                </div>
                <p className="text-gray-400 mb-6">
                  Practice against an AI opponent. Smaller rating changes apply.
                </p>
                <button
                  onClick={playVsBot}
                  disabled={isQueuing}
                  className="w-full py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-semibold text-lg"
                >
                  {isQueuing ? "Starting..." : "Play vs Bot"}
                </button>
              </div>
            </div>

            {/* Challenge Specific User */}
            <div className="bg-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Swords className="h-6 w-6 text-yellow-400" />
                <h2 className="text-xl font-bold text-white">Challenge a Player</h2>
              </div>
              <p className="text-gray-400 mb-4">
                Send a direct challenge to a specific user. They have 24 hours to accept.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    value={challengeUsername}
                    onChange={(e) => setChallengeUsername(e.target.value)}
                    placeholder="Enter username..."
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    value={challengeMessage}
                    onChange={(e) => setChallengeMessage(e.target.value)}
                    placeholder="Message (optional)..."
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={sendChallenge}
                  disabled={isChallengingUser || !challengeUsername.trim()}
                  className="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 font-semibold whitespace-nowrap"
                >
                  {isChallengingUser ? "Sending..." : "Send Challenge"}
                </button>
              </div>
            </div>

            {/* Recent Duels Link */}
            <div className="mt-6 text-center">
              <Link
                href="/duels/history"
                className="text-blue-400 hover:text-blue-300"
              >
                View Duel History →
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
