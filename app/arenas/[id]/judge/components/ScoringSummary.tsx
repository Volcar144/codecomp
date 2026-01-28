"use client";

import { useMemo } from "react";
import { Trophy, Medal, BarChart3, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Score {
  score: number;
  feedback: string | null;
  judge_id: string;
  created_at?: string;
}

interface Participant {
  id: string;
  github_username: string | null;
  totalScore: number;
  scores?: Score[];
}

interface ScoringSummaryProps {
  participants: Participant[];
  winnerId: string | null;
}

export function ScoringSummary({ participants, winnerId }: ScoringSummaryProps) {
  const stats = useMemo(() => {
    const scores = participants.map(p => p.totalScore).filter(s => s > 0);
    if (scores.length === 0) {
      return { avg: 0, high: 0, low: 0, median: 0, totalJudged: 0 };
    }
    
    scores.sort((a, b) => a - b);
    const sum = scores.reduce((a, b) => a + b, 0);
    const avg = sum / scores.length;
    const median = scores.length % 2 === 0
      ? (scores[scores.length / 2 - 1] + scores[scores.length / 2]) / 2
      : scores[Math.floor(scores.length / 2)];
    
    return {
      avg: avg.toFixed(1),
      high: Math.max(...scores),
      low: Math.min(...scores),
      median: median.toFixed(1),
      totalJudged: scores.length,
    };
  }, [participants]);

  const sortedParticipants = useMemo(() => {
    return [...participants].sort((a, b) => b.totalScore - a.totalScore);
  }, [participants]);

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 1: return <Medal className="h-5 w-5 text-gray-400" />;
      case 2: return <Medal className="h-5 w-5 text-amber-700" />;
      default: return <span className="w-5 h-5 flex items-center justify-center text-sm text-gray-500">#{index + 1}</span>;
    }
  };

  const getScoreTrend = (participant: Participant) => {
    if (!participant.scores || participant.scores.length < 2) {
      return <Minus className="h-4 w-4 text-gray-400" />;
    }
    
    const sortedScores = [...participant.scores].sort((a, b) => 
      new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
    );
    
    const lastScore = sortedScores[sortedScores.length - 1].score;
    const prevScore = sortedScores[sortedScores.length - 2].score;
    
    if (lastScore > prevScore) {
      return <span title="Improving"><TrendingUp className="h-4 w-4 text-green-400" /></span>;
    } else if (lastScore < prevScore) {
      return <span title="Declining"><TrendingDown className="h-4 w-4 text-red-400" /></span>;
    }
    return <span title="Stable"><Minus className="h-4 w-4 text-gray-400" /></span>;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-yellow-400";
    if (score >= 40) return "text-orange-400";
    return "text-red-400";
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 className="h-5 w-5 text-purple-400" />
        <h2 className="text-lg font-semibold">Scoring Summary</h2>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-700 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-purple-400">{stats.totalJudged}</p>
          <p className="text-sm text-gray-400">Participants Judged</p>
        </div>
        <div className="bg-gray-700 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{stats.high}</p>
          <p className="text-sm text-gray-400">Highest Score</p>
        </div>
        <div className="bg-gray-700 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-blue-400">{stats.avg}</p>
          <p className="text-sm text-gray-400">Average Score</p>
        </div>
        <div className="bg-gray-700 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-yellow-400">{stats.median}</p>
          <p className="text-sm text-gray-400">Median Score</p>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-400 mb-3">Rankings</h3>
        {sortedParticipants.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No participants scored yet</p>
        ) : (
          sortedParticipants.map((participant, index) => (
            <div
              key={participant.id}
              className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                winnerId === participant.id
                  ? "bg-yellow-600/20 border border-yellow-600"
                  : index === 0 && participant.totalScore > 0
                  ? "bg-purple-600/20 border border-purple-600"
                  : "bg-gray-700 hover:bg-gray-700/80"
              }`}
            >
              <div className="flex items-center gap-3">
                {getRankIcon(index)}
                <div>
                  <p className="font-medium flex items-center gap-2">
                    {participant.github_username || "Anonymous"}
                    {winnerId === participant.id && (
                      <span className="text-yellow-500 text-sm">🏆 Winner</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400">
                    {participant.scores?.length || 0} score(s) from judges
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {getScoreTrend(participant)}
                <div className="text-right">
                  <p className={`text-lg font-bold ${getScoreColor(participant.totalScore)}`}>
                    {participant.totalScore.toFixed(1)}
                  </p>
                  <p className="text-xs text-gray-400">points</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Score Distribution (visual) */}
      {sortedParticipants.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Score Distribution</h3>
          <div className="space-y-2">
            {sortedParticipants.slice(0, 5).map((participant) => {
              const percentage = (participant.totalScore / 100) * 100;
              return (
                <div key={participant.id} className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-24 truncate">
                    {participant.github_username || "Anon"}
                  </span>
                  <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        percentage >= 80 ? "bg-green-500" :
                        percentage >= 60 ? "bg-yellow-500" :
                        percentage >= 40 ? "bg-orange-500" :
                        "bg-red-500"
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-12 text-right">
                    {participant.totalScore.toFixed(0)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
