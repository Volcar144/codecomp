"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";

interface TutorialLesson {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  order_index: number;
  content: string;
  hints: string[];
  starter_code: Record<string, string>;
  solution_code: Record<string, string>;
  test_cases: any[];
  xp_reward: number;
  estimated_minutes: number;
  progress?: {
    status: string;
    hintsUsed: number;
    attempts: number;
    completedAt: string | null;
  };
}

interface Category {
  name: string;
  displayName: string;
  lessons: TutorialLesson[];
  completedCount: number;
  totalCount: number;
}

export default function TutorialPage() {
  const { data: session, isPending } = useSession();
  const [categories, setCategories] = useState<Category[]>([]);
  const [totalLessons, setTotalLessons] = useState(0);
  const [completedLessons, setCompletedLessons] = useState(0);
  const [totalXp, setTotalXp] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    fetchTutorials();
  }, [session?.user?.id]);

  async function fetchTutorials() {
    try {
      const res = await fetch("/api/tutorial");
      const data = await res.json();
      setCategories(data.categories || []);
      setTotalLessons(data.totalLessons || 0);
      setCompletedLessons(data.completedLessons || 0);
      setTotalXp(data.totalXpEarned || 0);
    } catch (err) {
      console.error("Error fetching tutorials:", err);
    } finally {
      setIsLoading(false);
    }
  }

  function getDifficultyColor(difficulty: string) {
    switch (difficulty) {
      case "beginner":
        return "text-green-400 bg-green-400/10";
      case "intermediate":
        return "text-yellow-400 bg-yellow-400/10";
      case "advanced":
        return "text-red-400 bg-red-400/10";
      default:
        return "text-gray-400 bg-gray-400/10";
    }
  }

  function getCategoryIcon(category: string) {
    switch (category) {
      case "basics":
        return "📝";
      case "arrays":
        return "📊";
      case "strings":
        return "🔤";
      case "algorithms":
        return "⚙️";
      case "data-structures":
        return "🗂️";
      default:
        return "📚";
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case "completed":
        return "✅";
      case "in_progress":
        return "🔄";
      default:
        return "⬜";
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Tutorial Mode</h1>
          <p className="text-gray-400">
            Learn programming concepts step by step with guided lessons and hints
          </p>
        </div>

        {/* Progress Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 rounded-xl p-6 border border-blue-500/30">
            <div className="text-3xl font-bold text-white mb-1">
              {completedLessons}/{totalLessons}
            </div>
            <div className="text-blue-300">Lessons Completed</div>
            <div className="mt-3 bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-500 rounded-full h-2 transition-all duration-500"
                style={{ width: `${totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 rounded-xl p-6 border border-purple-500/30">
            <div className="text-3xl font-bold text-white mb-1">
              {totalXp.toLocaleString()}
            </div>
            <div className="text-purple-300">XP Earned</div>
            <div className="text-sm text-gray-400 mt-2">
              From tutorial completions
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 rounded-xl p-6 border border-green-500/30">
            <div className="text-3xl font-bold text-white mb-1">
              {categories.length}
            </div>
            <div className="text-green-300">Categories</div>
            <div className="text-sm text-gray-400 mt-2">
              From basics to algorithms
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="space-y-6">
          {categories.map((category) => (
            <div key={category.name} className="bg-gray-800/50 rounded-xl overflow-hidden">
              {/* Category Header */}
              <button
                onClick={() =>
                  setSelectedCategory(selectedCategory === category.name ? null : category.name)
                }
                className="w-full p-6 flex items-center justify-between hover:bg-gray-800/70 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl">{getCategoryIcon(category.name)}</span>
                  <div className="text-left">
                    <h2 className="text-xl font-semibold text-white">{category.displayName}</h2>
                    <p className="text-gray-400">
                      {category.completedCount}/{category.totalCount} completed
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {/* Progress bar */}
                  <div className="hidden sm:block w-32 bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-green-500 rounded-full h-2 transition-all duration-500"
                      style={{
                        width: `${
                          category.totalCount > 0
                            ? (category.completedCount / category.totalCount) * 100
                            : 0
                        }%`,
                      }}
                    ></div>
                  </div>
                  <span
                    className={`transform transition-transform ${
                      selectedCategory === category.name ? "rotate-180" : ""
                    } text-gray-400`}
                  >
                    ▼
                  </span>
                </div>
              </button>

              {/* Lessons List */}
              {selectedCategory === category.name && (
                <div className="border-t border-gray-700">
                  {category.lessons.map((lesson, index) => (
                    <Link
                      key={lesson.id}
                      href={`/tutorial/${lesson.slug}`}
                      className="flex items-center gap-4 p-4 hover:bg-gray-800/70 transition-colors border-b border-gray-700/50 last:border-b-0"
                    >
                      {/* Status/Number */}
                      <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-lg">
                        {lesson.progress?.status === "completed" ? (
                          "✅"
                        ) : lesson.progress?.status === "in_progress" ? (
                          "🔄"
                        ) : (
                          <span className="text-gray-400">{index + 1}</span>
                        )}
                      </div>

                      {/* Lesson Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-medium truncate">{lesson.title}</h3>
                        <p className="text-gray-400 text-sm truncate">{lesson.description}</p>
                      </div>

                      {/* Meta */}
                      <div className="hidden sm:flex items-center gap-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${getDifficultyColor(
                            lesson.difficulty
                          )}`}
                        >
                          {lesson.difficulty}
                        </span>
                        <span className="text-gray-400 text-sm">
                          ~{lesson.estimated_minutes} min
                        </span>
                        <span className="text-purple-400 text-sm font-medium">
                          +{lesson.xp_reward} XP
                        </span>
                      </div>

                      {/* Arrow */}
                      <span className="text-gray-400">→</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Empty State */}
        {categories.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📚</div>
            <h2 className="text-2xl font-bold text-white mb-2">No Tutorials Available</h2>
            <p className="text-gray-400">Check back soon for new learning content!</p>
          </div>
        )}

        {/* Tips Section */}
        <div className="mt-12 bg-gray-800/30 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">💡 Tips for Success</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex gap-3">
              <span className="text-2xl">📖</span>
              <div>
                <h3 className="text-white font-medium">Read Carefully</h3>
                <p className="text-gray-400 text-sm">
                  Each lesson includes explanations and examples. Read them before coding!
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-2xl">💭</span>
              <div>
                <h3 className="text-white font-medium">Use Hints Wisely</h3>
                <p className="text-gray-400 text-sm">
                  Stuck? Use hints to get unstuck, but try solving it yourself first.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-2xl">🔁</span>
              <div>
                <h3 className="text-white font-medium">Practice Makes Perfect</h3>
                <p className="text-gray-400 text-sm">
                  Don't worry about attempts. Learning takes practice!
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-2xl">🏆</span>
              <div>
                <h3 className="text-white font-medium">Earn XP & Achievements</h3>
                <p className="text-gray-400 text-sm">
                  Complete tutorials to earn XP and unlock special achievements.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
