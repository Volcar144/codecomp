"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import { Loading } from "@/components/ui/Loading";

const LANGUAGES = [
  { value: "python", label: "Python" },
  { value: "javascript", label: "JavaScript" },
  { value: "java", label: "Java" },
  { value: "cpp", label: "C++" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "csharp", label: "C#" },
];

const THEMES = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
  { value: "system", label: "System" },
];

interface ProfileData {
  bio: string;
  location: string;
  website: string;
  github_username: string;
  twitter_username: string;
  linkedin_url: string;
  preferred_language: string;
  theme: string;
  email_public: boolean;
  show_activity: boolean;
}

export default function EditProfilePage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [gravatarUrl, setGravatarUrl] = useState<string>("");

  const [formData, setFormData] = useState<ProfileData>({
    bio: "",
    location: "",
    website: "",
    github_username: "",
    twitter_username: "",
    linkedin_url: "",
    preferred_language: "python",
    theme: "dark",
    email_public: false,
    show_activity: true,
  });

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login?redirect=/profile/edit");
      return;
    }

    if (session?.user) {
      fetchProfile();
    }
  }, [isPending, session, router]);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/profile");
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      setGravatarUrl(data.gravatarUrl || "");

      if (data.profile) {
        setFormData({
          bio: data.profile.bio || "",
          location: data.profile.location || "",
          website: data.profile.website || "",
          github_username: data.profile.github_username || "",
          twitter_username: data.profile.twitter_username || "",
          linkedin_url: data.profile.linkedin_url || "",
          preferred_language: data.profile.preferred_language || "python",
          theme: data.profile.theme || "dark",
          email_public: data.profile.email_public ?? false,
          show_activity: data.profile.show_activity ?? true,
        });
      }
    } catch (err) {
      setError("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      setError("Failed to save profile");
    } finally {
      setSaving(false);
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

  if (isPending || loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link
            href="/profile"
            className="text-gray-400 hover:text-white text-sm"
          >
            ← Back to Profile
          </Link>
        </div>

        <div className="bg-gray-800 rounded-xl shadow-lg p-6">
          <h1 className="text-2xl font-bold text-white mb-6">Edit Profile</h1>

          {/* Avatar Section */}
          <div className="mb-8 p-4 bg-gray-900 rounded-lg">
            <h2 className="text-white font-medium mb-3">Profile Picture</h2>
            <div className="flex items-center gap-4">
              <img
                src={gravatarUrl || `https://www.gravatar.com/avatar/?d=identicon&s=80`}
                alt="Avatar"
                className="w-20 h-20 rounded-full"
              />
              <div>
                <p className="text-gray-400 text-sm mb-2">
                  Your profile picture is managed through Gravatar
                </p>
                <a
                  href="https://gravatar.com/profile"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm"
                >
                  Change on Gravatar →
                </a>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-600 rounded text-red-200">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-900/50 border border-green-600 rounded text-green-200">
              Profile saved successfully!
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Bio
              </label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                rows={3}
                maxLength={500}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
                placeholder="Tell us about yourself..."
              />
              <div className="text-xs text-gray-500 mt-1">
                {formData.bio.length}/500 characters
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Location
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                maxLength={100}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
                placeholder="San Francisco, CA"
              />
            </div>

            {/* Website */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Website
              </label>
              <input
                type="url"
                name="website"
                value={formData.website}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
                placeholder="https://yoursite.com"
              />
            </div>

            {/* Social Links */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  GitHub Username
                </label>
                <div className="flex">
                  <span className="px-3 py-2 bg-gray-700 border border-r-0 border-gray-600 rounded-l-lg text-gray-400">
                    @
                  </span>
                  <input
                    type="text"
                    name="github_username"
                    value={formData.github_username}
                    onChange={handleChange}
                    maxLength={39}
                    className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-r-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
                    placeholder="username"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Twitter/X Username
                </label>
                <div className="flex">
                  <span className="px-3 py-2 bg-gray-700 border border-r-0 border-gray-600 rounded-l-lg text-gray-400">
                    @
                  </span>
                  <input
                    type="text"
                    name="twitter_username"
                    value={formData.twitter_username}
                    onChange={handleChange}
                    maxLength={15}
                    className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-r-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
                    placeholder="username"
                  />
                </div>
              </div>
            </div>

            {/* LinkedIn */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                LinkedIn URL
              </label>
              <input
                type="url"
                name="linkedin_url"
                value={formData.linkedin_url}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
                placeholder="https://linkedin.com/in/username"
              />
            </div>

            {/* Preferences */}
            <div className="border-t border-gray-700 pt-6">
              <h2 className="text-lg font-medium text-white mb-4">Preferences</h2>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Preferred Language
                  </label>
                  <select
                    name="preferred_language"
                    value={formData.preferred_language}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-green-500 focus:outline-none"
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang.value} value={lang.value}>
                        {lang.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Theme
                  </label>
                  <select
                    name="theme"
                    value={formData.theme}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-green-500 focus:outline-none"
                  >
                    {THEMES.map((theme) => (
                      <option key={theme.value} value={theme.value}>
                        {theme.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Privacy */}
            <div className="border-t border-gray-700 pt-6">
              <h2 className="text-lg font-medium text-white mb-4">Privacy</h2>

              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    name="email_public"
                    checked={formData.email_public}
                    onChange={handleChange}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-900 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-gray-300">
                    Show email on public profile
                  </span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    name="show_activity"
                    checked={formData.show_activity}
                    onChange={handleChange}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-900 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-gray-300">
                    Show activity on public profile
                  </span>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-700">
              <Link
                href="/profile"
                className="px-4 py-2 text-gray-400 hover:text-white"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg text-white font-medium"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
