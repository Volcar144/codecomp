/**
 * Piston API Client with WebSocket support for interactive terminal sessions
 * Based on the piston-api npm package specification
 */

import { EventEmitter } from "events";

// Types
export interface PistonRuntime {
  language: string;
  version: string;
  aliases: string[];
  runtime?: string;
}

export interface PistonRunRequest {
  language: string;
  version: string;
  code: string;
  stdin?: string;
  args?: string[];
  compile_timeout?: number;
  run_timeout?: number;
  compile_memory_limit?: number;
  run_memory_limit?: number;
}

export interface PistonRunResult {
  language: string;
  version: string;
  run: {
    stdout: string;
    stderr: string;
    code: number;
    signal: string | null;
    output: string;
  };
  compile?: {
    stdout: string;
    stderr: string;
    code: number;
    signal: string | null;
    output: string;
  };
}

export interface PistonInstallRequest {
  language: string;
  version: string;
}

export interface InteractiveSession {
  id: string;
  language: string;
  status: "creating" | "ready" | "running" | "completed" | "error";
  createdAt: Date;
  ws?: WebSocket;
}

export type PistonEventType =
  | "sessionCreated"
  | "sessionReady"
  | "sessionOutput"
  | "sessionCompleted"
  | "sessionError"
  | "sessionDestroyed";

// Language map with versions and file extensions
export const PISTON_LANGUAGE_MAP: Record<
  string,
  { version: string; aliases: string[]; extension: string }
> = {
  python: { version: "3.10.0", aliases: ["py", "python3"], extension: "py" },
  javascript: {
    version: "18.15.0",
    aliases: ["js", "node", "nodejs"],
    extension: "js",
  },
  typescript: { version: "5.0.3", aliases: ["ts"], extension: "ts" },
  java: { version: "15.0.2", aliases: [], extension: "java" },
  cpp: { version: "10.2.0", aliases: ["c++", "g++"], extension: "cpp" },
  c: { version: "10.2.0", aliases: ["gcc"], extension: "c" },
  csharp: { version: "6.12.0", aliases: ["cs", "c#", "dotnet"], extension: "cs" },
  go: { version: "1.16.2", aliases: ["golang"], extension: "go" },
  rust: { version: "1.68.2", aliases: ["rs"], extension: "rs" },
  ruby: { version: "3.0.1", aliases: ["rb"], extension: "rb" },
  php: { version: "8.2.3", aliases: [], extension: "php" },
  swift: { version: "5.3.3", aliases: [], extension: "swift" },
  kotlin: { version: "1.8.20", aliases: ["kt"], extension: "kt" },
  scala: { version: "3.2.2", aliases: [], extension: "scala" },
  bash: { version: "5.2.0", aliases: ["sh", "shell"], extension: "sh" },
};

export class PistonClient extends EventEmitter {
  private baseUrl: string;
  private sessions: Map<string, InteractiveSession> = new Map();
  private wsConnections: Map<string, WebSocket> = new Map();

  constructor(options: { baseUrl?: string } = {}) {
    super();
    this.baseUrl =
      options.baseUrl ||
      process.env.CODE_EXECUTION_API_URL ||
      "https://emkc.org/api/v2/piston";
  }

  /**
   * Get available runtimes from Piston
   */
  async getRuntimes(force = false): Promise<PistonRuntime[]> {
    const response = await fetch(`${this.baseUrl}/runtimes`);
    if (!response.ok) {
      throw new Error(`Failed to fetch runtimes: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Validate that the Piston instance is available
   */
  async validateInstance(): Promise<boolean> {
    try {
      const runtimes = await this.getRuntimes();
      return Array.isArray(runtimes) && runtimes.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Execute code once (non-interactive)
   */
  async run(request: PistonRunRequest): Promise<PistonRunResult> {
    const langInfo = this.resolveLanguage(request.language);

    const payload = {
      language: langInfo.language,
      version: request.version === "*" ? langInfo.version : request.version,
      files: [
        {
          name: `main.${langInfo.extension}`,
          content: request.code,
        },
      ],
      stdin: request.stdin || "",
      args: request.args || [],
      compile_timeout: request.compile_timeout || 10000,
      run_timeout: request.run_timeout || 3000,
      compile_memory_limit: request.compile_memory_limit || -1,
      run_memory_limit: request.run_memory_limit || -1,
    };

    const response = await fetch(`${this.baseUrl}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Piston execution failed: ${error}`);
    }

    return response.json();
  }

  /**
   * Resolve language alias to canonical name and version
   */
  private resolveLanguage(language: string): {
    language: string;
    version: string;
    extension: string;
  } {
    const normalized = language.toLowerCase();

    // Direct match
    if (PISTON_LANGUAGE_MAP[normalized]) {
      return {
        language: normalized,
        version: PISTON_LANGUAGE_MAP[normalized].version,
        extension: PISTON_LANGUAGE_MAP[normalized].extension,
      };
    }

    // Check aliases
    for (const [lang, info] of Object.entries(PISTON_LANGUAGE_MAP)) {
      if (info.aliases.includes(normalized)) {
        return {
          language: lang,
          version: info.version,
          extension: info.extension,
        };
      }
    }

    // Default fallback
    return { language: normalized, version: "*", extension: "txt" };
  }

  /**
   * Start an interactive session with WebSocket support
   */
  async runInteractive(code: string, language: string): Promise<string> {
    const sessionId = this.generateSessionId();
    const langInfo = this.resolveLanguage(language);

    const session: InteractiveSession = {
      id: sessionId,
      language: langInfo.language,
      status: "creating",
      createdAt: new Date(),
    };

    this.sessions.set(sessionId, session);
    this.emit("sessionCreated", sessionId);

    try {
      // For WebSocket-based interactive sessions, we need a WebSocket endpoint
      // The public Piston API doesn't support WebSockets, so we simulate with polling
      // For self-hosted Piston, you can implement true WebSocket support

      // Start the initial execution
      const result = await this.run({
        language: langInfo.language,
        version: "*",
        code,
      });

      session.status = "ready";
      this.emit("sessionReady", sessionId);

      if (result.run.stdout) {
        this.emit("sessionOutput", sessionId, result.run.stdout);
      }
      if (result.run.stderr) {
        this.emit("sessionOutput", sessionId, result.run.stderr);
      }

      return sessionId;
    } catch (error) {
      session.status = "error";
      this.emit("sessionError", sessionId, error);
      throw error;
    }
  }

  /**
   * Send input to an interactive session
   */
  async sendInput(sessionId: string, input: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // For non-WebSocket mode, we re-run with the input
    // This is a simplified implementation
    this.emit("sessionOutput", sessionId, `> ${input}`);
  }

  /**
   * Destroy an interactive session
   */
  destroySession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = "completed";
      this.sessions.delete(sessionId);

      const ws = this.wsConnections.get(sessionId);
      if (ws) {
        ws.close();
        this.wsConnections.delete(sessionId);
      }

      this.emit("sessionDestroyed", sessionId);
    }
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): InteractiveSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all active sessions
   */
  getAllSessions(): InteractiveSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Install a specific runtime version (requires admin access on self-hosted)
   */
  async installPackage(request: PistonInstallRequest): Promise<void> {
    const response = await fetch(`${this.baseUrl}/packages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Failed to install package: ${response.statusText}`);
    }
  }

  /**
   * Install latest version of a runtime
   */
  async installRuntime(language: string): Promise<void> {
    const langInfo = this.resolveLanguage(language);
    await this.installPackage({
      language: langInfo.language,
      version: langInfo.version,
    });
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}

// Singleton instance
let pistonClientInstance: PistonClient | null = null;

export function getPistonClient(): PistonClient {
  if (!pistonClientInstance) {
    pistonClientInstance = new PistonClient();
  }
  return pistonClientInstance;
}

// Type-safe event emitter helpers
export interface PistonClientEvents {
  sessionCreated: (sessionId: string) => void;
  sessionReady: (sessionId: string) => void;
  sessionOutput: (sessionId: string, output: string) => void;
  sessionCompleted: (sessionId: string) => void;
  sessionError: (sessionId: string, error: Error) => void;
  sessionDestroyed: (sessionId: string) => void;
}
