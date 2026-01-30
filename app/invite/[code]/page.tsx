"use client";

import { useState, useEffect, use } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import { Loading } from "@/components/ui/Loading";

interface InvitePageProps {
  params: Promise<{
    code: string;
  }>;
}

interface InviteData {
  type: "competition" | "arena";
  invite: {
    id: string;
    code: string;
    role: string;
    expires_at: string | null;
    max_uses: number | null;
    uses: number;
    competition?: {
      id: string;
      title: string;
      description: string;
      start_time: string;
      end_time: string;
    };
    arena?: {
      id: string;
      name: string;
      description: string;
      difficulty: string;
    };
  };
}

export default function InvitePage({ params }: InvitePageProps) {
  const resolvedParams = use(params);
  const { code } = resolvedParams;
  const { data: session, isPending: sessionLoading } = useSession();
  const router = useRouter();

  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [redeeming, setRedeeming] = useState(false);

  useEffect(() => {
    const fetchInvite = async () => {
      try {
        const res = await fetch(`/api/invites?code=${code}`);
        const data = await res.json();

        if (data.error) {
          setError(data.error);
        } else {
          setInviteData(data);
        }
      } catch (err) {
        setError("Failed to load invite");
      } finally {
        setLoading(false);
      }
    };

    fetchInvite();
  }, [code]);

  const handleRedeem = async () => {
    if (!session?.user) {
      router.push(`/login?redirect=/invite/${code}`);
      return;
    }

    setRedeeming(true);
    try {
      const res = await fetch("/api/invites/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        router.push(data.redirectUrl);
      }
    } catch (err) {
      setError("Failed to redeem invite");
    } finally {
      setRedeeming(false);
    }
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

      <div className="max-w-lg mx-auto px-4 py-16">
        {error ? (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <div className="text-4xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Invalid Invite
            </h1>
            <p className="text-gray-400 mb-6">{error}</p>
            <Link
              href="/"
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white inline-block"
            >
              Go Home
            </Link>
          </div>
        ) : inviteData ? (
          <div className="bg-gray-800 rounded-lg p-8">
            <div className="text-center mb-6">
              <div className="text-4xl mb-4">🎟️</div>
              <h1 className="text-2xl font-bold text-white mb-2">
                You've Been Invited!
              </h1>
              <p className="text-gray-400">
                You've been invited to join as a{" "}
                <span className="text-green-400 font-medium">
                  {inviteData.invite.role}
                </span>
              </p>
            </div>

            {/* Competition invite details */}
            {inviteData.type === "competition" && inviteData.invite.competition && (
              <div className="bg-gray-900 rounded-lg p-4 mb-6">
                <div className="text-xs text-blue-400 uppercase tracking-wider mb-2">
                  Competition
                </div>
                <h2 className="text-xl font-bold text-white mb-2">
                  {inviteData.invite.competition.title}
                </h2>
                <p className="text-gray-400 text-sm mb-4">
                  {inviteData.invite.competition.description}
                </p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500">Starts</div>
                    <div className="text-white">
                      {new Date(
                        inviteData.invite.competition.start_time
                      ).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Ends</div>
                    <div className="text-white">
                      {new Date(
                        inviteData.invite.competition.end_time
                      ).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Arena invite details */}
            {inviteData.type === "arena" && inviteData.invite.arena && (
              <div className="bg-gray-900 rounded-lg p-4 mb-6">
                <div className="text-xs text-purple-400 uppercase tracking-wider mb-2">
                  Arena
                </div>
                <h2 className="text-xl font-bold text-white mb-2">
                  {inviteData.invite.arena.name}
                </h2>
                <p className="text-gray-400 text-sm mb-4">
                  {inviteData.invite.arena.description}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Difficulty:</span>
                  <span
                    className={`px-2 py-0.5 rounded text-sm ${
                      inviteData.invite.arena.difficulty === "easy"
                        ? "bg-green-600"
                        : inviteData.invite.arena.difficulty === "medium"
                        ? "bg-yellow-600"
                        : inviteData.invite.arena.difficulty === "hard"
                        ? "bg-red-600"
                        : "bg-purple-600"
                    }`}
                  >
                    {inviteData.invite.arena.difficulty}
                  </span>
                </div>
              </div>
            )}

            {/* Invite details */}
            <div className="text-sm text-gray-500 mb-6">
              {inviteData.invite.expires_at && (
                <div>
                  Expires:{" "}
                  {new Date(inviteData.invite.expires_at).toLocaleString()}
                </div>
              )}
              {inviteData.invite.max_uses && (
                <div>
                  Uses: {inviteData.invite.uses} / {inviteData.invite.max_uses}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="space-y-3">
              {session?.user ? (
                <button
                  onClick={handleRedeem}
                  disabled={redeeming}
                  className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg text-white font-medium"
                >
                  {redeeming ? "Joining..." : "Accept Invite"}
                </button>
              ) : (
                <>
                  <Link
                    href={`/login?redirect=/invite/${code}`}
                    className="block w-full py-3 bg-green-600 hover:bg-green-700 rounded-lg text-white font-medium text-center"
                  >
                    Log In to Accept
                  </Link>
                  <Link
                    href={`/register?redirect=/invite/${code}`}
                    className="block w-full py-3 bg-gray-600 hover:bg-gray-500 rounded-lg text-white text-center"
                  >
                    Create Account
                  </Link>
                </>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
