/**
 * Tests for Piston Client
 */

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

import { PistonClient, PISTON_LANGUAGE_MAP, getPistonClient } from "@/lib/piston-client";

describe("Piston Client", () => {
  let client: PistonClient;

  beforeEach(() => {
    client = new PistonClient({ baseUrl: "http://localhost:2000" });
    mockFetch.mockReset();
  });

  describe("Constructor", () => {
    it("should use default URL if not provided", () => {
      const defaultClient = new PistonClient();
      expect(defaultClient).toBeDefined();
    });

    it("should use custom URL if provided", () => {
      const customClient = new PistonClient({ baseUrl: "http://custom:3000" });
      expect(customClient).toBeDefined();
    });
  });

  describe("getRuntimes", () => {
    it("should fetch runtimes from API", async () => {
      const mockRuntimes = [
        { language: "python", version: "3.10.0", aliases: ["py"] },
        { language: "javascript", version: "18.15.0", aliases: ["js"] },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockRuntimes),
      });

      const runtimes = await client.getRuntimes();

      expect(mockFetch).toHaveBeenCalledWith("http://localhost:2000/runtimes");
      expect(runtimes).toEqual(mockRuntimes);
    });

    it("should throw error if fetch fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Internal Server Error",
      });

      await expect(client.getRuntimes()).rejects.toThrow("Failed to fetch runtimes");
    });
  });

  describe("validateInstance", () => {
    it("should return true if API returns runtimes", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ language: "python", version: "3.10.0" }]),
      });

      const isValid = await client.validateInstance();
      expect(isValid).toBe(true);
    });

    it("should return false if API fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Not Found",
      });

      const isValid = await client.validateInstance();
      expect(isValid).toBe(false);
    });

    it("should return false if API returns empty array", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const isValid = await client.validateInstance();
      expect(isValid).toBe(false);
    });
  });

  describe("run", () => {
    it("should execute code and return result", async () => {
      const mockResult = {
        language: "python",
        version: "3.10.0",
        run: {
          stdout: "Hello, World!",
          stderr: "",
          code: 0,
          signal: null,
          output: "Hello, World!",
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResult),
      });

      const result = await client.run({
        language: "python",
        version: "*",
        code: 'print("Hello, World!")',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:2000/execute",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
      );
      expect(result).toEqual(mockResult);
    });

    it("should resolve language aliases", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ run: { stdout: "", stderr: "", code: 0 } }),
      });

      await client.run({
        language: "py", // alias for python
        version: "*",
        code: 'print("test")',
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.language).toBe("python");
    });

    it("should include stdin in request", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ run: { stdout: "input", stderr: "", code: 0 } }),
      });

      await client.run({
        language: "python",
        version: "*",
        code: "print(input())",
        stdin: "test input",
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.stdin).toBe("test input");
    });

    it("should throw error if execution fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: () => Promise.resolve("Execution timeout"),
      });

      await expect(
        client.run({
          language: "python",
          version: "*",
          code: "while True: pass",
        })
      ).rejects.toThrow("Piston execution failed");
    });
  });

  describe("runInteractive", () => {
    it("should create interactive session and return session ID", async () => {
      const mockResult = {
        run: { stdout: ">>> ", stderr: "", code: 0 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResult),
      });

      const sessionId = await client.runInteractive("", "python");

      expect(sessionId).toMatch(/^session_\d+_[a-z0-9]+$/);
    });

    it("should emit session events", async () => {
      const sessionCreatedHandler = jest.fn();
      const sessionReadyHandler = jest.fn();

      client.on("sessionCreated", sessionCreatedHandler);
      client.on("sessionReady", sessionReadyHandler);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ run: { stdout: "", stderr: "", code: 0 } }),
      });

      await client.runInteractive("", "python");

      expect(sessionCreatedHandler).toHaveBeenCalled();
      expect(sessionReadyHandler).toHaveBeenCalled();
    });
  });

  describe("sendInput", () => {
    it("should throw error for non-existent session", async () => {
      await expect(client.sendInput("invalid-session", "test")).rejects.toThrow(
        "Session invalid-session not found"
      );
    });
  });

  describe("destroySession", () => {
    it("should remove session and emit event", async () => {
      const destroyHandler = jest.fn();
      client.on("sessionDestroyed", destroyHandler);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ run: { stdout: "", stderr: "", code: 0 } }),
      });

      const sessionId = await client.runInteractive("", "python");
      client.destroySession(sessionId);

      expect(destroyHandler).toHaveBeenCalledWith(sessionId);
      expect(client.getSession(sessionId)).toBeUndefined();
    });

    it("should handle destroying non-existent session gracefully", () => {
      expect(() => client.destroySession("non-existent")).not.toThrow();
    });
  });

  describe("getSession", () => {
    it("should return undefined for non-existent session", () => {
      expect(client.getSession("non-existent")).toBeUndefined();
    });
  });

  describe("getAllSessions", () => {
    it("should return empty array when no sessions", () => {
      expect(client.getAllSessions()).toEqual([]);
    });

    it("should return all active sessions", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ run: { stdout: "", stderr: "", code: 0 } }),
      });

      await client.runInteractive("", "python");
      await client.runInteractive("", "javascript");

      const sessions = client.getAllSessions();
      expect(sessions.length).toBe(2);
    });
  });

  describe("installPackage", () => {
    it("should install package successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await expect(
        client.installPackage({ language: "python", version: "3.10.0" })
      ).resolves.not.toThrow();

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:2000/packages",
        expect.objectContaining({ method: "POST" })
      );
    });

    it("should throw error if install fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Package not found",
      });

      await expect(
        client.installPackage({ language: "unknown", version: "1.0.0" })
      ).rejects.toThrow("Failed to install package");
    });
  });

  describe("installRuntime", () => {
    it("should install runtime using resolved language info", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await client.installRuntime("py");

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.language).toBe("python");
    });
  });

  describe("PISTON_LANGUAGE_MAP", () => {
    it("should contain common languages", () => {
      expect(PISTON_LANGUAGE_MAP.python).toBeDefined();
      expect(PISTON_LANGUAGE_MAP.javascript).toBeDefined();
      expect(PISTON_LANGUAGE_MAP.java).toBeDefined();
      expect(PISTON_LANGUAGE_MAP.cpp).toBeDefined();
    });

    it("should have aliases for languages", () => {
      expect(PISTON_LANGUAGE_MAP.python.aliases).toContain("py");
      expect(PISTON_LANGUAGE_MAP.javascript.aliases).toContain("js");
    });
  });

  describe("getPistonClient", () => {
    it("should return singleton instance", () => {
      const client1 = getPistonClient();
      const client2 = getPistonClient();
      expect(client1).toBe(client2);
    });
  });
});
