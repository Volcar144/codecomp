"use client";

import { useState, useEffect } from "react";

interface Invite {
  id: string;
  code: string;
  role: string;
  max_uses: number | null;
  uses: number;
  expires_at: string | null;
  created_at: string;
}

interface InviteManagerProps {
  type: "competition" | "arena";
  targetId: string;
  isOwner: boolean;
}

export default function InviteManager({ type, targetId, isOwner }: InviteManagerProps) {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Form state
  const [maxUses, setMaxUses] = useState<string>("");
  const [expiresInDays, setExpiresInDays] = useState<string>("7");
  const [role, setRole] = useState("participant");

  useEffect(() => {
    fetchInvites();
  }, [type, targetId]);

  const fetchInvites = async () => {
    try {
      const res = await fetch(`/api/invites?type=${type}&targetId=${targetId}`);
      const data = await res.json();
      setInvites(data.invites || []);
    } catch (error) {
      console.error("Error fetching invites:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          targetId,
          maxUses: maxUses ? parseInt(maxUses) : null,
          expiresInDays: expiresInDays ? parseInt(expiresInDays) : null,
          role,
        }),
      });

      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        setInvites([data, ...invites]);
        setShowForm(false);
        setMaxUses("");
        setExpiresInDays("7");
        setRole("participant");
      }
    } catch (error) {
      alert("Failed to create invite");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this invite?")) return;

    try {
      const res = await fetch(`/api/invites?type=${type}&id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setInvites(invites.filter((i) => i.id !== id));
      }
    } catch (error) {
      alert("Failed to delete invite");
    }
  };

  const copyToClipboard = (code: string) => {
    const url = `${window.location.origin}/invite/${code}`;
    navigator.clipboard.writeText(url);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  if (!isOwner) return null;

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-medium">Invite Links</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-sm text-green-400 hover:text-green-300"
        >
          {showForm ? "Cancel" : "+ Create Invite"}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="mb-4 p-3 bg-gray-900 rounded-lg space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Max Uses</label>
              <input
                type="number"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="Unlimited"
                min="1"
                className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Expires In (Days)
              </label>
              <input
                type="number"
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(e.target.value)}
                placeholder="Never"
                min="1"
                className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm"
            >
              <option value="participant">Participant</option>
              <option value="judge">Judge</option>
            </select>
          </div>

          <button
            onClick={handleCreate}
            disabled={creating}
            className="w-full py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded text-white text-sm"
          >
            {creating ? "Creating..." : "Create Invite Link"}
          </button>
        </div>
      )}

      {/* Invites list */}
      {loading ? (
        <div className="text-gray-500 text-sm">Loading...</div>
      ) : invites.length > 0 ? (
        <div className="space-y-2">
          {invites.map((invite) => (
            <div
              key={invite.id}
              className="flex items-center justify-between p-2 bg-gray-900 rounded"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <code className="text-green-400 text-sm font-mono">
                    {invite.code}
                  </code>
                  <span className="text-xs px-1.5 py-0.5 bg-gray-700 rounded text-gray-300">
                    {invite.role}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Uses: {invite.uses}
                  {invite.max_uses && `/${invite.max_uses}`}
                  {invite.expires_at && (
                    <>
                      {" "}
                      • Expires:{" "}
                      {new Date(invite.expires_at).toLocaleDateString()}
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyToClipboard(invite.code)}
                  className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded text-white"
                >
                  {copied === invite.code ? "Copied!" : "Copy"}
                </button>
                <button
                  onClick={() => handleDelete(invite.id)}
                  className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 rounded text-white"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-gray-500 text-sm">
          No invite links yet. Create one to share!
        </div>
      )}
    </div>
  );
}
