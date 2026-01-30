"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Code2, FileText, Loader2, Crown, Lock } from "lucide-react";
import { useSession, subscription } from "@/lib/auth-client";

interface Template {
  id: string;
  name: string;
  template_title: string | null;
  template_description: string | null;
  template_rules: string | null;
  allowed_languages: string[];
  default_duration_hours: number;
  test_cases: Array<{
    input: string;
    expected_output: string;
    points: number;
    is_hidden: boolean;
  }>;
}

interface SubscriptionData {
  plan: string;
  status: string;
}

const LANGUAGES = [
  { value: "python", label: "Python" },
  { value: "javascript", label: "JavaScript" },
  { value: "java", label: "Java" },
  { value: "cpp", label: "C++" },
  { value: "csharp", label: "C#" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
];

const SKILL_TIERS = [
  { value: "", label: "No restriction" },
  { value: "bronze", label: "🥉 Bronze (0-1399)" },
  { value: "silver", label: "🥈 Silver (1400-1599)" },
  { value: "gold", label: "🥇 Gold (1600-1799)" },
  { value: "platinum", label: "⭐ Platinum (1800-1999)" },
  { value: "diamond", label: "💠 Diamond (2000-2199)" },
  { value: "master", label: "💎 Master (2200-2399)" },
  { value: "grandmaster", label: "🏆 Grandmaster (2400+)" },
];

export default function CreateCompetitionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    }>
      <CreateCompetitionContent />
    </Suspense>
  );
}

function CreateCompetitionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get("template");
  const { data: session } = useSession();
  
  const [loading, setLoading] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(!!templateId);
  const [error, setError] = useState("");
  const [templateName, setTemplateName] = useState<string | null>(null);
  const [templateTestCases, setTemplateTestCases] = useState<Template["test_cases"]>([]);
  const [userPlan, setUserPlan] = useState<string>("free");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    rules: "",
    start_date: "",
    end_date: "",
    allowed_languages: ["python", "javascript"],
    is_public: true,
    min_skill_rating: "",
    recommended_skill_tier: "",
  });

  // Check user's subscription plan
  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const { data } = await subscription.list();
        if (data && data.length > 0) {
          const active = data.find(
            (sub: SubscriptionData) => sub.status === 'active' || sub.status === 'trialing'
          );
          if (active) {
            setUserPlan(active.plan);
          }
        }
      } catch {
        // Default to free if can't check
      }
    };
    
    if (session?.user) {
      checkSubscription();
    }
  }, [session]);

  const isPaidPlan = userPlan === 'pro' || userPlan === 'family' || userPlan === 'team';

  // Load template if templateId is provided
  useEffect(() => {
    if (templateId) {
      loadTemplate(templateId);
    }
  }, [templateId]);

  const loadTemplate = async (id: string) => {
    try {
      setLoadingTemplate(true);
      const response = await fetch(`/api/templates/${id}`);
      
      if (!response.ok) {
        throw new Error("Failed to load template");
      }
      
      const template: Template = await response.json();
      
      // Calculate default dates based on template duration
      const startDate = new Date();
      startDate.setHours(startDate.getHours() + 1); // Start in 1 hour
      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + template.default_duration_hours);
      
      setFormData({
        title: template.template_title || "",
        description: template.template_description || "",
        rules: template.template_rules || "",
        start_date: startDate.toISOString().slice(0, 16),
        end_date: endDate.toISOString().slice(0, 16),
        allowed_languages: template.allowed_languages || ["python", "javascript"],
        is_public: true,
        min_skill_rating: "",
        recommended_skill_tier: "",
      });
      
      setTemplateName(template.name);
      setTemplateTestCases(template.test_cases || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load template");
    } finally {
      setLoadingTemplate(false);
    }
  };

  const handleLanguageToggle = (language: string) => {
    setFormData((prev) => ({
      ...prev,
      allowed_languages: prev.allowed_languages.includes(language)
        ? prev.allowed_languages.filter((l) => l !== language)
        : [...prev.allowed_languages, language],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Create the competition
      const response = await fetch("/api/competitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create competition");
      }

      const data = await response.json();
      
      // If we used a template with test cases, create them
      if (templateTestCases.length > 0) {
        for (const testCase of templateTestCases) {
          await fetch(`/api/competitions/${data.id}/test-cases`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(testCase),
          });
        }
      }
      
      // Increment template use count if used
      if (templateId) {
        fetch(`/api/templates/${templateId}/use`, { method: "POST" }).catch(() => {});
      }

      router.push(`/competitions/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create competition");
    } finally {
      setLoading(false);
    }
  };

  if (loadingTemplate) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading template...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <header className="border-b bg-white dark:bg-gray-900">
        <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Code2 className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold">CodeComp</span>
          </Link>
          <Link
            href="/competitions"
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
          >
            Back to Competitions
          </Link>
        </nav>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-4xl font-bold mb-8">Create Competition</h1>

        {/* Template Banner */}
        {templateName && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6 flex items-center gap-3">
            <FileText className="h-5 w-5 text-blue-600" />
            <div>
              <p className="font-medium text-blue-800 dark:text-blue-200">Using template: {templateName}</p>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                {templateTestCases.length > 0 && `${templateTestCases.length} test cases will be created`}
              </p>
            </div>
          </div>
        )}

        {/* Use Template Link */}
        {!templateName && (
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Want to save time? {" "}
              <Link href="/templates" className="text-blue-600 hover:underline font-medium">
                Browse templates →
              </Link>
            </p>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="title" className="block text-sm font-medium mb-2">
                Competition Title
              </label>
              <input
                id="title"
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                placeholder="Algorithm Challenge 2024"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-2">
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                placeholder="Describe your competition..."
              />
            </div>

            <div>
              <label htmlFor="rules" className="block text-sm font-medium mb-2">
                Rules
              </label>
              <textarea
                id="rules"
                value={formData.rules}
                onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                placeholder="Competition rules and guidelines..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="start_date" className="block text-sm font-medium mb-2">
                  Start Date
                </label>
                <input
                  id="start_date"
                  type="datetime-local"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                />
              </div>
              <div>
                <label htmlFor="end_date" className="block text-sm font-medium mb-2">
                  End Date
                </label>
                <input
                  id="end_date"
                  type="datetime-local"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Allowed Languages</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {LANGUAGES.map((lang) => (
                  <label
                    key={lang.value}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formData.allowed_languages.includes(lang.value)}
                      onChange={() => handleLanguageToggle(lang.value)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span>{lang.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Skill Gating Section */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                ⚔️ Skill Requirements
                <span className="text-xs font-normal text-gray-500">(Optional)</span>
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="min_skill_rating" className="block text-sm font-medium mb-2">
                    Minimum Skill Rating
                  </label>
                  <input
                    id="min_skill_rating"
                    type="number"
                    min="0"
                    max="3000"
                    value={formData.min_skill_rating}
                    onChange={(e) => setFormData({ ...formData, min_skill_rating: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                    placeholder="e.g., 1600"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Leave empty for no minimum requirement
                  </p>
                </div>

                <div>
                  <label htmlFor="recommended_skill_tier" className="block text-sm font-medium mb-2">
                    Recommended Skill Tier
                  </label>
                  <select
                    id="recommended_skill_tier"
                    value={formData.recommended_skill_tier}
                    onChange={(e) => setFormData({ ...formData, recommended_skill_tier: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                  >
                    {SKILL_TIERS.map((tier) => (
                      <option key={tier.value} value={tier.value}>
                        {tier.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Shown as a recommendation, not enforced
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Visibility</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer p-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <input
                    type="radio"
                    name="visibility"
                    checked={formData.is_public}
                    onChange={() => setFormData({ ...formData, is_public: true })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div>
                    <span className="font-medium">Public</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Anyone can discover and join</p>
                  </div>
                </label>
                <label 
                  className={`flex items-center gap-2 p-3 border rounded-lg transition-colors relative ${
                    isPaidPlan 
                      ? "cursor-pointer border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700" 
                      : "cursor-not-allowed border-gray-200 dark:border-gray-700 opacity-60"
                  }`}
                  onClick={(e) => {
                    if (!isPaidPlan) {
                      e.preventDefault();
                      router.push('/pricing?feature=private-competitions');
                    }
                  }}
                >
                  <input
                    type="radio"
                    name="visibility"
                    checked={!formData.is_public}
                    onChange={() => isPaidPlan && setFormData({ ...formData, is_public: false })}
                    disabled={!isPaidPlan}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div>
                    <span className="font-medium flex items-center gap-1.5">
                      Private
                      {!isPaidPlan && <Lock className="w-3.5 h-3.5 text-gray-400" />}
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-[10px] font-bold rounded">
                        <Crown className="w-3 h-3" />
                        PRO
                      </span>
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {isPaidPlan ? "Invite-only with unique code" : "Upgrade to Pro to create private competitions"}
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              {loading ? "Creating..." : "Create Competition"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
