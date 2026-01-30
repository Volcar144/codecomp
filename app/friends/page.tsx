"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";

interface Friend {
  id: string;
  friendId: string;
  name: string;
  email?: string;
  image?: string;
  isOnline: boolean;
  lastSeen: string | null;
  currentActivity?: string;
  friendsSince: string;
}

interface FriendRequest {
  id: string;
  userId: string;
  name: string;
  email?: string;
  image?: string;
  skillRating: number;
  skillTier: string;
  sentAt: string;
}

export default function FriendsPage() {
  const { data: session, isPending } = useSession();
  const [activeTab, setActiveTab] = useState<"friends" | "requests" | "find">("friends");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.id) {
      fetchFriends();
      fetchRequests();
    } else {
      setIsLoading(false);
    }
  }, [session?.user?.id]);

  async function fetchFriends() {
    try {
      const res = await fetch("/api/friends");
      const data = await res.json();
      if (data.friends) {
        setFriends(data.friends);
      }
    } catch (err) {
      console.error("Error fetching friends:", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchRequests() {
    try {
      const [receivedRes, sentRes] = await Promise.all([
        fetch("/api/friends/requests?type=received"),
        fetch("/api/friends/requests?type=sent"),
      ]);
      const receivedData = await receivedRes.json();
      const sentData = await sentRes.json();
      setRequests(receivedData.requests || []);
      setSentRequests(sentData.requests || []);
    } catch (err) {
      console.error("Error fetching requests:", err);
    }
  }

  async function handleAcceptRequest(requestId: string) {
    try {
      const res = await fetch("/api/friends/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action: "accept" }),
      });
      if (res.ok) {
        setSuccessMessage("Friend request accepted!");
        fetchFriends();
        fetchRequests();
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      setError("Failed to accept request");
    }
  }

  async function handleDeclineRequest(requestId: string) {
    try {
      const res = await fetch("/api/friends/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action: "decline" }),
      });
      if (res.ok) {
        fetchRequests();
      }
    } catch (err) {
      setError("Failed to decline request");
    }
  }

  async function handleRemoveFriend(friendId: string) {
    if (!confirm("Are you sure you want to remove this friend?")) return;
    try {
      const res = await fetch(`/api/friends?friendId=${friendId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setFriends(friends.filter((f) => f.friendId !== friendId));
        setSuccessMessage("Friend removed");
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      setError("Failed to remove friend");
    }
  }

  async function handleSendRequest(userId: string) {
    try {
      const res = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendId: userId }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMessage("Friend request sent!");
        setSearchResults(searchResults.filter((r) => r.id !== userId));
        fetchRequests();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(data.error || "Failed to send request");
        setTimeout(() => setError(null), 3000);
      }
    } catch (err) {
      setError("Failed to send request");
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(data.users || []);
    } catch (err) {
      setError("Search failed");
    }
  }

  function getActivityIcon(activity?: string) {
    switch (activity) {
      case "in_duel":
        return "⚔️";
      case "in_competition":
        return "🏆";
      case "in_tutorial":
        return "📚";
      default:
        return "💻";
    }
  }

  function getTierColor(tier: string) {
    const colors: Record<string, string> = {
      Bronze: "text-orange-600",
      Silver: "text-gray-400",
      Gold: "text-yellow-500",
      Platinum: "text-cyan-400",
      Diamond: "text-blue-400",
      Master: "text-purple-500",
      Grandmaster: "text-red-500",
    };
    return colors[tier] || "text-gray-500";
  }

  if (isPending || isLoading) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Friends</h1>
          <p className="text-gray-400 mb-8">Sign in to connect with other coders</p>
          <Link
            href="/login"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
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

      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-8">Friends</h1>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="bg-green-900/50 border border-green-500 text-green-300 px-4 py-3 rounded-lg mb-6">
            {successMessage}
          </div>
        )}
        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-gray-700">
          <button
            onClick={() => setActiveTab("friends")}
            className={`pb-4 px-2 font-medium transition-colors ${
              activeTab === "friends"
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Friends ({friends.length})
          </button>
          <button
            onClick={() => setActiveTab("requests")}
            className={`pb-4 px-2 font-medium transition-colors relative ${
              activeTab === "requests"
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Requests
            {requests.length > 0 && (
              <span className="absolute -top-1 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {requests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("find")}
            className={`pb-4 px-2 font-medium transition-colors ${
              activeTab === "find"
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Find Friends
          </button>
        </div>

        {/* Friends List */}
        {activeTab === "friends" && (
          <div className="space-y-4">
            {friends.length === 0 ? (
              <div className="text-center py-12 bg-gray-800/50 rounded-xl">
                <p className="text-gray-400 text-lg mb-4">No friends yet</p>
                <button
                  onClick={() => setActiveTab("find")}
                  className="text-blue-400 hover:text-blue-300"
                >
                  Find friends to add →
                </button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {friends.map((friend) => (
                  <div
                    key={friend.id}
                    className="bg-gray-800/50 rounded-xl p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                          {friend.image ? (
                            <img
                              src={friend.image}
                              alt={friend.name}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            friend.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        {/* Online indicator */}
                        <div
                          className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-gray-800 ${
                            friend.isOnline ? "bg-green-500" : "bg-gray-500"
                          }`}
                        ></div>
                      </div>
                      <div>
                        <h3 className="text-white font-medium flex items-center gap-2">
                          {friend.name}
                          {friend.isOnline && friend.currentActivity && (
                            <span className="text-sm text-gray-400">
                              {getActivityIcon(friend.currentActivity)}
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-gray-400">
                          {friend.isOnline ? (
                            <span className="text-green-400">Online</span>
                          ) : friend.lastSeen ? (
                            `Last seen ${new Date(friend.lastSeen).toLocaleDateString()}`
                          ) : (
                            "Offline"
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/profile/${friend.friendId}`}
                        className="p-2 text-gray-400 hover:text-white transition-colors"
                        title="View Profile"
                      >
                        👤
                      </Link>
                      <button
                        onClick={() => handleRemoveFriend(friend.friendId)}
                        className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                        title="Remove Friend"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Requests */}
        {activeTab === "requests" && (
          <div className="space-y-8">
            {/* Received Requests */}
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">
                Received Requests ({requests.length})
              </h2>
              {requests.length === 0 ? (
                <p className="text-gray-400">No pending friend requests</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {requests.map((request) => (
                    <div
                      key={request.id}
                      className="bg-gray-800/50 rounded-xl p-4"
                    >
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                          {request.image ? (
                            <img
                              src={request.image}
                              alt={request.name}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            request.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <h3 className="text-white font-medium">{request.name}</h3>
                          <p className={`text-sm ${getTierColor(request.skillTier)}`}>
                            {request.skillTier} • {request.skillRating} SR
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAcceptRequest(request.id)}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleDeclineRequest(request.id)}
                          className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sent Requests */}
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">
                Sent Requests ({sentRequests.length})
              </h2>
              {sentRequests.length === 0 ? (
                <p className="text-gray-400">No pending sent requests</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {sentRequests.map((request) => (
                    <div
                      key={request.id}
                      className="bg-gray-800/50 rounded-xl p-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                          {request.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="text-white font-medium">{request.name}</h3>
                          <p className="text-sm text-gray-400">Pending</p>
                        </div>
                      </div>
                      <span className="text-yellow-400">⏳</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Find Friends */}
        {activeTab === "find" && (
          <div>
            <form onSubmit={handleSearch} className="mb-8">
              <div className="flex gap-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by username or email..."
                  className="flex-1 bg-gray-800 border border-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Search
                </button>
              </div>
            </form>

            {searchResults.length > 0 && (
              <div className="grid gap-4 md:grid-cols-2">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="bg-gray-800/50 rounded-xl p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {user.image ? (
                          <img
                            src={user.image}
                            alt={user.name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          user.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <h3 className="text-white font-medium">{user.name}</h3>
                        {user.skillTier && (
                          <p className={`text-sm ${getTierColor(user.skillTier)}`}>
                            {user.skillTier}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleSendRequest(user.id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      Add Friend
                    </button>
                  </div>
                ))}
              </div>
            )}

            {searchQuery && searchResults.length === 0 && (
              <p className="text-center text-gray-400 py-8">
                No users found matching "{searchQuery}"
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
