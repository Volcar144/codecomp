"use client";

import { useState, useCallback } from "react";

interface InviteCodeCardProps {
  inviteCode: string;
  entityId: string;
  entityType: "arena" | "competition";
  onCodeRegenerated?: (newCode: string) => void;
}

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

export function InviteCodeCard({
  inviteCode: initialCode,
  entityId,
  entityType,
  onCodeRegenerated,
}: InviteCodeCardProps) {
  const [inviteCode, setInviteCode] = useState(initialCode);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const basePath = entityType === "arena" ? "/arenas" : "/competitions";
  const apiPath = entityType === "arena" ? "/api/arenas" : "/api/competitions";

  const getInviteLink = useCallback(() => {
    if (!inviteCode) return "";
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    return `${baseUrl}${basePath}/${entityId}?invite=${inviteCode}`;
  }, [inviteCode, entityId, basePath]);

  const handleCopyCode = async () => {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
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
    } catch {
      setError("Failed to copy to clipboard");
    }
  };

  const handleRegenerateCode = async () => {
    if (!confirm("Are you sure you want to regenerate the invite code? The old code will no longer work.")) return;
    
    setRegenerating(true);
    setError(null);
    try {
      const response = await fetch(`${apiPath}/${entityId}`, {
        method: entityType === "arena" ? "PATCH" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerate_invite_code: true }),
      });

      if (!response.ok) {
        throw new Error("Failed to regenerate invite code");
      }

      const data = await response.json();
      const newCode = data.invite_code;
      setInviteCode(newCode);
      onCodeRegenerated?.(newCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setRegenerating(false);
    }
  };

  const handleShare = async () => {
    const link = getInviteLink();
    if (!link) return;

    const title = entityType === "arena" ? "Join this coding arena" : "Join this coding competition";

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: `Join my ${entityType}!`,
          url: link,
        });
      } catch {
        // User cancelled or share failed, fallback to copy
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="p-4 bg-gray-700 dark:bg-gray-700 rounded-lg border border-gray-600">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-300">Invite Code</h3>
        <button
          onClick={handleRegenerateCode}
          disabled={regenerating}
          className="text-xs text-gray-400 hover:text-white flex items-center gap-1 disabled:opacity-50 transition-colors"
          title="Regenerate invite code"
        >
          <RefreshIcon />
          {regenerating ? "Regenerating..." : "Regenerate"}
        </button>
      </div>
      
      {/* Error Display */}
      {error && (
        <div className="mb-3 p-2 bg-red-900/50 border border-red-600 rounded text-red-300 text-sm">
          {error}
        </div>
      )}
      
      {/* Invite Code */}
      <div className="flex items-center gap-2 mb-4">
        <code className="flex-1 text-lg font-mono text-purple-400 bg-gray-800 px-4 py-2 rounded-lg select-all">
          {inviteCode}
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
  );
}
