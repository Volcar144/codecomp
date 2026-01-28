"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { Loading } from "@/components/ui/Loading";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { ScoringRubric } from "./components/ScoringRubric";
import { JudgeManagement } from "./components/JudgeManagement";
import { ScoringSummary } from "./components/ScoringSummary";
import { Eye, BarChart3, Users, Trophy, Shield, ClipboardList } from "lucide-react";

interface Participant {
  id: string;
  user_id: string;
  github_username: string | null;
  directory_path: string;
  joined_at: string;
  scores?: Array<{
    score: number;
    feedback: string | null;
    judge_id: string;
    created_at?: string;
  }>;
  totalScore: number;
}

interface Judge {
  id: string;
  user_id: string;
  email?: string;
  name?: string;
  assigned_at: string;
  scores_given?: number;
}

interface Arena {
  id: string;
  title: string;
  status: string;
  judging_criteria: string | null;
  winner_id: string | null;
  arena_judges?: Judge[];
}

type ViewMode = "scoring" | "summary" | "judges";

export default function JudgePanelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session, isPending } = useSession();
  const [arena, setArena] = useState<Arena | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [judges, setJudges] = useState<Judge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("scoring");

  useEffect(() => {
    if (!isPending && session) {
      fetchJudgeData();
    }
  }, [isPending, session, id]);

  const fetchJudgeData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/arenas/${id}/judge`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch judge data");
      }

      const data = await response.json();
      setArena(data.arena);
      setParticipants(data.participants || []);
      setJudges(data.arena?.arena_judges || []);
      setIsCreator(data.isCreator);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleScoreSubmit = async (
    _criteriaScores: Array<{ criteriaId: string; score: number; comment?: string }>,
    totalScore: number,
    feedback: string
  ) => {
    if (!selectedParticipant) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/arenas/${id}/judge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "score",
          participantId: selectedParticipant,
          score: totalScore,
          feedback: feedback || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit score");
      }

      setSelectedParticipant(null);
      await fetchJudgeData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const declareWinner = async (participantId: string) => {
    if (!confirm("Are you sure you want to declare this participant as the winner?"))
      return;

    try {
      const response = await fetch(`/api/arenas/${id}/judge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "declare_winner",
          participantId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to declare winner");
      }

      await fetchJudgeData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  if (isPending || loading) {
    return <Loading />;
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <p>Please sign in to access the judge panel</p>
      </div>
    );
  }

  if (!arena) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <ErrorMessage message={error || "Arena not found"} />
        </div>
      </div>
    );
  }

  const sortedParticipants = [...participants].sort(
    (a, b) => b.totalScore - a.totalScore
  );

  const getSelectedParticipantName = () => {
    const p = participants.find(part => part.id === selectedParticipant);
    return p?.github_username || "Anonymous";
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link
            href={`/arenas/${id}`}
            className="text-purple-400 hover:text-purple-300 text-sm mb-2 inline-block"
          >
            ← Back to Arena
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Judge Panel</h1>
              <p className="text-gray-400 mt-1">{arena.title}</p>
            </div>
            <div className="flex items-center gap-2">
              {arena.winner_id && (
                <span className="bg-yellow-600 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2">
                  <Trophy className="h-4 w-4" />
                  Winner Declared
                </span>
              )}
              <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                arena.status === "judging" ? "bg-purple-600" :
                arena.status === "completed" ? "bg-green-600" :
                "bg-gray-600"
              }`}>
                {arena.status.charAt(0).toUpperCase() + arena.status.slice(1)}
              </span>
            </div>
          </div>
        </div>

        {error && <ErrorMessage message={error} />}

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setViewMode("scoring")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === "scoring"
                ? "bg-purple-600 text-white"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            <ClipboardList className="h-4 w-4" />
            Scoring
          </button>
          <button
            onClick={() => setViewMode("summary")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === "summary"
                ? "bg-purple-600 text-white"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Summary
          </button>
          {isCreator && (
            <button
              onClick={() => setViewMode("judges")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === "judges"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              <Shield className="h-4 w-4" />
              Judges
            </button>
          )}
        </div>

        {arena.judging_criteria && (
          <div className="bg-gray-800 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold mb-3">Judging Criteria</h2>
            <p className="text-gray-300 whitespace-pre-wrap">{arena.judging_criteria}</p>
          </div>
        )}

        {viewMode === "scoring" && (
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-400" />
                Participants ({sortedParticipants.length})
              </h2>
            </div>

            {sortedParticipants.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No participants yet</p>
            ) : (
              <div className="space-y-4">
                {sortedParticipants.map((participant, index) => (
                  <div
                    key={participant.id}
                    className={`bg-gray-700 rounded-lg p-4 ${
                      arena.winner_id === participant.id
                        ? "border-2 border-yellow-500"
                        : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`text-2xl font-bold ${
                          index === 0 && participant.totalScore > 0 ? "text-yellow-500" :
                          index === 1 && participant.totalScore > 0 ? "text-gray-400" :
                          index === 2 && participant.totalScore > 0 ? "text-amber-700" :
                          "text-gray-500"
                        }`}>
                          #{index + 1}
                        </span>
                        <div>
                          <p className="font-semibold flex items-center gap-2">
                            {participant.github_username || "Anonymous"}
                            {arena.winner_id === participant.id && (
                              <span className="text-yellow-500">🏆 Winner</span>
                            )}
                          </p>
                          <p className="text-gray-400 text-sm">
                            Total Score: <span className="font-semibold text-white">{participant.totalScore.toFixed(1)}</span> points
                            {participant.scores && participant.scores.length > 0 && (
                              <span className="ml-2">({participant.scores.length} reviews)</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/arenas/${id}/participant/${participant.id}`}
                          className="flex items-center gap-1 text-purple-400 hover:text-purple-300 text-sm"
                        >
                          <Eye className="h-4 w-4" />
                          View Code
                        </Link>
                        {isCreator &&
                          arena.status === "judging" &&
                          !arena.winner_id && (
                            <button
                              onClick={() => declareWinner(participant.id)}
                              className="flex items-center gap-1 bg-yellow-600 hover:bg-yellow-700 px-3 py-1 rounded text-sm"
                            >
                              <Trophy className="h-4 w-4" />
                              Declare Winner
                            </button>
                          )}
                      </div>
                    </div>

                    {participant.scores && participant.scores.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {participant.scores.map((s, i) => (
                          <span
                            key={i}
                            className="bg-gray-600 px-2 py-1 rounded text-sm"
                          >
                            {s.score} pts
                            {s.feedback && (
                              <span className="text-gray-400 ml-1">
                                - {s.feedback.length > 30 ? s.feedback.substring(0, 30) + "..." : s.feedback}
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    )}

                    {arena.status === "judging" && (
                      <div className="mt-4">
                        {selectedParticipant === participant.id ? (
                          <ScoringRubric
                            criteria={[]}
                            onScoreSubmit={handleScoreSubmit}
                            onCancel={() => setSelectedParticipant(null)}
                            submitting={submitting}
                            participantName={getSelectedParticipantName()}
                          />
                        ) : (
                          <button
                            onClick={() => setSelectedParticipant(participant.id)}
                            className="text-purple-400 hover:text-purple-300 text-sm font-medium"
                          >
                            + Add Score
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {viewMode === "summary" && (
          <ScoringSummary
            participants={participants}
            winnerId={arena.winner_id}
          />
        )}

        {viewMode === "judges" && isCreator && (
          <JudgeManagement
            judges={judges}
            isCreator={isCreator}
            arenaId={id}
            onJudgeAdded={fetchJudgeData}
            onJudgeRemoved={fetchJudgeData}
          />
        )}
      </div>
    </div>
  );
}
