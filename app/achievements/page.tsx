"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loading } from "@/components/ui/Loading";
import { 
  Trophy, Medal, Star, Flame, Zap, Target, Swords, 
  Calendar, TrendingUp, Award, Lock, CheckCircle,
  ArrowLeft
} from "lucide-react";

interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  rarity: string;
  requirement_type: string;
  requirement_value: number;
  xp_reward: number;
}

interface UserAchievement {
  id: string;
  achievement_id: string;
  unlocked_at: string;
  achievement_definitions: AchievementDefinition;
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  submissions: Target,
  duels: Swords,
  streaks: Flame,
  rating: TrendingUp,
  special: Star,
};

const RARITY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  common: { bg: "bg-gray-800", border: "border-gray-600", text: "text-gray-400" },
  uncommon: { bg: "bg-green-900/30", border: "border-green-600", text: "text-green-400" },
  rare: { bg: "bg-blue-900/30", border: "border-blue-500", text: "text-blue-400" },
  epic: { bg: "bg-purple-900/30", border: "border-purple-500", text: "text-purple-400" },
  legendary: { bg: "bg-yellow-900/30", border: "border-yellow-500", text: "text-yellow-400" },
};

const ICON_MAP: Record<string, React.ElementType> = {
  trophy: Trophy,
  medal: Medal,
  star: Star,
  flame: Flame,
  zap: Zap,
  target: Target,
  swords: Swords,
  calendar: Calendar,
  trending: TrendingUp,
  award: Award,
};

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<AchievementDefinition[]>([]);
  const [unlocked, setUnlocked] = useState<UserAchievement[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    fetchAchievements();
  }, []);

  const fetchAchievements = async () => {
    try {
      const res = await fetch("/api/achievements");
      const data = await res.json();
      
      setAchievements(data.achievements || []);
      setUnlocked(data.unlocked || []);
      setProgress(data.progress || {});
    } catch (err) {
      console.error("Failed to fetch achievements:", err);
    } finally {
      setLoading(false);
    }
  };

  const unlockedIds = new Set(unlocked.map((u) => u.achievement_id));
  
  const categories = Array.from(
    new Set(achievements.map((a) => a.category))
  );

  const filteredAchievements = selectedCategory
    ? achievements.filter((a) => a.category === selectedCategory)
    : achievements;

  const stats = {
    total: achievements.length,
    unlocked: unlocked.length,
    totalXP: unlocked.reduce(
      (sum, u) => sum + (u.achievement_definitions?.xp_reward || 0),
      0
    ),
  };

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900 to-indigo-900 py-12">
        <div className="max-w-6xl mx-auto px-6">
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 text-purple-300 hover:text-white mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Profile
          </Link>
          
          <div className="flex items-center gap-4">
            <div className="p-4 bg-purple-800/50 rounded-xl">
              <Trophy className="w-12 h-12 text-yellow-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Achievements</h1>
              <p className="text-purple-200">
                Track your progress and unlock rewards
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 mt-8">
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur">
              <p className="text-sm text-purple-200">Unlocked</p>
              <p className="text-2xl font-bold">
                {stats.unlocked} / {stats.total}
              </p>
              <div className="mt-2 h-2 bg-purple-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-400 transition-all"
                  style={{ width: `${(stats.unlocked / stats.total) * 100}%` }}
                />
              </div>
            </div>
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur">
              <p className="text-sm text-purple-200">Completion</p>
              <p className="text-2xl font-bold">
                {Math.round((stats.unlocked / stats.total) * 100)}%
              </p>
            </div>
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur">
              <p className="text-sm text-purple-200">Total XP Earned</p>
              <p className="text-2xl font-bold">{stats.totalXP.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Category Filters */}
        <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
              !selectedCategory
                ? "bg-purple-600 text-white"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            All ({achievements.length})
          </button>
          {categories.map((category) => {
            const Icon = CATEGORY_ICONS[category] || Award;
            const count = achievements.filter((a) => a.category === category).length;
            const unlockedCount = achievements.filter(
              (a) => a.category === category && unlockedIds.has(a.id)
            ).length;
            
            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors 
                  flex items-center gap-2 whitespace-nowrap ${
                  selectedCategory === category
                    ? "bg-purple-600 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="capitalize">{category}</span>
                <span className="text-sm opacity-75">
                  ({unlockedCount}/{count})
                </span>
              </button>
            );
          })}
        </div>

        {/* Recently Unlocked */}
        {unlocked.length > 0 && !selectedCategory && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              Recently Unlocked
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {unlocked.slice(0, 3).map((ua) => {
                const def = ua.achievement_definitions;
                if (!def) return null;
                const rarity = RARITY_COLORS[def.rarity] || RARITY_COLORS.common;
                const Icon = ICON_MAP[def.icon] || Award;
                
                return (
                  <div
                    key={ua.id}
                    className={`${rarity.bg} ${rarity.border} border-2 rounded-xl p-4 
                      relative overflow-hidden`}
                  >
                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl 
                      from-white/10 to-transparent rounded-bl-full" />
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl ${rarity.bg} border ${rarity.border}`}>
                        <Icon className={`w-6 h-6 ${rarity.text}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{def.name}</h3>
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        </div>
                        <p className="text-sm text-gray-400 mt-1">
                          {def.description}
                        </p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className={`text-xs font-medium capitalize ${rarity.text}`}>
                            {def.rarity}
                          </span>
                          {def.xp_reward > 0 && (
                            <span className="text-xs text-yellow-400">
                              +{def.xp_reward} XP
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* All Achievements */}
        <div>
          <h2 className="text-xl font-semibold mb-4">
            {selectedCategory ? (
              <span className="capitalize">{selectedCategory} Achievements</span>
            ) : (
              "All Achievements"
            )}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAchievements.map((achievement) => {
              const isUnlocked = unlockedIds.has(achievement.id);
              const rarity = RARITY_COLORS[achievement.rarity] || RARITY_COLORS.common;
              const Icon = ICON_MAP[achievement.icon] || Award;
              const currentProgress = progress[achievement.id] || 0;
              const progressPercent = Math.min(
                (currentProgress / achievement.requirement_value) * 100,
                100
              );
              
              return (
                <div
                  key={achievement.id}
                  className={`rounded-xl p-4 border-2 transition-all ${
                    isUnlocked
                      ? `${rarity.bg} ${rarity.border}`
                      : "bg-gray-800/50 border-gray-700 opacity-75"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${
                      isUnlocked 
                        ? `${rarity.bg} border ${rarity.border}` 
                        : "bg-gray-800 border border-gray-600"
                    }`}>
                      {isUnlocked ? (
                        <Icon className={`w-6 h-6 ${rarity.text}`} />
                      ) : (
                        <Lock className="w-6 h-6 text-gray-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className={`font-semibold ${!isUnlocked && "text-gray-400"}`}>
                          {achievement.name}
                        </h3>
                        {isUnlocked && (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        )}
                      </div>
                      <p className="text-sm text-gray-400 mt-1">
                        {achievement.description}
                      </p>
                      
                      {/* Progress bar for locked achievements */}
                      {!isUnlocked && achievement.requirement_value > 1 && (
                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Progress</span>
                            <span>
                              {currentProgress} / {achievement.requirement_value}
                            </span>
                          </div>
                          <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-500 transition-all"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-4 mt-2">
                        <span className={`text-xs font-medium capitalize ${
                          isUnlocked ? rarity.text : "text-gray-500"
                        }`}>
                          {achievement.rarity}
                        </span>
                        {achievement.xp_reward > 0 && (
                          <span className={`text-xs ${
                            isUnlocked ? "text-yellow-400" : "text-gray-500"
                          }`}>
                            +{achievement.xp_reward} XP
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {filteredAchievements.length === 0 && (
          <div className="text-center py-12">
            <Award className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No achievements in this category</p>
          </div>
        )}
      </div>
    </div>
  );
}
