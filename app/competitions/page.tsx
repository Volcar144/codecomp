"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Code2, Calendar, Users, Search, Filter, Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { useSession } from "@/lib/auth-client";

interface Competition {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  status: "draft" | "active" | "upcoming" | "ended";
  allowed_languages: string[];
  creator_id: string;
  created_at: string;
}

type StatusFilter = "all" | "active" | "upcoming" | "ended";

function getCompetitionStatus(competition: Competition): "active" | "upcoming" | "ended" {
  const now = new Date();
  const startDate = new Date(competition.start_date);
  const endDate = new Date(competition.end_date);

  if (now < startDate) return "upcoming";
  if (now > endDate) return "ended";
  return "active";
}

function getStatusColor(status: string) {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
    case "upcoming":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
    case "ended":
      return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
  }
}

export default function CompetitionsPage() {
  const { data: session } = useSession();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [refreshing, setRefreshing] = useState(false);

  const fetchCompetitions = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/competitions");
      if (!response.ok) {
        throw new Error("Failed to fetch competitions");
      }
      const data = await response.json();
      setCompetitions(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load competitions");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCompetitions();
  }, []);

  // Filter competitions based on search and status
  const filteredCompetitions = competitions.filter((competition) => {
    const computedStatus = getCompetitionStatus(competition);
    const matchesSearch =
      competition.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      competition.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || computedStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Count competitions by status
  const statusCounts = competitions.reduce(
    (acc, comp) => {
      const status = getCompetitionStatus(comp);
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    },
    { active: 0, upcoming: 0, ended: 0 } as Record<string, number>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="border-b bg-white dark:bg-gray-900">
        <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Code2 className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold">CodeComp</span>
          </Link>
          <div className="flex gap-4">
            <Link
              href="/dashboard"
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
            >
              Dashboard
            </Link>
            {session ? (
              <Link
                href="/competitions/create"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Competition
              </Link>
            ) : (
              <Link
                href="/login?redirect=/competitions/create"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Sign In to Create
              </Link>
            )}
          </div>
        </nav>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Competitions</h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Browse and join coding competitions
          </p>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search competitions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 transition-colors"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 transition-colors"
              >
                <option value="all">All Status ({competitions.length})</option>
                <option value="active">Active ({statusCounts.active})</option>
                <option value="upcoming">Upcoming ({statusCounts.upcoming})</option>
                <option value="ended">Ended ({statusCounts.ended})</option>
              </select>
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => fetchCompetitions(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Loading competitions...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              <div>
                <h3 className="font-semibold text-red-800 dark:text-red-200">Error loading competitions</h3>
                <p className="text-red-600 dark:text-red-400">{error}</p>
              </div>
            </div>
            <button
              onClick={() => fetchCompetitions()}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Competitions Grid */}
        {!loading && !error && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredCompetitions.map((competition) => {
              const status = getCompetitionStatus(competition);
              return (
                <div
                  key={competition.id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <h2 className="text-xl font-bold line-clamp-2">{competition.title}</h2>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ml-2 ${getStatusColor(
                          status
                        )}`}
                      >
                        {status}
                      </span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
                      {competition.description || "No description provided."}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(competition.start_date).toLocaleDateString()}</span>
                      </div>
                      {competition.allowed_languages && (
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>{competition.allowed_languages.length} languages</span>
                        </div>
                      )}
                    </div>
                    <Link
                      href={`/competitions/${competition.id}`}
                      className={`block w-full text-center py-2 px-4 rounded-lg font-semibold transition-colors ${
                        status === "ended"
                          ? "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                    >
                      {status === "ended" ? "View Results" : "View Details"}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredCompetitions.length === 0 && (
          <div className="text-center py-16">
            {competitions.length === 0 ? (
              <>
                <p className="text-gray-500 dark:text-gray-400 text-lg mb-4">
                  No competitions available yet
                </p>
                {session ? (
                  <Link
                    href="/competitions/create"
                    className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                  >
                    Create the First Competition
                  </Link>
                ) : (
                  <Link
                    href="/login?redirect=/competitions/create"
                    className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                  >
                    Sign In to Create Competition
                  </Link>
                )}
              </>
            ) : (
              <>
                <p className="text-gray-500 dark:text-gray-400 text-lg mb-4">
                  No competitions match your search
                </p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                  }}
                  className="inline-block px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-semibold transition-colors"
                >
                  Clear Filters
                </button>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
