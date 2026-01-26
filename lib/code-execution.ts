import axios from "axios";

// Piston API endpoint - public instance
const PISTON_API = process.env.CODE_EXECUTION_API_URL || "https://emkc.org/api/v2/piston";

// Language version mappings for Piston
const LANGUAGE_MAP: Record<string, { language: string; version: string }> = {
  python: { language: "python", version: "3.10.0" },
  javascript: { language: "javascript", version: "18.15.0" },
  java: { language: "java", version: "15.0.2" },
  cpp: { language: "c++", version: "10.2.0" },
  csharp: { language: "csharp", version: "6.12.0" },
  go: { language: "go", version: "1.16.2" },
  rust: { language: "rust", version: "1.68.2" },
};

export interface ExecutionResult {
  output: string;
  error: string | null;
  executionTime: number;
  memoryUsed: number;
  stderr?: string;
  stdout?: string;
}

/**
 * Execute code using Piston API
 */
export async function executeCode(
  code: string,
  language: string,
  input: string = ""
): Promise<ExecutionResult> {
  try {
    const langConfig = LANGUAGE_MAP[language.toLowerCase()];
    
    if (!langConfig) {
      throw new Error(`Unsupported language: ${language}`);
    }

    const startTime = Date.now();

    // Call Piston API
    const response = await axios.post(
      `${PISTON_API}/execute`,
      {
        language: langConfig.language,
        version: langConfig.version,
        files: [
          {
            name: getFileName(language),
            content: code,
          },
        ],
        stdin: input,
        args: [],
        compile_timeout: 10000, // 10 seconds
        run_timeout: 5000, // 5 seconds
        compile_memory_limit: -1,
        run_memory_limit: -1,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 15000, // 15 second timeout for the entire request
      }
    );

    const executionTime = Date.now() - startTime;

    const { run, compile } = response.data;

    // Check for compilation errors
    if (compile && compile.stderr) {
      return {
        output: "",
        error: compile.stderr,
        executionTime,
        memoryUsed: 0,
        stderr: compile.stderr,
        stdout: compile.stdout || "",
      };
    }

    // Check for runtime errors
    if (run.code !== 0 && run.stderr) {
      return {
        output: run.stdout || "",
        error: run.stderr,
        executionTime,
        memoryUsed: 0,
        stderr: run.stderr,
        stdout: run.stdout || "",
      };
    }

    // Successful execution
    return {
      output: run.stdout || "",
      error: run.stderr || null,
      executionTime,
      memoryUsed: 0, // Piston doesn't provide memory info in response
      stderr: run.stderr || "",
      stdout: run.stdout || "",
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === "ECONNABORTED") {
        return {
          output: "",
          error: "Execution timeout - code took too long to run",
          executionTime: 0,
          memoryUsed: 0,
        };
      }
      return {
        output: "",
        error: error.response?.data?.message || error.message || "Code execution failed",
        executionTime: 0,
        memoryUsed: 0,
      };
    }
    return {
      output: "",
      error: error instanceof Error ? error.message : "Unknown execution error",
      executionTime: 0,
      memoryUsed: 0,
    };
  }
}

/**
 * Get appropriate file name based on language
 */
function getFileName(language: string): string {
  const fileNames: Record<string, string> = {
    python: "main.py",
    javascript: "main.js",
    java: "Main.java",
    cpp: "main.cpp",
    csharp: "Main.cs",
    go: "main.go",
    rust: "main.rs",
  };
  return fileNames[language.toLowerCase()] || "main.txt";
}

/**
 * Get list of supported languages from Piston
 */
export async function getSupportedLanguages(): Promise<Array<{ language: string; version: string }>> {
  try {
    const response = await axios.get(`${PISTON_API}/runtimes`);
    return response.data;
  } catch (error) {
    console.error("Failed to fetch supported languages:", error);
    return [];
  }
}

/**
 * Validate if a language is supported
 */
export function isLanguageSupported(language: string): boolean {
  return language.toLowerCase() in LANGUAGE_MAP;
}
