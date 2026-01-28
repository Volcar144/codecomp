"use client";

import { useState, useEffect, use, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { Loading } from "@/components/ui/Loading";
import { ErrorMessage } from "@/components/ui/ErrorMessage";

// Icons
const CopyIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const RefreshIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const ShareIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
  </svg>
);

interface ArenaParticipant {
  id: string;
  user_id: string;
  github_username: string | null;
  directory_path: string;
  joined_at: string;
}

interface ArenaJudge {
  id: string;
  user_id: string;
  added_at: string;
}

interface Arena {
  id: string;
  title: string;
  description: string | null;
  creator_id: string;
  github_repo: string;
  start_date: string | null;
  end_date: string | null;
  status: "draft" | "active" | "judging" | "completed";
  is_public: boolean;
  invite_code: string | null;
  judging_criteria: string | null;
  max_participants: number | null;
  created_at: string;
  arena_participants: ArenaParticipant[];
  arena_judges: ArenaJudge[];
}

export default function ArenaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending } = useSession();
  const [arena, setArena] = useState<Arena | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [isParticipant, setIsParticipant] = useState(false);
  const [isJudge, setIsJudge] = useState(false);
  const [joinInviteCode, setJoinInviteCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  // Auto-fill invite code from URL query parameter
  useEffect(() => {
    const inviteFromUrl = searchParams.get("invite");
    if (inviteFromUrl) {
      setJoinInviteCode(inviteFromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!isPending && session) {
      fetchArena();
    }
  }, [isPending, session, id]);

  const fetchArena = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/arenas/${id}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch arena");
      }

      const data = await response.json();
      setArena(data.arena);
      setIsCreator(data.isCreator);
      setIsParticipant(data.isParticipant);
      setIsJudge(data.isJudge);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!arena) return;
    setJoining(true);
    setError(null);

    try {
      const response = await fetch(`/api/arenas/${id}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invite_code: joinInviteCode || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to join arena");
      }

      await fetchArena();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!confirm("Are you sure you want to leave this arena?")) return;

    try {
      const response = await fetch(`/api/arenas/${id}/join`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to leave arena");
      }

      await fetchArena();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const response = await fetch(`/api/arenas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update status");
      }

      await fetchArena();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this arena? This action cannot be undone."
      )
    )
      return;

    try {
      const response = await fetch(`/api/arenas/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete arena");
      }

      router.push("/arenas");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const getInviteLink = useCallback(() => {
    if (!arena?.invite_code) return "";
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    return `${baseUrl}/arenas/${id}?invite=${arena.invite_code}`;
  }, [arena?.invite_code, id]);

  const handleCopyCode = async () => {
    if (!arena?.invite_code) return;
    try {
      await navigator.clipboard.writeText(arena.invite_code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (err) {
      setError("Failed to copy to clipboard");
    }
  };

  const handleCopyLink = async () => {
    const link = getInviteLink();
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      setError("Failed to copy to clipboard");
    }
  };

  const handleRegenerateCode = async () => {
    if (!confirm("Are you sure you want to regenerate the invite code? The old code will no longer work.")) return;
    
    setRegenerating(true);
    try {
      const response = await fetch(`/api/arenas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerate_invite_code: true }),
      });

      if (!response.ok) {
        throw new Error("Failed to regenerate invite code");
      }

      await fetchArena();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setRegenerating(false);
    }
  };

  const handleShare = async () => {
    const link = getInviteLink();
    if (!link || !arena) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${arena.title}`,
          text: `Join the coding arena "${arena.title}"`,
          url: link,
        });
      } catch (err) {
        // User cancelled or share failed, fallback to copy
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-gray-500";
      case "active":
        return "bg-green-500";
      case "judging":
        return "bg-yellow-500";
      case "completed":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  if (isPending || loading) {
    return <Loading />;
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please sign in to view this arena</h1>
          <Link
            href="/login"
            className="bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded-lg"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (error && !arena) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <ErrorMessage message={error} />
          <Link href="/arenas" className="text-purple-400 hover:text-purple-300">
            ← Back to arenas
          </Link>
        </div>
      </div>
    );
  }

  if (!arena) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <p>Arena not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <Link
              href="/arenas"
              className="text-purple-400 hover:text-purple-300 text-sm mb-2 inline-block"
            >
              ← Back to arenas
            </Link>
            <h1 className="text-3xl font-bold mb-2">{arena.title}</h1>
            <div className="flex items-center gap-3">
              <span
                className={`px-3 py-1 rounded text-sm font-semibold ${getStatusColor(
                  arena.status
                )}`}
              >
                {arena.status}
              </span>
              {!arena.is_public && (
                <span className="text-yellow-500 text-sm flex items-center gap-1">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  Private
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {isParticipant && arena.status === "active" && (
              <Link
                href={`/arenas/${id}/code`}
                className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg font-semibold"
              >
                Open Editor
              </Link>
            )}
            {(isCreator || isJudge) && (
              <Link
                href={`/arenas/${id}/judge`}
                className="bg-yellow-600 hover:bg-yellow-700 px-4 py-2 rounded-lg font-semibold"
              >
                Judge Panel
              </Link>
            )}
          </div>
        </div>

        {error && <ErrorMessage message={error} />}

        {/* Description */}
        {arena.description && (
          <div className="bg-gray-800 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold mb-3">Description</h2>
            <p className="text-gray-300 whitespace-pre-wrap">{arena.description}</p>
          </div>
        )}

        {/* Details Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Details</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-gray-500 text-sm">GitHub Repository</dt>
                <dd className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  <a
                    href={`https://github.com/${arena.github_repo}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-400 hover:text-purple-300"
                  >
                    {arena.github_repo}
                  </a>
                </dd>
              </div>
              {arena.start_date && (
                <div>
                  <dt className="text-gray-500 text-sm">Start Date</dt>
                  <dd>{new Date(arena.start_date).toLocaleString()}</dd>
                </div>
              )}
              {arena.end_date && (
                <div>
                  <dt className="text-gray-500 text-sm">End Date</dt>
                  <dd>{new Date(arena.end_date).toLocaleString()}</dd>
                </div>
              )}
              <div>
                <dt className="text-gray-500 text-sm">Participants</dt>
                <dd>
                  {arena.arena_participants?.length || 0}
                  {arena.max_participants && ` / ${arena.max_participants}`}
                </dd>
              </div>
            </dl>
          </div>

          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Judging Criteria</h2>
            {arena.judging_criteria ? (
              <p className="text-gray-300 whitespace-pre-wrap">
                {arena.judging_criteria}
              </p>
            ) : (
              <p className="text-gray-500">No criteria specified</p>
            )}
          </div>
        </div>

        {/* Join Section */}
        {!isParticipant && !isCreator && arena.status !== "completed" && (
          <div className="bg-gray-800 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Join this Arena</h2>
            {!arena.is_public && (
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-2">
                  Invite Code
                </label>
                <input
                  type="text"
                  value={joinInviteCode}
                  onChange={(e) => setJoinInviteCode(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                  placeholder="Enter invite code"
                />
              </div>
            )}
            <button
              onClick={handleJoin}
              disabled={joining || (!arena.is_public && !joinInviteCode)}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 px-6 py-2 rounded-lg font-semibold"
            >
              {joining ? "Joining..." : "Join Arena"}
            </button>
          </div>
        )}

        {/* Participant Section */}
        {isParticipant && (
          <div className="bg-gray-800 rounded-xl p-6 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold">You&apos;re a Participant!</h2>
                <p className="text-gray-400 text-sm mt-1">
                  {arena.status === "active"
                    ? "Start coding and submit your app"
                    : arena.status === "judging"
                    ? "Submissions are being judged"
                    : "The arena has ended"}
                </p>
              </div>
              {arena.status === "draft" && (
                <button
                  onClick={handleLeave}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  Leave Arena
                </button>
              )}
            </div>
          </div>
        )}

        {/* Creator Controls */}
        {isCreator && (
          <div className="bg-gray-800 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Arena Management</h2>

            {/* Enhanced Invite Code Section */}
            {!arena.is_public && arena.invite_code && (
              <div className="mb-6 p-4 bg-gray-700 rounded-lg border border-gray-600">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-300">Invite Code</h3>
                  <button
                    onClick={handleRegenerateCode}
                    disabled={regenerating}
                    className="text-xs text-gray-400 hover:text-white flex items-center gap-1 disabled:opacity-50"
                    title="Regenerate invite code"
                  >
                    <RefreshIcon />
                    {regenerating ? "Regenerating..." : "Regenerate"}
                  </button>
                </div>
                
                {/* Invite Code */}
                <div className="flex items-center gap-2 mb-4">
                  <code className="flex-1 text-lg font-mono text-purple-400 bg-gray-800 px-4 py-2 rounded-lg select-all">
                    {arena.invite_code}
                  </code>
                  <button
                    onClick={handleCopyCode}
                    className="p-2 bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors"
                    title="Copy invite code"
                  >
                    {copiedCode ? <CheckIcon /> : <CopyIcon />}
                  </button>
                </div>
                
                {/* Shareable Link */}
                <div className="mb-4">
                  <p className="text-xs text-gray-400 mb-2">Shareable Link</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={getInviteLink()}
                      readOnly
                      className="flex-1 text-sm font-mono text-gray-300 bg-gray-800 px-3 py-2 rounded-lg border border-gray-600 focus:outline-none"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="p-2 bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors"
                      title="Copy link"
                    >
                      {copiedLink ? <CheckIcon /> : <CopyIcon />}
                    </button>
                    <button
                      onClick={handleShare}
                      className="p-2 bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors"
                      title="Share"
                    >
                      <ShareIcon />
                    </button>
                  </div>
                </div>
                
                {/* Copy Feedback */}
                {(copiedCode || copiedLink) && (
                  <p className="text-xs text-green-400 flex items-center gap-1">
                    <CheckIcon /> Copied to clipboard!
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              {arena.status === "draft" && (
                <button
                  onClick={() => handleStatusChange("active")}
                  className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg"
                >
                  Start Arena
                </button>
              )}
              {arena.status === "active" && (
                <button
                  onClick={() => handleStatusChange("judging")}
                  className="bg-yellow-600 hover:bg-yellow-700 px-4 py-2 rounded-lg"
                >
                  Start Judging
                </button>
              )}
              {arena.status !== "completed" && (
                <Link
                  href={`/arenas/${id}/edit`}
                  className="bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded-lg"
                >
                  Edit Arena
                </Link>
              )}
              {arena.status === "draft" && (
                <button
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg"
                >
                  Delete Arena
                </button>
              )}
            </div>
          </div>
        )}

        {/* Participants List */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">
            Participants ({arena.arena_participants?.length || 0})
          </h2>
          {arena.arena_participants && arena.arena_participants.length > 0 ? (
            <div className="space-y-3">
              {arena.arena_participants.map((participant) => (
                <div
                  key={participant.id}
                  className="flex items-center justify-between bg-gray-700 rounded-lg p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center font-semibold">
                      {(participant.github_username || "U")[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">
                        {participant.github_username || "Anonymous"}
                      </p>
                      <p className="text-gray-500 text-sm">
                        Joined {new Date(participant.joined_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {(isCreator || isJudge) && (
                    <Link
                      href={`/arenas/${id}/participant/${participant.id}`}
                      className="text-purple-400 hover:text-purple-300 text-sm"
                    >
                      View Code →
                    </Link>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No participants yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
