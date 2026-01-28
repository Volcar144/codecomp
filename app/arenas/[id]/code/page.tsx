"use client";

import { useState, useEffect, use, useCallback } from "react";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { Loading } from "@/components/ui/Loading";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import dynamic from "next/dynamic";

// Dynamically import Monaco Editor to avoid SSR issues
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => <div className="h-full bg-gray-800 animate-pulse" />,
});

interface ArenaFile {
  name: string;
  path: string;
  type: "file" | "dir";
  sha: string;
}

interface Arena {
  id: string;
  title: string;
  github_repo: string;
  status: string;
}

export default function ArenaCodePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session, isPending } = useSession();
  const [arena, setArena] = useState<Arena | null>(null);
  const [files, setFiles] = useState<ArenaFile[]>([]);
  const [currentFile, setCurrentFile] = useState<{
    name: string;
    content: string;
    path: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newFileName, setNewFileName] = useState("");
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!isPending && session) {
      fetchArena();
      fetchFiles();
    }
  }, [isPending, session, id]);

  const fetchArena = async () => {
    try {
      const response = await fetch(`/api/arenas/${id}`);
      if (response.ok) {
        const data = await response.json();
        setArena(data.arena);
      }
    } catch (err) {
      console.error("Failed to fetch arena:", err);
    }
  };

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/arenas/${id}/files`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch files");
      }

      const data = await response.json();
      setFiles(data.files || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const loadFile = async (filename: string) => {
    try {
      const response = await fetch(`/api/arenas/${id}/files?file=${filename}`);
      if (!response.ok) {
        throw new Error("Failed to load file");
      }

      const data = await response.json();
      setCurrentFile({
        name: filename,
        content: data.file.content,
        path: data.file.path,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load file");
    }
  };

  const saveFile = useCallback(async () => {
    if (!currentFile) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/arenas/${id}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: currentFile.name,
          content: currentFile.content,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save file");
      }

      await fetchFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save file");
    } finally {
      setSaving(false);
    }
  }, [currentFile, id]);

  const createFile = async () => {
    if (!newFileName.trim()) return;

    try {
      const response = await fetch(`/api/arenas/${id}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: newFileName,
          content: "",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create file");
      }

      setShowNewFileModal(false);
      setNewFileName("");
      await fetchFiles();

      // Open the new file
      setCurrentFile({
        name: newFileName,
        content: "",
        path: "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create file");
    }
  };

  const deleteFile = async (filename: string) => {
    if (!confirm(`Delete ${filename}?`)) return;

    try {
      const response = await fetch(`/api/arenas/${id}/files?file=${filename}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete file");
      }

      if (currentFile?.name === filename) {
        setCurrentFile(null);
      }
      await fetchFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete file");
    }
  };

  const runCode = async () => {
    if (!currentFile) return;

    setRunning(true);
    setTerminalOutput(["Running..."]);

    try {
      // Determine language from file extension
      const ext = currentFile.name.split(".").pop()?.toLowerCase() || "";
      const languageMap: Record<string, string> = {
        py: "python",
        js: "javascript",
        ts: "typescript",
        java: "java",
        cpp: "cpp",
        c: "c",
        go: "go",
        rs: "rust",
        rb: "ruby",
      };
      const language = languageMap[ext] || "python";

      const response = await fetch("/api/terminal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "execute",
          code: currentFile.content,
          language,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const output: string[] = [];
        if (data.compile?.output) {
          output.push("=== Compile ===", data.compile.output);
        }
        if (data.output) {
          output.push("=== Output ===", data.output);
        }
        if (data.error) {
          output.push("=== Errors ===", data.error);
        }
        output.push(`Exit code: ${data.exitCode}`);
        setTerminalOutput(output);
      } else {
        setTerminalOutput(["Error: " + (data.error || "Execution failed")]);
      }
    } catch (err) {
      setTerminalOutput([
        "Error: " + (err instanceof Error ? err.message : "Unknown error"),
      ]);
    } finally {
      setRunning(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        saveFile();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [saveFile]);

  const getLanguage = (filename: string) => {
    const ext = filename.split(".").pop()?.toLowerCase() || "";
    const languageMap: Record<string, string> = {
      py: "python",
      js: "javascript",
      ts: "typescript",
      jsx: "javascript",
      tsx: "typescript",
      java: "java",
      cpp: "cpp",
      c: "c",
      go: "go",
      rs: "rust",
      rb: "ruby",
      md: "markdown",
      json: "json",
      html: "html",
      css: "css",
    };
    return languageMap[ext] || "plaintext";
  };

  if (isPending || loading) {
    return <Loading />;
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <p>Please sign in to access the editor</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/arenas/${id}`} className="text-purple-400 hover:text-purple-300">
            ← Back
          </Link>
          <h1 className="font-semibold">{arena?.title || "Arena Editor"}</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={runCode}
            disabled={!currentFile || running}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-4 py-1.5 rounded text-sm flex items-center gap-2"
          >
            {running ? (
              <>
                <span className="animate-spin">⏳</span> Running...
              </>
            ) : (
              <>▶ Run</>
            )}
          </button>
          <button
            onClick={saveFile}
            disabled={!currentFile || saving}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 px-4 py-1.5 rounded text-sm"
          >
            {saving ? "Saving..." : "Save (⌘S)"}
          </button>
        </div>
      </div>

      {error && (
        <div className="px-4 py-2">
          <ErrorMessage message={error} />
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* File Explorer */}
        <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
          <div className="p-3 border-b border-gray-700 flex justify-between items-center">
            <span className="text-sm font-medium text-gray-400">Files</span>
            <button
              onClick={() => setShowNewFileModal(true)}
              className="text-purple-400 hover:text-purple-300 text-sm"
            >
              + New
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {files.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">No files yet</p>
            ) : (
              files.map((file) => (
                <div
                  key={file.path}
                  className={`flex items-center justify-between px-3 py-2 rounded cursor-pointer group ${
                    currentFile?.name === file.name
                      ? "bg-purple-600/30 text-purple-300"
                      : "hover:bg-gray-700"
                  }`}
                >
                  <span
                    onClick={() => loadFile(file.name)}
                    className="flex-1 truncate text-sm"
                  >
                    {file.name}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteFile(file.name);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 text-xs"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Editor & Terminal */}
        <div className="flex-1 flex flex-col">
          {/* Editor */}
          <div className="flex-1 overflow-hidden">
            {currentFile ? (
              <MonacoEditor
                height="100%"
                language={getLanguage(currentFile.name)}
                theme="vs-dark"
                value={currentFile.content}
                onChange={(value) =>
                  setCurrentFile((prev) =>
                    prev ? { ...prev, content: value || "" } : null
                  )
                }
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  wordWrap: "on",
                  automaticLayout: true,
                  scrollBeyondLastLine: false,
                }}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <p className="mb-2">Select a file to edit</p>
                  <button
                    onClick={() => setShowNewFileModal(true)}
                    className="text-purple-400 hover:text-purple-300"
                  >
                    or create a new file
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Terminal Output */}
          <div className="h-48 bg-gray-950 border-t border-gray-700">
            <div className="px-4 py-2 border-b border-gray-700 text-sm font-medium text-gray-400">
              Terminal Output
            </div>
            <div className="p-4 h-36 overflow-y-auto font-mono text-sm">
              {terminalOutput.length === 0 ? (
                <p className="text-gray-500">Run your code to see output here</p>
              ) : (
                terminalOutput.map((line, i) => (
                  <div
                    key={i}
                    className={
                      line.startsWith("===")
                        ? "text-purple-400 font-semibold mt-2"
                        : line.startsWith("Error")
                        ? "text-red-400"
                        : "text-gray-300"
                    }
                  >
                    {line}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* New File Modal */}
      {showNewFileModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-96">
            <h2 className="text-lg font-semibold mb-4">Create New File</h2>
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="filename.py"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 mb-4 focus:outline-none focus:border-purple-500"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && createFile()}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowNewFileModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={createFile}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
