"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Calendar, Users, Search, Filter, Loader2, RefreshCw, AlertCircle, Lock, Globe, Swords, SortAsc, SortDesc, X, Code, ChevronDown, Code2 } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import Navbar from "@/components/layout/Navbar";

// All supported languages for filtering
const ALL_LANGUAGES = [
  { value: "python", label: "Python" },
  { value: "javascript", label: "JavaScript" },
  { value: "java", label: "Java" },
  { value: "cpp", label: "C++" },
  { value: "csharp", label: "C#" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
];

// Sort options
type SortField = "created_at" | "start_date" | "title";
type SortDirection = "asc" | "desc";

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

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
  is_public: boolean;
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
  max_participants: number | null;
  created_at: string;
  arena_participants?: { count: number }[];
}

type StatusFilter = "all" | "active" | "upcoming" | "ended";
type TabType = "competitions" | "arenas";

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
    case "completed":
      return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
    case "judging":
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300";
    case "draft":
      return "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
  }
}

export default function CompetitionsPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<TabType>("competitions");
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [arenas, setArenas] = useState<Arena[]>([]);
  const [loading, setLoading] = useState(true);
  const [arenasLoading, setArenasLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [arenasError, setArenasError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [refreshing, setRefreshing] = useState(false);
  
  // Advanced filters
  const [languageFilter, setLanguageFilter] = useState<string[]>([]);
  const [visibilityFilter, setVisibilityFilter] = useState<"all" | "public" | "private">("all");
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: "created_at", direction: "desc" });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

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

  const fetchArenas = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setArenasLoading(true);
    setArenasError(null);

    try {
      const response = await fetch("/api/arenas?public=true");
      if (!response.ok) {
        throw new Error("Failed to fetch arenas");
      }
      const data = await response.json();
      setArenas(data.arenas || []);
    } catch (err) {
      setArenasError(err instanceof Error ? err.message : "Failed to load arenas");
    } finally {
      setArenasLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCompetitions();
    fetchArenas();
  }, []);

  // Filter and sort competitions based on all criteria
  const filteredCompetitions = useMemo(() => {
    let result = competitions.filter((competition) => {
      const computedStatus = getCompetitionStatus(competition);
      
      // Text search
      const matchesSearch =
        competition.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        competition.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Status filter
      const matchesStatus = statusFilter === "all" || computedStatus === statusFilter;
      
      // Language filter - competition must support at least one of the selected languages
      const matchesLanguage = languageFilter.length === 0 || 
        (competition.allowed_languages && 
         languageFilter.some(lang => competition.allowed_languages.includes(lang)));
      
      // Visibility filter
      const matchesVisibility = visibilityFilter === "all" ||
        (visibilityFilter === "public" && competition.is_public) ||
        (visibilityFilter === "private" && !competition.is_public);
      
      return matchesSearch && matchesStatus && matchesLanguage && matchesVisibility;
    });
    
    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortConfig.field) {
        case "title":
          comparison = a.title.localeCompare(b.title);
          break;
        case "start_date":
          comparison = new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
          break;
        case "created_at":
        default:
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      return sortConfig.direction === "asc" ? comparison : -comparison;
    });
    
    return result;
  }, [competitions, searchQuery, statusFilter, languageFilter, visibilityFilter, sortConfig]);

  // Filter arenas based on search
  const filteredArenas = useMemo(() => {
    return arenas.filter((arena) => {
      const matchesSearch =
        arena.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        arena.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [arenas, searchQuery]);

  // Count competitions by status
  const statusCounts = useMemo(() => {
    return competitions.reduce(
      (acc, comp) => {
        const status = getCompetitionStatus(comp);
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      { active: 0, upcoming: 0, ended: 0 } as Record<string, number>
    );
  }, [competitions]);

  // Helper to check if any advanced filters are active
  const hasActiveFilters = languageFilter.length > 0 || visibilityFilter !== "all";

  // Clear all filters
  const clearAllFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setLanguageFilter([]);
    setVisibilityFilter("all");
    setSortConfig({ field: "created_at", direction: "desc" });
  };

  // Toggle language in filter
  const toggleLanguageFilter = (lang: string) => {
    setLanguageFilter(prev => 
      prev.includes(lang) 
        ? prev.filter(l => l !== lang)
        : [...prev, lang]
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Discover</h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Browse and join coding competitions and arenas
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("competitions")}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors ${
              activeTab === "competitions"
                ? "bg-blue-600 text-white"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            <Code2 className="h-5 w-5" />
            Competitions
            <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-white/20">
              {competitions.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("arenas")}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors ${
              activeTab === "arenas"
                ? "bg-purple-600 text-white"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            <Swords className="h-5 w-5" />
            Arenas
            <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-white/20">
              {arenas.length}
            </span>
          </button>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder={activeTab === "competitions" ? "Search competitions..." : "Search arenas..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 transition-colors"
              />
            </div>

            {/* Status Filter - Only for competitions */}
            {activeTab === "competitions" && (
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
            )}

            {/* Sort - Only for competitions */}
            {activeTab === "competitions" && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSortConfig(prev => ({ ...prev, direction: prev.direction === "asc" ? "desc" : "asc" }))}
                  className="p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  title={sortConfig.direction === "asc" ? "Ascending" : "Descending"}
                >
                  {sortConfig.direction === "asc" ? <SortAsc className="h-5 w-5" /> : <SortDesc className="h-5 w-5" />}
                </button>
                <select
                  value={sortConfig.field}
                  onChange={(e) => setSortConfig(prev => ({ ...prev, field: e.target.value as SortField }))}
                  className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 transition-colors"
                >
                  <option value="created_at">Sort by Date Created</option>
                  <option value="start_date">Sort by Start Date</option>
                  <option value="title">Sort by Name</option>
                </select>
              </div>
            )}

            {/* Advanced Filters Toggle - Only for competitions */}
            {activeTab === "competitions" && (
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg transition-colors ${
                  showAdvancedFilters || hasActiveFilters
                    ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                    : "border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                <ChevronDown className={`h-5 w-5 transition-transform ${showAdvancedFilters ? "rotate-180" : ""}`} />
                Filters
                {hasActiveFilters && (
                  <span className="px-1.5 py-0.5 text-xs bg-blue-600 text-white rounded-full">
                    {languageFilter.length + (visibilityFilter !== "all" ? 1 : 0)}
                  </span>
                )}
              </button>
            )}

            {/* Refresh Button */}
            <button
              onClick={() => {
                if (activeTab === "competitions") {
                  fetchCompetitions(true);
                } else {
                  fetchArenas(true);
                }
              }}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {/* Advanced Filters Panel */}
          {activeTab === "competitions" && showAdvancedFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Language Filter */}
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Code className="h-4 w-4 inline mr-1" />
                    Programming Languages
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {ALL_LANGUAGES.map((lang) => (
                      <button
                        key={lang.value}
                        onClick={() => toggleLanguageFilter(lang.value)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                          languageFilter.includes(lang.value)
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                        }`}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Visibility Filter */}
                <div className="lg:w-48">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Globe className="h-4 w-4 inline mr-1" />
                    Visibility
                  </label>
                  <select
                    value={visibilityFilter}
                    onChange={(e) => setVisibilityFilter(e.target.value as "all" | "public" | "private")}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 transition-colors"
                  >
                    <option value="all">All</option>
                    <option value="public">Public Only</option>
                    <option value="private">Private Only</option>
                  </select>
                </div>
              </div>

              {/* Active Filters Display & Clear */}
              {hasActiveFilters && (
                <div className="mt-4 flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Active filters:</span>
                  {languageFilter.map((lang) => (
                    <span
                      key={lang}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-full text-sm"
                    >
                      {ALL_LANGUAGES.find(l => l.value === lang)?.label || lang}
                      <button
                        onClick={() => toggleLanguageFilter(lang)}
                        className="hover:text-blue-900 dark:hover:text-blue-100"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  {visibilityFilter !== "all" && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded-full text-sm">
                      {visibilityFilter === "public" ? "Public" : "Private"}
                      <button
                        onClick={() => setVisibilityFilter("all")}
                        className="hover:text-green-900 dark:hover:text-green-100"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  <button
                    onClick={clearAllFilters}
                    className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 ml-2"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Results Summary */}
        {activeTab === "competitions" && !loading && (
          <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            Showing {filteredCompetitions.length} of {competitions.length} competitions
            {hasActiveFilters && " (filtered)"}
          </div>
        )}

        {/* Competitions Tab Content */}
        {activeTab === "competitions" && (
          <>
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
                          <div className="flex items-center gap-2 ml-2">
                            {!competition.is_public && (
                              <span title="Private">
                                <Lock className="h-4 w-4 text-yellow-500" />
                              </span>
                            )}
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${getStatusColor(
                                status
                              )}`}
                            >
                              {status}
                            </span>
                          </div>
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
                    <Search className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">
                      No competitions match your filters
                    </p>
                    <p className="text-gray-400 dark:text-gray-500 text-sm mb-4">
                      Try adjusting your search or filter criteria
                    </p>
                    <button
                      onClick={clearAllFilters}
                      className="inline-block px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-semibold transition-colors"
                    >
                      Clear All Filters
                    </button>
                  </>
                )}
              </div>
            )}
          </>
        )}

        {/* Arenas Tab Content */}
        {activeTab === "arenas" && (
          <>
            {/* Loading State */}
            {arenasLoading && (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">Loading arenas...</p>
                </div>
              </div>
            )}

            {/* Error State */}
            {arenasError && !arenasLoading && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 mb-6">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                  <div>
                    <h3 className="font-semibold text-red-800 dark:text-red-200">Error loading arenas</h3>
                    <p className="text-red-600 dark:text-red-400">{arenasError}</p>
                  </div>
                </div>
                <button
                  onClick={() => fetchArenas()}
                  className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Arenas Grid */}
            {!arenasLoading && !arenasError && (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredArenas.map((arena) => (
                  <Link
                    key={arena.id}
                    href={`/arenas/${arena.id}`}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all hover:border-purple-500 border border-transparent"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <h2 className="text-xl font-bold line-clamp-2">{arena.title}</h2>
                        <div className="flex items-center gap-2 ml-2">
                          {!arena.is_public && (
                            <span title="Private">
                              <Lock className="h-4 w-4 text-yellow-500" />
                            </span>
                          )}
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${getStatusColor(
                              arena.status
                            )}`}
                          >
                            {arena.status}
                          </span>
                        </div>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
                        {arena.description || "No description provided."}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                        <div className="flex items-center gap-1">
                          <Globe className="h-4 w-4" />
                          <span className="truncate max-w-[120px]">{arena.github_repo}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>
                            {arena.arena_participants?.[0]?.count || 0}
                            {arena.max_participants && `/${arena.max_participants}`}
                          </span>
                        </div>
                      </div>
                      {arena.end_date && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-200 dark:border-gray-700">
                          Ends: {new Date(arena.end_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!arenasLoading && !arenasError && filteredArenas.length === 0 && (
              <div className="text-center py-16">
                {arenas.length === 0 ? (
                  <>
                    <Swords className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 text-lg mb-4">
                      No public arenas available yet
                    </p>
                    {session ? (
                      <Link
                        href="/arenas/create"
                        className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold"
                      >
                        Create the First Arena
                      </Link>
                    ) : (
                      <Link
                        href="/login?redirect=/arenas/create"
                        className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold"
                      >
                        Sign In to Create Arena
                      </Link>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-gray-500 dark:text-gray-400 text-lg mb-4">
                      No arenas match your search
                    </p>
                    <button
                      onClick={() => setSearchQuery("")}
                      className="inline-block px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-semibold transition-colors"
                    >
                      Clear Search
                    </button>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
