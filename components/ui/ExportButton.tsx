"use client";

import { useState } from "react";
import { Download, FileJson, FileSpreadsheet, Loader2 } from "lucide-react";

interface ExportButtonProps {
  competitionId: string;
  competitionTitle: string;
}

export function ExportButton({ competitionId, competitionTitle }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const exportResults = async (format: "csv" | "json") => {
    setIsExporting(true);
    setShowDropdown(false);

    try {
      const res = await fetch(`/api/competitions/${competitionId}/export?format=${format}`);
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Export failed");
      }

      if (format === "json") {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        downloadBlob(blob, `${sanitizeFilename(competitionTitle)}_results.json`);
      } else {
        const blob = await res.blob();
        downloadBlob(blob, `${sanitizeFilename(competitionTitle)}_results.csv`);
      }
    } catch (error) {
      console.error("Export failed:", error);
      alert(error instanceof Error ? error.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const sanitizeFilename = (name: string) => {
    return name.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 50);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={isExporting}
        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
      >
        {isExporting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        Export Results
      </button>

      {showDropdown && !isExporting && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
          <button
            onClick={() => exportResults("csv")}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-left rounded-t-lg transition-colors"
          >
            <FileSpreadsheet className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">CSV</p>
              <p className="text-xs text-gray-500">Spreadsheet format</p>
            </div>
          </button>
          <button
            onClick={() => exportResults("json")}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-left rounded-b-lg border-t border-gray-100 dark:border-gray-700 transition-colors"
          >
            <FileJson className="w-5 h-5 text-blue-600" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">JSON</p>
              <p className="text-xs text-gray-500">Machine-readable</p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

export default ExportButton;
