"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { Loading } from "@/components/ui/Loading";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import Navbar from "@/components/layout/Navbar";

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
  max_participants: number | null;
  created_at: string;
  arena_participants?: { count: number }[];
}

export default function ArenasPage() {
  const { data: session, isPending } = useSession();
  const [arenas, setArenas] = useState<Arena[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "my" | "participating">("all");

  useEffect(() => {
    if (!isPending && session) {
      fetchArenas();
    }
  }, [isPending, session, filter]);

  const fetchArenas = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter === "my") params.set("my", "true");
      if (filter === "participating") params.set("participating", "true");

      const response = await fetch(`/api/arenas?${params}`);
      if (!response.ok) throw new Error("Failed to fetch arenas");

      const data = await response.json();
      setArenas(data.arenas);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
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

  if (isPending) {
    return <Loading />;
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please sign in to view arenas</h1>
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

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Private Arenas</h1>
            <p className="text-gray-400 mt-2">
              App competitions with GitHub-integrated code storage
            </p>
          </div>
          <Link
            href="/arenas/create"
            className="bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg font-semibold flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Create Arena
          </Link>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-4 mb-6">
          {[
            { key: "all", label: "All Arenas" },
            { key: "my", label: "My Arenas" },
            { key: "participating", label: "Participating" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key as typeof filter)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === key
                  ? "bg-purple-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {error && <ErrorMessage message={error} />}

        {loading ? (
          <Loading />
        ) : arenas.length === 0 ? (
          <div className="text-center py-16 bg-gray-800 rounded-xl">
            <svg
              className="w-16 h-16 mx-auto text-gray-600 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            <h3 className="text-xl font-semibold mb-2">No arenas found</h3>
            <p className="text-gray-400 mb-4">
              {filter === "my"
                ? "You haven't created any arenas yet."
                : filter === "participating"
                ? "You're not participating in any arenas."
                : "No public arenas available."}
            </p>
            <Link
              href="/arenas/create"
              className="inline-block bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded-lg"
            >
              Create your first arena
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {arenas.map((arena) => (
              <Link
                key={arena.id}
                href={`/arenas/${arena.id}`}
                className="bg-gray-800 rounded-xl p-6 hover:bg-gray-750 transition-colors border border-gray-700 hover:border-purple-500"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold line-clamp-2">{arena.title}</h3>
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(
                      arena.status
                    )}`}
                  >
                    {arena.status}
                  </span>
                </div>

                {arena.description && (
                  <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                    {arena.description}
                  </p>
                )}

                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                    <span className="truncate max-w-[120px]">{arena.github_repo}</span>
                  </div>
                  <div className="flex items-center gap-1">
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
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <span>
                      {arena.arena_participants?.[0]?.count || 0}
                      {arena.max_participants && `/${arena.max_participants}`}
                    </span>
                  </div>
                  {!arena.is_public && (
                    <span className="flex items-center gap-1 text-yellow-500">
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

                {arena.end_date && (
                  <div className="mt-4 pt-4 border-t border-gray-700 text-sm text-gray-500">
                    Ends: {new Date(arena.end_date).toLocaleDateString()}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
