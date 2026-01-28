"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { Loading } from "@/components/ui/Loading";
import { Code2, Plus, Copy, Trash2, Globe, Lock, FileText, Clock } from "lucide-react";

interface Template {
  id: string;
  name: string;
  description: string | null;
  creator_id: string;
  is_public: boolean;
  template_title: string | null;
  allowed_languages: string[];
  default_duration_hours: number;
  test_cases: unknown[];
  use_count: number;
  created_at: string;
}

export default function TemplatesPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "mine" | "public">("all");

  useEffect(() => {
    fetchTemplates();
  }, [filter]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const params = filter === "public" ? "?public=true" : "";
      const response = await fetch(`/api/templates${params}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch templates");
      }
      
      let data = await response.json();
      
      // Filter client-side for "mine" filter
      if (filter === "mine" && session?.user?.id) {
        data = data.filter((t: Template) => t.creator_id === session.user.id);
      }
      
      setTemplates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;
    
    try {
      const response = await fetch(`/api/templates/${id}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete template");
      }
      
      setTemplates(templates.filter(t => t.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const handleUseTemplate = async (template: Template) => {
    // Navigate to create page with template data
    router.push(`/competitions/create?template=${template.id}`);
  };

  if (isPending || loading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <header className="border-b bg-white dark:bg-gray-900">
        <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Code2 className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold">CodeComp</span>
          </Link>
          <div className="flex gap-4">
            <Link
              href="/competitions"
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
            >
              Competitions
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
            >
              Dashboard
            </Link>
          </div>
        </nav>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Competition Templates</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Save and reuse competition configurations
            </p>
          </div>
          {session && (
            <Link
              href="/templates/create"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Create Template
            </Link>
          )}
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          {["all", "mine", "public"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as typeof filter)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === f
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              {f === "all" ? "All Templates" : f === "mine" ? "My Templates" : "Public Templates"}
            </button>
          ))}
        </div>

        {/* Templates Grid */}
        {templates.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 mb-4">No templates found</p>
            {session && (
              <Link
                href="/templates/create"
                className="text-blue-600 hover:underline"
              >
                Create your first template →
              </Link>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <div
                key={template.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold">{template.name}</h3>
                    {template.is_public ? (
                      <span className="flex items-center gap-1 text-xs text-green-600 bg-green-100 dark:bg-green-900 px-2 py-1 rounded">
                        <Globe className="h-3 w-3" />
                        Public
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-gray-600 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                        <Lock className="h-3 w-3" />
                        Private
                      </span>
                    )}
                  </div>
                  
                  {template.description && (
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                      {template.description}
                    </p>
                  )}
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {template.allowed_languages.slice(0, 4).map((lang) => (
                      <span
                        key={lang}
                        className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded text-xs"
                      >
                        {lang}
                      </span>
                    ))}
                    {template.allowed_languages.length > 4 && (
                      <span className="text-xs text-gray-500">
                        +{template.allowed_languages.length - 4} more
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {template.default_duration_hours}h default
                    </span>
                    <span>{template.test_cases?.length || 0} test cases</span>
                    <span>{template.use_count} uses</span>
                  </div>
                </div>
                
                <div className="border-t border-gray-200 dark:border-gray-700 p-4 flex justify-between">
                  <button
                    onClick={() => handleUseTemplate(template)}
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <Copy className="h-4 w-4" />
                    Use Template
                  </button>
                  
                  {session?.user?.id === template.creator_id && (
                    <div className="flex gap-2">
                      <Link
                        href={`/templates/${template.id}/edit`}
                        className="text-gray-600 hover:text-gray-800"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(template.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
