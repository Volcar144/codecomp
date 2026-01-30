"use client";

import { useState, useEffect } from "react";

interface CodeTemplate {
  id: string;
  name: string;
  description: string;
  code: string;
  language: string;
  category: string;
  tags: string[];
  use_count: number;
}

interface TemplatePickerProps {
  language: string;
  onSelect: (template: CodeTemplate) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function TemplatePicker({
  language,
  onSelect,
  isOpen,
  onClose,
}: TemplatePickerProps) {
  const [templates, setTemplates] = useState<CodeTemplate[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen, language]);

  const fetchTemplates = async () => {
    try {
      const res = await fetch(`/api/code-templates?language=${language}`);
      const data = await res.json();
      setTemplates(data.templates || []);
      setCategories(data.categories || []);
    } catch (error) {
      console.error("Error fetching templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (template: CodeTemplate) => {
    // Record usage
    try {
      await fetch("/api/code-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "use", templateId: template.id }),
      });
    } catch (error) {
      console.error("Error recording template usage:", error);
    }

    onSelect(template);
    onClose();
  };

  const filteredTemplates = templates.filter((t) => {
    if (selectedCategory !== "all" && t.category !== selectedCategory) return false;
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        t.name.toLowerCase().includes(searchLower) ||
        t.description?.toLowerCase().includes(searchLower) ||
        t.tags?.some((tag) => tag.toLowerCase().includes(searchLower))
      );
    }
    return true;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-medium text-white">Code Templates</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-xl"
            >
              ×
            </button>
          </div>

          {/* Search and filters */}
          <div className="flex gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates..."
              className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm placeholder-gray-500"
            />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Templates list */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center text-gray-500 py-8">Loading...</div>
          ) : filteredTemplates.length > 0 ? (
            <div className="grid gap-3">
              {filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleSelect(template)}
                  className="text-left p-3 bg-gray-900 hover:bg-gray-700 rounded-lg border border-gray-700 hover:border-green-500 transition-colors"
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="font-medium text-white">{template.name}</div>
                    <span className="text-xs text-gray-500">
                      Used {template.use_count || 0}x
                    </span>
                  </div>
                  {template.description && (
                    <p className="text-gray-400 text-sm mb-2 line-clamp-2">
                      {template.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 bg-gray-700 rounded text-gray-300">
                      {template.category}
                    </span>
                    {template.tags?.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-0.5 bg-gray-800 rounded text-gray-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              {templates.length === 0
                ? `No templates available for ${language}`
                : "No templates match your search"}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 text-center text-xs text-gray-500">
          Click a template to insert it into your editor
        </div>
      </div>
    </div>
  );
}
