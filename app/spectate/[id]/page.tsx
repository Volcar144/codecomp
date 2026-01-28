"use client";

import { useEffect, useState, useRef, use } from "react";
import Link from "next/link";
import { Loading } from "@/components/ui/Loading";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { 
  ArrowLeft, Eye, Users, Clock, Trophy, Code2,
  Heart, ThumbsUp, Flame, Zap, PartyPopper, 
  Laugh, Star, Send
} from "lucide-react";

interface DuelDetails {
  id: string;
  player1_id: string;
  player2_id: string;
  language: string;
  status: string;
  winner_id: string | null;
  started_at: string;
  ended_at: string | null;
  duel_challenges: {
    title: string;
    description: string;
    difficulty: string;
    examples: { input: string; output: string }[];
  } | null;
}

interface SpectatorEmote {
  id: string;
  user_id: string;
  emote_type: string;
  target_player: number | null;
  created_at: string;
}

interface SpectateSession {
  id: string;
  duel_id: string;
  viewer_count: number;
  duels: DuelDetails;
}

const EMOTES = [
  { type: "fire", icon: Flame, label: "Fire!", color: "text-orange-500" },
  { type: "lightning", icon: Zap, label: "Fast!", color: "text-yellow-500" },
  { type: "heart", icon: Heart, label: "Love it!", color: "text-red-500" },
  { type: "thumbsup", icon: ThumbsUp, label: "Nice!", color: "text-blue-500" },
  { type: "party", icon: PartyPopper, label: "Party!", color: "text-purple-500" },
  { type: "laugh", icon: Laugh, label: "Haha!", color: "text-green-500" },
  { type: "star", icon: Star, label: "Amazing!", color: "text-amber-500" },
];

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  hard: "bg-red-100 text-red-700",
};

export default function SpectateSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [session, setSession] = useState<SpectateSession | null>(null);
  const [emotes, setEmotes] = useState<SpectatorEmote[]>([]);
  const [floatingEmotes, setFloatingEmotes] = useState<{ id: string; type: string; x: number; y: number }[]>([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [player1Progress, setPlayer1Progress] = useState(0);
  const [player2Progress, setPlayer2Progress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSession();
    joinSession();
    
    // Poll for updates every 2 seconds
    const pollInterval = setInterval(() => {
      fetchSession();
      fetchEmotes();
    }, 2000);

    return () => {
      clearInterval(pollInterval);
      leaveSession();
    };
  }, [id]);

  // Timer effect
  useEffect(() => {
    if (!session?.duels?.started_at || session.duels.status === "completed") return;
    
    const timer = setInterval(() => {
      const start = new Date(session.duels.started_at).getTime();
      const now = Date.now();
      setTimeElapsed(Math.floor((now - start) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [session?.duels?.started_at, session?.duels?.status]);

  // Simulate progress (in real implementation, this would come from the server)
  useEffect(() => {
    if (session?.duels?.status !== "active") return;
    
    const progressInterval = setInterval(() => {
      setPlayer1Progress((prev) => Math.min(prev + Math.random() * 2, 100));
      setPlayer2Progress((prev) => Math.min(prev + Math.random() * 2, 100));
    }, 3000);

    return () => clearInterval(progressInterval);
  }, [session?.duels?.status]);

  const fetchSession = async () => {
    try {
      const res = await fetch(`/api/spectate/${id}`);
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error);
      
      setSession(data.session);
      setViewerCount(data.session?.viewer_count || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load session");
    } finally {
      setLoading(false);
    }
  };

  const fetchEmotes = async () => {
    try {
      const res = await fetch(`/api/spectate/${id}?emotes=true`);
      const data = await res.json();
      
      if (res.ok && data.emotes) {
        // Show new emotes as floating animations
        const newEmotes = data.emotes.filter(
          (e: SpectatorEmote) => !emotes.find((existing) => existing.id === e.id)
        );
        
        newEmotes.forEach((emote: SpectatorEmote) => {
          addFloatingEmote(emote.emote_type);
        });
        
        setEmotes(data.emotes);
      }
    } catch (err) {
      // Silently fail for emote fetching
    }
  };

  const joinSession = async () => {
    try {
      await fetch(`/api/spectate/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "join" }),
      });
    } catch (err) {
      // Silently fail
    }
  };

  const leaveSession = async () => {
    try {
      await fetch(`/api/spectate/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "leave" }),
      });
    } catch (err) {
      // Silently fail
    }
  };

  const sendEmote = async (emoteType: string, targetPlayer?: number) => {
    // Add local floating emote immediately for responsiveness
    addFloatingEmote(emoteType);
    
    try {
      await fetch(`/api/spectate/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "emote", 
          emote_type: emoteType,
          target_player: targetPlayer 
        }),
      });
    } catch (err) {
      // Silently fail
    }
  };

  const addFloatingEmote = (type: string) => {
    const emoteId = `${Date.now()}-${Math.random()}`;
    const x = Math.random() * 80 + 10; // 10-90% from left
    const y = Math.random() * 60 + 20; // 20-80% from top
    
    setFloatingEmotes((prev) => [...prev, { id: emoteId, type, x, y }]);
    
    // Remove after animation completes
    setTimeout(() => {
      setFloatingEmotes((prev) => prev.filter((e) => e.id !== emoteId));
    }, 2000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} />;
  if (!session) return <ErrorMessage message="Session not found" />;

  const duel = session.duels;
  const challenge = duel?.duel_challenges;

  return (
    <div className="min-h-screen bg-gray-900 text-white" ref={containerRef}>
      {/* Floating Emotes */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
        {floatingEmotes.map((emote) => {
          const emoteConfig = EMOTES.find((e) => e.type === emote.type);
          if (!emoteConfig) return null;
          const Icon = emoteConfig.icon;
          
          return (
            <div
              key={emote.id}
              className={`absolute animate-float-up ${emoteConfig.color}`}
              style={{ left: `${emote.x}%`, top: `${emote.y}%` }}
            >
              <Icon className="w-8 h-8" />
            </div>
          );
        })}
      </div>

      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/spectate"
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-red-500" />
                <span className="text-red-500 font-medium animate-pulse">LIVE</span>
              </div>
              <h1 className="text-lg font-semibold">
                {challenge?.title || "Coding Duel"}
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-gray-400">
              <Clock className="w-4 h-4" />
              <span className="font-mono">{formatTime(timeElapsed)}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <Users className="w-4 h-4" />
              <span>{viewerCount} watching</span>
            </div>
            {challenge && (
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                DIFFICULTY_COLORS[challenge.difficulty] || "bg-gray-100 text-gray-700"
              }`}>
                {challenge.difficulty}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Players Progress */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Player 1 */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                  <Code2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium">Player 1</p>
                  <p className="text-sm text-gray-400">{duel.language}</p>
                </div>
              </div>
              {duel.status === "completed" && duel.winner_id === duel.player1_id && (
                <Trophy className="w-6 h-6 text-yellow-500" />
              )}
            </div>
            
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Progress</span>
                <span>{Math.round(player1Progress)}%</span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${player1Progress}%` }}
                />
              </div>
            </div>
            
            {/* Quick Emote for Player 1 */}
            <button
              onClick={() => sendEmote("fire", 1)}
              className="mt-4 w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="text-sm">Cheer Player 1</span>
            </button>
          </div>

          {/* Player 2 */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                  <Code2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium">
                    {duel.player2_id === "bot" ? "🤖 Bot" : "Player 2"}
                  </p>
                  <p className="text-sm text-gray-400">{duel.language}</p>
                </div>
              </div>
              {duel.status === "completed" && duel.winner_id === duel.player2_id && (
                <Trophy className="w-6 h-6 text-yellow-500" />
              )}
            </div>
            
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Progress</span>
                <span>{Math.round(player2Progress)}%</span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-purple-500 transition-all duration-500"
                  style={{ width: `${player2Progress}%` }}
                />
              </div>
            </div>
            
            {/* Quick Emote for Player 2 */}
            <button
              onClick={() => sendEmote("fire", 2)}
              className="mt-4 w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="text-sm">Cheer Player 2</span>
            </button>
          </div>
        </div>

        {/* Challenge Description */}
        {challenge && (
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-6">
            <h2 className="text-xl font-semibold mb-4">{challenge.title}</h2>
            <p className="text-gray-300 whitespace-pre-wrap mb-6">
              {challenge.description}
            </p>
            
            {challenge.examples && challenge.examples.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-medium">Examples:</h3>
                {challenge.examples.map((example, i) => (
                  <div key={i} className="bg-gray-900 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Input:</p>
                        <code className="text-sm text-green-400">{example.input}</code>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Output:</p>
                        <code className="text-sm text-blue-400">{example.output}</code>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Emote Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 p-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-center gap-3">
              <span className="text-sm text-gray-400 mr-4">Send Reactions:</span>
              {EMOTES.map((emote) => {
                const Icon = emote.icon;
                return (
                  <button
                    key={emote.type}
                    onClick={() => sendEmote(emote.type)}
                    className={`p-3 bg-gray-700 hover:bg-gray-600 rounded-xl transition-all hover:scale-110 active:scale-95 ${emote.color}`}
                    title={emote.label}
                  >
                    <Icon className="w-6 h-6" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Completed State */}
        {duel.status === "completed" && (
          <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl p-8 border border-yellow-500/30 text-center mb-20">
            <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Duel Complete!</h2>
            <p className="text-gray-300">
              {duel.winner_id 
                ? `${duel.winner_id === duel.player1_id ? "Player 1" : "Player 2"} wins!`
                : "It's a draw!"}
            </p>
            <Link
              href="/spectate"
              className="inline-block mt-6 px-6 py-3 bg-yellow-500 text-black rounded-lg font-medium hover:bg-yellow-400 transition-colors"
            >
              Find Another Duel
            </Link>
          </div>
        )}
      </div>

      {/* CSS for floating animation */}
      <style jsx global>{`
        @keyframes float-up {
          0% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-100px) scale(1.5);
          }
        }
        .animate-float-up {
          animation: float-up 2s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
