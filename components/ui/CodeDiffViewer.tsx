"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, Plus, Minus, Equal } from "lucide-react";

interface DiffLine {
  type: "add" | "remove" | "unchanged" | "header";
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

interface CodeDiffViewerProps {
  oldCode: string;
  newCode: string;
  oldLabel?: string;
  newLabel?: string;
  language?: string;
  showLineNumbers?: boolean;
  defaultExpanded?: boolean;
}

/**
 * Compute the diff between two strings using a simple line-by-line algorithm
 * For production, consider using a more sophisticated diff algorithm like Myers'
 */
function computeDiff(oldCode: string, newCode: string): DiffLine[] {
  const oldLines = oldCode.split("\n");
  const newLines = newCode.split("\n");
  const diff: DiffLine[] = [];

  // Simple LCS-based diff
  const lcs = computeLCS(oldLines, newLines);
  
  let oldIndex = 0;
  let newIndex = 0;
  let lcsIndex = 0;

  while (oldIndex < oldLines.length || newIndex < newLines.length) {
    if (lcsIndex < lcs.length && oldIndex < oldLines.length && oldLines[oldIndex] === lcs[lcsIndex]) {
      if (newIndex < newLines.length && newLines[newIndex] === lcs[lcsIndex]) {
        // Line is in both - unchanged
        diff.push({
          type: "unchanged",
          content: oldLines[oldIndex],
          oldLineNumber: oldIndex + 1,
          newLineNumber: newIndex + 1,
        });
        oldIndex++;
        newIndex++;
        lcsIndex++;
      } else {
        // Line is in old but not at current new position - addition in new
        diff.push({
          type: "add",
          content: newLines[newIndex],
          newLineNumber: newIndex + 1,
        });
        newIndex++;
      }
    } else if (oldIndex < oldLines.length) {
      // Line is in old but not in LCS - removal
      diff.push({
        type: "remove",
        content: oldLines[oldIndex],
        oldLineNumber: oldIndex + 1,
      });
      oldIndex++;
    } else if (newIndex < newLines.length) {
      // Line is only in new - addition
      diff.push({
        type: "add",
        content: newLines[newIndex],
        newLineNumber: newIndex + 1,
      });
      newIndex++;
    }
  }

  return diff;
}

/**
 * Compute Longest Common Subsequence of two string arrays
 */
function computeLCS(arr1: string[], arr2: string[]): string[] {
  const m = arr1.length;
  const n = arr2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (arr1[i - 1] === arr2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find LCS
  const lcs: string[] = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (arr1[i - 1] === arr2[j - 1]) {
      lcs.unshift(arr1[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return lcs;
}

export function CodeDiffViewer({
  oldCode,
  newCode,
  oldLabel = "Previous Version",
  newLabel = "Current Version",
  showLineNumbers = true,
  defaultExpanded = true,
}: CodeDiffViewerProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [viewMode, setViewMode] = useState<"unified" | "split">("unified");

  const diff = useMemo(() => computeDiff(oldCode, newCode), [oldCode, newCode]);

  const stats = useMemo(() => {
    let additions = 0;
    let deletions = 0;
    for (const line of diff) {
      if (line.type === "add") additions++;
      if (line.type === "remove") deletions++;
    }
    return { additions, deletions };
  }, [diff]);

  const hasDiff = stats.additions > 0 || stats.deletions > 0;

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          <button className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2 text-sm">
            {hasDiff ? (
              <>
                <span className="flex items-center gap-1 text-green-600">
                  <Plus className="w-4 h-4" />
                  {stats.additions}
                </span>
                <span className="flex items-center gap-1 text-red-600">
                  <Minus className="w-4 h-4" />
                  {stats.deletions}
                </span>
              </>
            ) : (
              <span className="flex items-center gap-1 text-gray-500">
                <Equal className="w-4 h-4" />
                No changes
              </span>
            )}
          </div>
        </div>
        
        {isExpanded && (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              className={`px-3 py-1 text-xs rounded ${
                viewMode === "unified"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
              onClick={() => setViewMode("unified")}
            >
              Unified
            </button>
            <button
              className={`px-3 py-1 text-xs rounded ${
                viewMode === "split"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
              onClick={() => setViewMode("split")}
            >
              Split
            </button>
          </div>
        )}
      </div>

      {/* Diff Content */}
      {isExpanded && (
        <div className="overflow-x-auto">
          {viewMode === "unified" ? (
            <UnifiedDiff diff={diff} showLineNumbers={showLineNumbers} />
          ) : (
            <SplitDiff 
              oldCode={oldCode} 
              newCode={newCode} 
              oldLabel={oldLabel}
              newLabel={newLabel}
              showLineNumbers={showLineNumbers} 
            />
          )}
        </div>
      )}
    </div>
  );
}

function UnifiedDiff({ diff, showLineNumbers }: { diff: DiffLine[]; showLineNumbers: boolean }) {
  return (
    <table className="w-full text-sm font-mono">
      <tbody>
        {diff.map((line, index) => (
          <tr
            key={index}
            className={
              line.type === "add"
                ? "bg-green-50 dark:bg-green-900/20"
                : line.type === "remove"
                ? "bg-red-50 dark:bg-red-900/20"
                : ""
            }
          >
            {showLineNumbers && (
              <>
                <td className="w-12 px-2 py-0.5 text-right text-gray-400 select-none border-r border-gray-200 dark:border-gray-700">
                  {line.oldLineNumber || ""}
                </td>
                <td className="w-12 px-2 py-0.5 text-right text-gray-400 select-none border-r border-gray-200 dark:border-gray-700">
                  {line.newLineNumber || ""}
                </td>
              </>
            )}
            <td className="w-6 px-2 py-0.5 text-center select-none">
              {line.type === "add" && <span className="text-green-600">+</span>}
              {line.type === "remove" && <span className="text-red-600">-</span>}
            </td>
            <td className="px-2 py-0.5 whitespace-pre text-gray-800 dark:text-gray-200">
              {line.content || " "}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SplitDiff({ 
  oldCode, 
  newCode, 
  oldLabel,
  newLabel,
  showLineNumbers 
}: { 
  oldCode: string; 
  newCode: string;
  oldLabel: string;
  newLabel: string;
  showLineNumbers: boolean;
}) {
  const oldLines = oldCode.split("\n");
  const newLines = newCode.split("\n");
  const maxLines = Math.max(oldLines.length, newLines.length);

  return (
    <div className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-700">
      {/* Old Version */}
      <div>
        <div className="px-3 py-2 bg-red-50 dark:bg-red-900/20 text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
          {oldLabel}
        </div>
        <table className="w-full text-sm font-mono">
          <tbody>
            {Array.from({ length: maxLines }).map((_, index) => (
              <tr key={index} className={index >= oldLines.length ? "opacity-30" : ""}>
                {showLineNumbers && (
                  <td className="w-12 px-2 py-0.5 text-right text-gray-400 select-none border-r border-gray-200 dark:border-gray-700">
                    {index < oldLines.length ? index + 1 : ""}
                  </td>
                )}
                <td className="px-2 py-0.5 whitespace-pre text-gray-800 dark:text-gray-200">
                  {oldLines[index] || " "}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* New Version */}
      <div>
        <div className="px-3 py-2 bg-green-50 dark:bg-green-900/20 text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
          {newLabel}
        </div>
        <table className="w-full text-sm font-mono">
          <tbody>
            {Array.from({ length: maxLines }).map((_, index) => (
              <tr key={index} className={index >= newLines.length ? "opacity-30" : ""}>
                {showLineNumbers && (
                  <td className="w-12 px-2 py-0.5 text-right text-gray-400 select-none border-r border-gray-200 dark:border-gray-700">
                    {index < newLines.length ? index + 1 : ""}
                  </td>
                )}
                <td className="px-2 py-0.5 whitespace-pre text-gray-800 dark:text-gray-200">
                  {newLines[index] || " "}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default CodeDiffViewer;
