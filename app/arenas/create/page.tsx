"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { Loading } from "@/components/ui/Loading";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import posthog from "posthog-js";

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
}

export default function CreateArenaPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(true);
  const [githubConnected, setGithubConnected] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    github_repo: "",
    start_date: "",
    end_date: "",
    judging_criteria: "",
    max_participants: "",
    is_public: false,
  });

  useEffect(() => {
    if (!isPending && session) {
      fetchRepos();
    }
  }, [isPending, session]);

  const fetchRepos = async () => {
    try {
      const response = await fetch("/api/github/repos");
      const data = await response.json();

      if (response.ok) {
        setRepos(data.repos);
        setGithubConnected(true);
        // Capture GitHub connected event
        posthog.capture("github_connected", {
          repos_count: data.repos?.length || 0,
        });
      } else {
        setGithubConnected(false);
      }
    } catch {
      setGithubConnected(false);
    } finally {
      setLoadingRepos(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/arenas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          max_participants: formData.max_participants
            ? parseInt(formData.max_participants)
            : null,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create arena");
      }

      const { arena } = await response.json();
      router.push(`/arenas/${arena.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  if (isPending) {
    return <Loading />;
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please sign in to create an arena</h1>
          <a
            href="/login"
            className="bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded-lg"
          >
            Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Create Arena</h1>
          <p className="text-gray-400 mt-2">
            Set up a private app competition with GitHub-integrated code storage
          </p>
        </div>

        {!githubConnected && !loadingRepos && (
          <div className="bg-yellow-900/50 border border-yellow-600 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-yellow-400 mb-2">
              GitHub Connection Required
            </h3>
            <p className="text-yellow-200 text-sm mb-4">
              You need to connect your GitHub account to create arenas. This allows
              participants to store their code in a repository you choose.
            </p>
            <a
              href="/api/github/auth?redirect=/arenas/create"
              className="inline-block bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg text-white"
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                Connect GitHub
              </div>
            </a>
          </div>
        )}

        {error && <ErrorMessage message={error} />}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              Arena Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500"
              placeholder="My Awesome App Competition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500"
              placeholder="Describe what participants should build..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              GitHub Repository <span className="text-red-500">*</span>
            </label>
            {loadingRepos ? (
              <div className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-gray-500">
                Loading repositories...
              </div>
            ) : githubConnected && repos.length > 0 ? (
              <select
                name="github_repo"
                value={formData.github_repo}
                onChange={handleChange}
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500"
              >
                <option value="">Select a repository</option>
                {repos.map((repo) => (
                  <option key={repo.id} value={repo.full_name}>
                    {repo.full_name} {repo.private && "(Private)"}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                name="github_repo"
                value={formData.github_repo}
                onChange={handleChange}
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500"
                placeholder="owner/repository"
              />
            )}
            <p className="text-gray-500 text-sm mt-1">
              Participant code will be stored in this repository
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Start Date</label>
              <input
                type="datetime-local"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">End Date</label>
              <input
                type="datetime-local"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Judging Criteria</label>
            <textarea
              name="judging_criteria"
              value={formData.judging_criteria}
              onChange={handleChange}
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500"
              placeholder="How will submissions be judged? (e.g., creativity, functionality, code quality)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Max Participants (optional)
            </label>
            <input
              type="number"
              name="max_participants"
              value={formData.max_participants}
              onChange={handleChange}
              min="1"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500"
              placeholder="Leave empty for unlimited"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              name="is_public"
              id="is_public"
              checked={formData.is_public}
              onChange={handleChange}
              className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-purple-600 focus:ring-purple-500"
            />
            <label htmlFor="is_public" className="text-sm">
              Make this arena public (anyone can join without invite code)
            </label>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || (!githubConnected && !formData.github_repo)}
              className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold"
            >
              {loading ? "Creating..." : "Create Arena"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
