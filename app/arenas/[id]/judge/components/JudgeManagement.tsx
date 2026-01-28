"use client";

import { useState } from "react";
import { UserPlus, X, Shield, Mail, Search, AlertCircle } from "lucide-react";

interface Judge {
  id: string;
  user_id: string;
  email?: string;
  name?: string;
  assigned_at: string;
  scores_given?: number;
}

interface JudgeManagementProps {
  judges: Judge[];
  isCreator: boolean;
  arenaId: string;
  onJudgeAdded: () => void;
  onJudgeRemoved: () => void;
}

export function JudgeManagement({ 
  judges, 
  isCreator, 
  arenaId, 
  onJudgeAdded,
  onJudgeRemoved 
}: JudgeManagementProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Array<{ id: string; email: string; name: string }>>([]);
  const [searching, setSearching] = useState(false);

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      // In a real app, this would search the users table
      // For now, we'll just use the input as user ID
      setSearchResults([]);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setSearching(false);
    }
  };

  const addJudge = async (userId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/arenas/${arenaId}/judge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_judge",
          userId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add judge");
      }

      setSearchInput("");
      setShowAddForm(false);
      onJudgeAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const removeJudge = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this judge?")) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/arenas/${arenaId}/judge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "remove_judge",
          userId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to remove judge");
      }

      onJudgeRemoved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-purple-400" />
          <h2 className="text-lg font-semibold">Judges</h2>
          <span className="text-sm text-gray-400">({judges.length})</span>
        </div>
        {isCreator && !showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300"
          >
            <UserPlus className="h-4 w-4" />
            Add Judge
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm mb-4 bg-red-900/20 p-3 rounded-lg">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Add Judge Form */}
      {showAddForm && isCreator && (
        <div className="bg-gray-700 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">Add New Judge</h3>
            <button
              onClick={() => {
                setShowAddForm(false);
                setSearchInput("");
                setError(null);
              }}
              className="text-gray-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  searchUsers(e.target.value);
                }}
                placeholder="Enter user ID or email..."
                className="w-full pl-10 pr-4 py-2 bg-gray-600 border border-gray-500 rounded-lg focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => addJudge(user.id)}
                    disabled={loading}
                    className="w-full flex items-center gap-3 p-3 bg-gray-600 hover:bg-gray-500 rounded-lg text-left transition-colors"
                  >
                    <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-sm font-medium">
                      {user.name?.[0] || user.email[0]}
                    </div>
                    <div>
                      <p className="font-medium">{user.name || "User"}</p>
                      <p className="text-sm text-gray-400">{user.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Direct Add Button */}
            <button
              onClick={() => addJudge(searchInput.trim())}
              disabled={loading || !searchInput.trim()}
              className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition-colors"
            >
              <UserPlus className="h-4 w-4" />
              {loading ? "Adding..." : "Add as Judge"}
            </button>

            <p className="text-xs text-gray-400">
              Enter the user ID or email address of the person you want to add as a judge.
            </p>
          </div>
        </div>
      )}

      {/* Judges List */}
      {judges.length === 0 ? (
        <p className="text-gray-500 text-center py-4">
          No judges assigned yet. {isCreator && "Add judges to start the evaluation process."}
        </p>
      ) : (
        <div className="space-y-2">
          {judges.map((judge) => (
            <div
              key={judge.id}
              className="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-600/30 rounded-full flex items-center justify-center">
                  <Shield className="h-4 w-4 text-purple-400" />
                </div>
                <div>
                  <p className="font-medium text-sm">
                    {judge.name || judge.email || judge.user_id}
                  </p>
                  <p className="text-xs text-gray-400">
                    Added {new Date(judge.assigned_at).toLocaleDateString()}
                    {judge.scores_given !== undefined && (
                      <span className="ml-2">• {judge.scores_given} scores given</span>
                    )}
                  </p>
                </div>
              </div>
              {isCreator && (
                <button
                  onClick={() => removeJudge(judge.user_id)}
                  disabled={loading}
                  className="text-gray-400 hover:text-red-400 transition-colors p-1"
                  title="Remove judge"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
