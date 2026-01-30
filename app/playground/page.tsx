"use client";

import { useState, useCallback, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import dynamic from "next/dynamic";
import Navbar from "@/components/layout/Navbar";
import { Loading } from "@/components/ui/Loading";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { ExecutionLimitBanner, useExecutionLimits } from "@/components/ExecutionLimitBanner";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-gray-800">
      <Loading />
    </div>
  ),
});

const LANGUAGES = [
  { value: "python", label: "Python", version: "3.10.0" },
  { value: "javascript", label: "JavaScript", version: "Node 18.x" },
  { value: "java", label: "Java", version: "15.0.2" },
  { value: "cpp", label: "C++", version: "10.2.0" },
  { value: "go", label: "Go", version: "1.16.2" },
  { value: "rust", label: "Rust", version: "1.68.0" },
  { value: "csharp", label: "C#", version: "6.12.0" },
];

const DEFAULT_CODE: Record<string, string> = {
  python: `# Welcome to the Code Playground! 🎉
# Write your code below and click Run

def main():
    name = input("What's your name? ")
    print(f"Hello, {name}! Welcome to CodeComp!")
    
if __name__ == "__main__":
    main()
`,
  javascript: `// Welcome to the Code Playground! 🎉
// Write your code below and click Run

const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question("What's your name? ", (name) => {
    console.log(\`Hello, \${name}! Welcome to CodeComp!\`);
    rl.close();
});
`,
  java: `// Welcome to the Code Playground! 🎉
// Write your code below and click Run

import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        System.out.print("What's your name? ");
        String name = scanner.nextLine();
        System.out.println("Hello, " + name + "! Welcome to CodeComp!");
    }
}
`,
  cpp: `// Welcome to the Code Playground! 🎉
// Write your code below and click Run

#include <iostream>
#include <string>
using namespace std;

int main() {
    string name;
    cout << "What's your name? ";
    getline(cin, name);
    cout << "Hello, " << name << "! Welcome to CodeComp!" << endl;
    return 0;
}
`,
  go: `// Welcome to the Code Playground! 🎉
// Write your code below and click Run

package main

import (
    "bufio"
    "fmt"
    "os"
    "strings"
)

func main() {
    reader := bufio.NewReader(os.Stdin)
    fmt.Print("What's your name? ")
    name, _ := reader.ReadString('\\n')
    name = strings.TrimSpace(name)
    fmt.Printf("Hello, %s! Welcome to CodeComp!\\n", name)
}
`,
  rust: `// Welcome to the Code Playground! 🎉
// Write your code below and click Run

use std::io;

fn main() {
    println!("What's your name?");
    let mut name = String::new();
    io::stdin().read_line(&mut name).expect("Failed to read");
    let name = name.trim();
    println!("Hello, {}! Welcome to CodeComp!", name);
}
`,
  csharp: `// Welcome to the Code Playground! 🎉
// Write your code below and click Run

using System;

class Program {
    static void Main() {
        Console.Write("What's your name? ");
        string name = Console.ReadLine();
        Console.WriteLine($"Hello, {name}! Welcome to CodeComp!");
    }
}
`,
};

interface PlaygroundSession {
  id: string;
  title: string;
  code: string;
  language: string;
  input: string;
  is_public: boolean;
  share_slug: string | null;
  created_at: string;
  updated_at: string;
}

export default function PlaygroundPage() {
  const { data: session, isPending: sessionLoading } = useSession();
  const { executionInfo, setExecutionInfo } = useExecutionLimits();
  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState(DEFAULT_CODE.python);
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [currentSession, setCurrentSession] = useState<PlaygroundSession | null>(null);
  const [savedSessions, setSavedSessions] = useState<PlaygroundSession[]>([]);
  const [showSessions, setShowSessions] = useState(false);
  const [title, setTitle] = useState("Untitled");
  const [isPublic, setIsPublic] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);

  // Load saved sessions
  useEffect(() => {
    if (session?.user) {
      fetch("/api/playground?my=true")
        .then((res) => res.json())
        .then((data) => setSavedSessions(data.sessions || []))
        .catch(console.error);
    }
  }, [session]);

  // Load templates
  useEffect(() => {
    fetch(`/api/code-templates?language=${language}&starter=true`)
      .then((res) => res.json())
      .then((data) => setTemplates(data.templates || []))
      .catch(console.error);
  }, [language]);

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    if (!currentSession) {
      setCode(DEFAULT_CODE[newLanguage] || "");
    }
  };

  const handleRun = useCallback(async () => {
    setIsRunning(true);
    setOutput("");
    setError("");
    setExecutionTime(null);

    try {
      const res = await fetch("/api/playground", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "run",
          code,
          language,
          input,
          id: currentSession?.id,
        }),
      });

      const data = await res.json();

      // Handle rate limit error
      if (res.status === 429) {
        setError(data.message || "Daily execution limit reached");
        if (data.remaining !== undefined) {
          setExecutionInfo({
            remaining: data.remaining,
            limit: data.limit,
            plan: data.plan,
          });
        }
        return;
      }

      if (data.error) {
        setError(data.error);
      } else {
        setOutput(data.output || "");
        setExecutionTime(data.executionTime);
        if (data.error) {
          setError(data.error);
        }
      }
      
      // Update execution info if returned
      if (data.executionInfo) {
        setExecutionInfo(data.executionInfo);
      }
    } catch (err) {
      setError("Failed to execute code");
    } finally {
      setIsRunning(false);
    }
  }, [code, language, input, currentSession, setExecutionInfo]);

  const handleSave = useCallback(async () => {
    if (!session?.user) {
      alert("Please log in to save your code");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/playground", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          code,
          language,
          input,
          title,
          id: currentSession?.id,
          is_public: isPublic,
        }),
      });

      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        setCurrentSession(data);
        // Refresh sessions list
        const sessionsRes = await fetch("/api/playground?my=true");
        const sessionsData = await sessionsRes.json();
        setSavedSessions(sessionsData.sessions || []);
      }
    } catch (err) {
      alert("Failed to save");
    } finally {
      setIsSaving(false);
    }
  }, [session, code, language, input, title, currentSession, isPublic]);

  const handleLoadSession = (sess: PlaygroundSession) => {
    setCurrentSession(sess);
    setCode(sess.code);
    setLanguage(sess.language);
    setInput(sess.input || "");
    setTitle(sess.title);
    setIsPublic(sess.is_public);
    setShowSessions(false);
    setOutput("");
    setError("");
  };

  const handleNewSession = () => {
    setCurrentSession(null);
    setCode(DEFAULT_CODE[language] || "");
    setInput("");
    setOutput("");
    setError("");
    setTitle("Untitled");
    setIsPublic(false);
  };

  const handleShare = async () => {
    if (!currentSession?.share_slug) {
      // Save as public first
      setIsPublic(true);
      await handleSave();
    }

    if (currentSession?.share_slug) {
      const url = `${window.location.origin}/playground?share=${currentSession.share_slug}`;
      await navigator.clipboard.writeText(url);
      alert("Share link copied to clipboard!");
    }
  };

  const handleFork = async (sessionId: string) => {
    try {
      const res = await fetch("/api/playground", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "fork", id: sessionId }),
      });

      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        handleLoadSession(data);
      }
    } catch (err) {
      alert("Failed to fork");
    }
  };

  const handleUseTemplate = async (template: any) => {
    setCode(template.code);
    setShowTemplates(false);

    // Record usage
    await fetch("/api/code-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "use", templateId: template.id }),
    });
  };

  // Handle keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleRun();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleRun, handleSave]);

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <Navbar />

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Sidebar - Sessions */}
        <div
          className={`${
            showSessions ? "block" : "hidden lg:block"
          } w-full lg:w-64 bg-gray-800 border-r border-gray-700 overflow-y-auto`}
        >
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <h2 className="font-semibold text-white">Sessions</h2>
            <button
              onClick={handleNewSession}
              className="text-green-400 hover:text-green-300 text-sm"
            >
              + New
            </button>
          </div>

          <div className="p-2">
            {session?.user ? (
              savedSessions.length > 0 ? (
                savedSessions.map((sess) => (
                  <button
                    key={sess.id}
                    onClick={() => handleLoadSession(sess)}
                    className={`w-full text-left p-2 rounded mb-1 text-sm transition-colors ${
                      currentSession?.id === sess.id
                        ? "bg-green-600 text-white"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }`}
                  >
                    <div className="font-medium truncate">{sess.title}</div>
                    <div className="text-xs text-gray-400">
                      {sess.language} •{" "}
                      {new Date(sess.updated_at).toLocaleDateString()}
                    </div>
                  </button>
                ))
              ) : (
                <p className="text-gray-500 text-sm p-2">No saved sessions</p>
              )
            ) : (
              <p className="text-gray-500 text-sm p-2">Log in to save sessions</p>
            )}
          </div>
        </div>

        {/* Main editor area */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Execution Limit Banner */}
          <ExecutionLimitBanner executionInfo={executionInfo} className="mx-3 mt-3" />

          {/* Toolbar */}
          <div className="bg-gray-800 border-b border-gray-700 p-3 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowSessions(!showSessions)}
              className="lg:hidden px-3 py-1.5 bg-gray-700 rounded text-sm text-white"
            >
              ☰ Sessions
            </button>

            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm w-40"
              placeholder="Session name"
            />

            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label} ({lang.version})
                </option>
              ))}
            </select>

            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded text-white text-sm"
            >
              📝 Templates
            </button>

            <div className="flex-1" />

            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="rounded"
              />
              Public
            </label>

            <button
              onClick={handleSave}
              disabled={isSaving || !session?.user}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-white text-sm"
            >
              {isSaving ? "Saving..." : "💾 Save"}
            </button>

            {currentSession && (
              <button
                onClick={handleShare}
                className="px-4 py-1.5 bg-gray-600 hover:bg-gray-500 rounded text-white text-sm"
              >
                🔗 Share
              </button>
            )}

            <button
              onClick={handleRun}
              disabled={isRunning || (executionInfo?.remaining === 0)}
              className="px-4 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded text-white text-sm font-medium"
            >
              {isRunning ? "Running..." : "▶ Run (Ctrl+Enter)"}
            </button>
            
            {/* Compact execution limit indicator */}
            <ExecutionLimitBanner executionInfo={executionInfo} compact className="ml-2" />
          </div>

          {/* Templates dropdown */}
          {showTemplates && (
            <div className="bg-gray-800 border-b border-gray-700 p-3 max-h-48 overflow-y-auto">
              <div className="flex flex-wrap gap-2">
                {templates.length > 0 ? (
                  templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleUseTemplate(template)}
                      className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm text-left"
                    >
                      <div className="text-white font-medium">{template.name}</div>
                      <div className="text-gray-400 text-xs">
                        {template.category} • Used {template.use_count || 0}x
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">No templates for {language}</p>
                )}
              </div>
            </div>
          )}

          {/* Editor and output split */}
          <div className="flex-1 flex flex-col lg:flex-row min-h-0">
            {/* Code editor */}
            <div className="flex-1 min-h-[300px] lg:min-h-0">
              <MonacoEditor
                height="100%"
                language={language === "cpp" ? "cpp" : language === "csharp" ? "csharp" : language}
                value={code}
                onChange={(value) => setCode(value || "")}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: "on",
                  roundedSelection: true,
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 4,
                  wordWrap: "on",
                }}
              />
            </div>

            {/* Input/Output panel */}
            <div className="w-full lg:w-96 flex flex-col border-t lg:border-t-0 lg:border-l border-gray-700">
              {/* Input */}
              <div className="h-32 border-b border-gray-700 flex flex-col">
                <div className="px-3 py-2 bg-gray-800 text-sm text-gray-400 font-medium">
                  Input (stdin)
                </div>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="flex-1 bg-gray-900 text-white p-3 font-mono text-sm resize-none focus:outline-none"
                  placeholder="Enter input for your program..."
                />
              </div>

              {/* Output */}
              <div className="flex-1 flex flex-col min-h-[200px]">
                <div className="px-3 py-2 bg-gray-800 text-sm font-medium flex items-center justify-between">
                  <span className="text-gray-400">Output</span>
                  {executionTime !== null && (
                    <span className="text-green-400 text-xs">
                      Executed in {executionTime}ms
                    </span>
                  )}
                </div>
                <div className="flex-1 bg-gray-900 p-3 font-mono text-sm overflow-auto">
                  {isRunning ? (
                    <div className="text-yellow-400">Running...</div>
                  ) : error ? (
                    <pre className="text-red-400 whitespace-pre-wrap">{error}</pre>
                  ) : output ? (
                    <pre className="text-green-400 whitespace-pre-wrap">{output}</pre>
                  ) : (
                    <span className="text-gray-500">
                      Click Run to execute your code
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
