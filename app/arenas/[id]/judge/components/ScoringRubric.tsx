"use client";

import { useState } from "react";
import { Star, Info, ChevronDown, ChevronUp, Check } from "lucide-react";

interface RubricCriteria {
  id: string;
  name: string;
  description: string;
  weight: number;
  maxScore: number;
}

interface CriteriaScore {
  criteriaId: string;
  score: number;
  comment?: string;
}

interface ScoringRubricProps {
  criteria: RubricCriteria[];
  onScoreSubmit: (scores: CriteriaScore[], totalScore: number, feedback: string) => void;
  onCancel: () => void;
  submitting: boolean;
  participantName: string;
}

const DEFAULT_CRITERIA: RubricCriteria[] = [
  { id: "code_quality", name: "Code Quality", description: "Clean, readable, well-organized code", weight: 25, maxScore: 100 },
  { id: "functionality", name: "Functionality", description: "Code works correctly and handles edge cases", weight: 30, maxScore: 100 },
  { id: "creativity", name: "Creativity", description: "Innovative approach and problem solving", weight: 20, maxScore: 100 },
  { id: "documentation", name: "Documentation", description: "Clear comments and documentation", weight: 15, maxScore: 100 },
  { id: "efficiency", name: "Efficiency", description: "Optimal algorithms and performance", weight: 10, maxScore: 100 },
];

export function ScoringRubric({ 
  criteria = DEFAULT_CRITERIA,
  onScoreSubmit, 
  onCancel, 
  submitting,
  participantName 
}: ScoringRubricProps) {
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [generalFeedback, setGeneralFeedback] = useState("");
  const [expandedCriteria, setExpandedCriteria] = useState<string | null>(null);
  const [useQuickScore, setUseQuickScore] = useState(false);
  const [quickScore, setQuickScore] = useState(50);

  const handleScoreChange = (criteriaId: string, score: number) => {
    setScores(prev => ({ ...prev, [criteriaId]: Math.min(100, Math.max(0, score)) }));
  };

  const calculateTotalScore = () => {
    if (useQuickScore) return quickScore;
    
    let totalWeight = 0;
    let weightedSum = 0;
    
    criteria.forEach(c => {
      const score = scores[c.id] || 0;
      weightedSum += (score / c.maxScore) * c.weight;
      totalWeight += c.weight;
    });
    
    return totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) : 0;
  };

  const handleSubmit = () => {
    const criteriaScores: CriteriaScore[] = useQuickScore 
      ? []
      : criteria.map(c => ({
          criteriaId: c.id,
          score: scores[c.id] || 0,
          comment: comments[c.id],
        }));
    
    onScoreSubmit(criteriaScores, calculateTotalScore(), generalFeedback);
  };

  const allScored = useQuickScore || criteria.every(c => scores[c.id] !== undefined);

  return (
    <div className="bg-gray-700/50 rounded-lg p-4 mt-4 border border-gray-600">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg">
          Score: {participantName}
        </h3>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={useQuickScore}
              onChange={(e) => setUseQuickScore(e.target.checked)}
              className="rounded border-gray-500 bg-gray-600 text-purple-600 focus:ring-purple-500"
            />
            Quick Score Mode
          </label>
        </div>
      </div>

      {useQuickScore ? (
        /* Quick Score Mode */
        <div className="mb-4">
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="0"
              max="100"
              value={quickScore}
              onChange={(e) => setQuickScore(parseInt(e.target.value))}
              className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={quickScore}
                onChange={(e) => setQuickScore(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                className="w-16 bg-gray-600 border border-gray-500 rounded px-2 py-1 text-center"
                min="0"
                max="100"
              />
              <span className="text-gray-400">/100</span>
            </div>
          </div>
        </div>
      ) : (
        /* Rubric-based Scoring */
        <div className="space-y-3 mb-4">
          {criteria.map((c) => (
            <div
              key={c.id}
              className="bg-gray-600/50 rounded-lg overflow-hidden"
            >
              <div
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-600/80"
                onClick={() => setExpandedCriteria(expandedCriteria === c.id ? null : c.id)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">{c.name}</span>
                  <span className="text-xs text-gray-400 bg-gray-700 px-2 py-0.5 rounded">
                    {c.weight}%
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {scores[c.id] !== undefined && (
                    <span className={`text-sm font-semibold ${
                      scores[c.id] >= 80 ? "text-green-400" :
                      scores[c.id] >= 60 ? "text-yellow-400" :
                      scores[c.id] >= 40 ? "text-orange-400" :
                      "text-red-400"
                    }`}>
                      {scores[c.id]}/{c.maxScore}
                    </span>
                  )}
                  {expandedCriteria === c.id ? (
                    <ChevronUp className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  )}
                </div>
              </div>

              {expandedCriteria === c.id && (
                <div className="p-3 pt-0 space-y-3">
                  <p className="text-sm text-gray-400 flex items-start gap-2">
                    <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    {c.description}
                  </p>
                  
                  {/* Quick score buttons */}
                  <div className="flex gap-1">
                    {[0, 25, 50, 75, 100].map((val) => (
                      <button
                        key={val}
                        onClick={() => handleScoreChange(c.id, val)}
                        className={`flex-1 py-1.5 text-sm rounded transition-colors ${
                          scores[c.id] === val
                            ? "bg-purple-600 text-white"
                            : "bg-gray-700 hover:bg-gray-600 text-gray-300"
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>

                  {/* Custom score input */}
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0"
                      max={c.maxScore}
                      value={scores[c.id] || 0}
                      onChange={(e) => handleScoreChange(c.id, parseInt(e.target.value))}
                      className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <input
                      type="number"
                      value={scores[c.id] || ""}
                      onChange={(e) => handleScoreChange(c.id, parseInt(e.target.value) || 0)}
                      placeholder="Score"
                      className="w-16 bg-gray-700 border border-gray-500 rounded px-2 py-1 text-sm text-center"
                      min="0"
                      max={c.maxScore}
                    />
                  </div>

                  {/* Optional comment */}
                  <input
                    type="text"
                    value={comments[c.id] || ""}
                    onChange={(e) => setComments(prev => ({ ...prev, [c.id]: e.target.value }))}
                    placeholder="Optional comment for this criteria..."
                    className="w-full bg-gray-700 border border-gray-500 rounded px-3 py-2 text-sm"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* General Feedback */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          General Feedback
        </label>
        <textarea
          value={generalFeedback}
          onChange={(e) => setGeneralFeedback(e.target.value)}
          placeholder="Overall feedback for this participant..."
          rows={3}
          className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500"
        />
      </div>

      {/* Score Summary */}
      <div className="bg-gray-800 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-gray-300">Total Score</span>
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            <span className="text-2xl font-bold">{calculateTotalScore()}</span>
            <span className="text-gray-400">/100</span>
          </div>
        </div>
        {!useQuickScore && !allScored && (
          <p className="text-xs text-yellow-500 mt-2">
            Score all criteria for accurate total (click each to expand)
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={submitting || (!useQuickScore && !allScored)}
          className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-2 rounded-lg font-medium transition-colors"
        >
          {submitting ? (
            "Submitting..."
          ) : (
            <>
              <Check className="h-4 w-4" />
              Submit Score
            </>
          )}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
