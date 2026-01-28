"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { Loading } from "@/components/ui/Loading";
import { Code2, Plus, Trash2, Save, Eye, EyeOff } from "lucide-react";
import posthog from "posthog-js";

interface TestCase {
  input: string;
  expected_output: string;
  points: number;
  is_hidden: boolean;
}

const AVAILABLE_LANGUAGES = [
  { id: "python", name: "Python" },
  { id: "javascript", name: "JavaScript" },
  { id: "java", name: "Java" },
  { id: "cpp", name: "C++" },
  { id: "csharp", name: "C#" },
  { id: "go", name: "Go" },
  { id: "rust", name: "Rust" },
];

export default function CreateTemplatePage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [templateTitle, setTemplateTitle] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateRules, setTemplateRules] = useState("");
  const [allowedLanguages, setAllowedLanguages] = useState<string[]>(["python", "javascript"]);
  const [defaultDurationHours, setDefaultDurationHours] = useState(24);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLanguageToggle = (langId: string) => {
    if (allowedLanguages.includes(langId)) {
      setAllowedLanguages(allowedLanguages.filter(l => l !== langId));
    } else {
      setAllowedLanguages([...allowedLanguages, langId]);
    }
  };

  const addTestCase = () => {
    setTestCases([
      ...testCases,
      { input: "", expected_output: "", points: 10, is_hidden: false },
    ]);
  };

  const removeTestCase = (index: number) => {
    setTestCases(testCases.filter((_, i) => i !== index));
  };

  const updateTestCase = (index: number, field: keyof TestCase, value: string | number | boolean) => {
    const updated = [...testCases];
    updated[index] = { ...updated[index], [field]: value };
    setTestCases(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const response = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || null,
          is_public: isPublic,
          template_title: templateTitle || null,
          template_description: templateDescription || null,
          template_rules: templateRules || null,
          allowed_languages: allowedLanguages,
          default_duration_hours: defaultDurationHours,
          test_cases: testCases,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create template");
      }

      // Capture template creation event
      posthog.capture("template_created", {
        is_public: isPublic,
        languages_count: allowedLanguages.length,
        test_cases_count: testCases.length,
        default_duration_hours: defaultDurationHours,
      });

      router.push("/templates");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      posthog.captureException(err);
    } finally {
      setSaving(false);
    }
  };

  if (isPending) {
    return <Loading />;
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please sign in to create templates</h1>
          <Link href="/login" className="bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded-lg">
            Sign In
          </Link>
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
            href="/templates"
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
          >
            ← Back to Templates
          </Link>
        </nav>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Create Competition Template</h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Template Info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Template Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Template Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Algorithmic Challenge Template"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe what this template is for"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="isPublic" className="text-sm">
                  Make this template public (others can use it)
                </label>
              </div>
            </div>
          </div>

          {/* Competition Defaults */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Competition Defaults</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Default Title</label>
                <input
                  type="text"
                  value={templateTitle}
                  onChange={(e) => setTemplateTitle(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                  placeholder="Default competition title"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Default Description</label>
                <textarea
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                  placeholder="Default competition description"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Default Rules</label>
                <textarea
                  value={templateRules}
                  onChange={(e) => setTemplateRules(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                  placeholder="Default competition rules"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Default Duration (hours)</label>
                <input
                  type="number"
                  value={defaultDurationHours}
                  onChange={(e) => setDefaultDurationHours(parseInt(e.target.value) || 24)}
                  min={1}
                  className="w-32 px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Languages */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Allowed Languages</h2>
            
            <div className="flex flex-wrap gap-3">
              {AVAILABLE_LANGUAGES.map((lang) => (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => handleLanguageToggle(lang.id)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    allowedLanguages.includes(lang.id)
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {lang.name}
                </button>
              ))}
            </div>
            
            {allowedLanguages.length === 0 && (
              <p className="text-red-500 text-sm mt-2">Select at least one language</p>
            )}
          </div>

          {/* Test Cases */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Test Cases</h2>
              <button
                type="button"
                onClick={addTestCase}
                className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
              >
                <Plus className="h-4 w-4" />
                Add Test Case
              </button>
            </div>
            
            {testCases.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No test cases yet. Add some to include them in the template.
              </p>
            ) : (
              <div className="space-y-4">
                {testCases.map((tc, index) => (
                  <div
                    key={index}
                    className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium">Test Case {index + 1}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateTestCase(index, "is_hidden", !tc.is_hidden)}
                          className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                            tc.is_hidden
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {tc.is_hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          {tc.is_hidden ? "Hidden" : "Visible"}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeTestCase(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Input</label>
                        <textarea
                          value={tc.input}
                          onChange={(e) => updateTestCase(index, "input", e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border rounded-lg dark:bg-gray-600 dark:border-gray-500 text-sm font-mono"
                          placeholder="Test input"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Expected Output</label>
                        <textarea
                          value={tc.expected_output}
                          onChange={(e) => updateTestCase(index, "expected_output", e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border rounded-lg dark:bg-gray-600 dark:border-gray-500 text-sm font-mono"
                          placeholder="Expected output"
                        />
                      </div>
                    </div>
                    
                    <div className="mt-3">
                      <label className="block text-sm font-medium mb-1">Points</label>
                      <input
                        type="number"
                        value={tc.points}
                        onChange={(e) => updateTestCase(index, "points", parseInt(e.target.value) || 0)}
                        min={0}
                        className="w-24 px-3 py-1 border rounded-lg dark:bg-gray-600 dark:border-gray-500 text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <Link
              href="/templates"
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving || !name || allowedLanguages.length === 0}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Template"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
