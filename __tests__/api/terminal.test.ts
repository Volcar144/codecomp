/**
 * Tests for Terminal API Routes
 */

import { NextRequest } from "next/server";

// Create mock piston client
const mockPistonClient = {
  run: jest.fn(),
  runInteractive: jest.fn(),
  sendInput: jest.fn(),
  destroySession: jest.fn(),
  getSession: jest.fn(),
  getAllSessions: jest.fn(),
  getRuntimes: jest.fn(),
};

// Mock modules before imports
jest.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: jest.fn(),
    },
  },
}));

jest.mock("@/lib/piston-client", () => ({
  getPistonClient: jest.fn(() => mockPistonClient),
}));

jest.mock("next/headers", () => ({
  headers: jest.fn(() => Promise.resolve(new Headers())),
}));

import { GET, POST } from "@/app/api/terminal/route";
import { auth } from "@/lib/auth";

describe("Terminal API Routes", () => {
  const mockSession = {
    user: {
      id: "user-123",
      name: "Test User",
      email: "test@example.com",
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/terminal", () => {
    it("should return 401 if not authenticated", async () => {
      (auth.api.getSession as unknown as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/terminal");
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it("should return runtimes and sessions for authenticated user", async () => {
      (auth.api.getSession as unknown as jest.Mock).mockResolvedValue(mockSession);

      const mockRuntimes = [
        { language: "python", version: "3.10.0" },
        { language: "javascript", version: "18.15.0" },
      ];
      (mockPistonClient.getRuntimes as jest.Mock).mockResolvedValue(mockRuntimes);

      const request = new NextRequest("http://localhost:3000/api/terminal");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.runtimes).toEqual(mockRuntimes);
      expect(data.sessions).toEqual([]);
    });
  });

  describe("POST /api/terminal", () => {
    it("should return 401 if not authenticated", async () => {
      (auth.api.getSession as unknown as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/terminal", {
        method: "POST",
        body: JSON.stringify({ action: "execute" }),
      });
      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it("should execute code successfully", async () => {
      (auth.api.getSession as unknown as jest.Mock).mockResolvedValue(mockSession);

      const mockResult = {
        run: {
          stdout: "Hello, World!",
          stderr: "",
          code: 0,
        },
      };
      (mockPistonClient.run as jest.Mock).mockResolvedValue(mockResult);

      const request = new NextRequest("http://localhost:3000/api/terminal", {
        method: "POST",
        body: JSON.stringify({
          action: "execute",
          code: 'print("Hello, World!")',
          language: "python",
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.output).toBe("Hello, World!");
      expect(data.exitCode).toBe(0);
    });

    it("should return 400 for execute without code", async () => {
      (auth.api.getSession as unknown as jest.Mock).mockResolvedValue(mockSession);

      const request = new NextRequest("http://localhost:3000/api/terminal", {
        method: "POST",
        body: JSON.stringify({
          action: "execute",
          language: "python",
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Code and language are required");
    });

    it("should create interactive session", async () => {
      (auth.api.getSession as unknown as jest.Mock).mockResolvedValue(mockSession);

      const sessionId = "session_12345";
      (mockPistonClient.runInteractive as jest.Mock).mockResolvedValue(sessionId);

      const request = new NextRequest("http://localhost:3000/api/terminal", {
        method: "POST",
        body: JSON.stringify({
          action: "create",
          code: "",
          language: "python",
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.sessionId).toBe(sessionId);
      expect(data.message).toBe("Session created");
    });

    it("should return 400 for create without language", async () => {
      (auth.api.getSession as unknown as jest.Mock).mockResolvedValue(mockSession);

      const request = new NextRequest("http://localhost:3000/api/terminal", {
        method: "POST",
        body: JSON.stringify({
          action: "create",
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Language is required");
    });

    it("should destroy session", async () => {
      (auth.api.getSession as unknown as jest.Mock).mockResolvedValue(mockSession);

      const request = new NextRequest("http://localhost:3000/api/terminal", {
        method: "POST",
        body: JSON.stringify({
          action: "destroy",
          sessionId: "session_12345",
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it("should return 400 for invalid action", async () => {
      (auth.api.getSession as unknown as jest.Mock).mockResolvedValue(mockSession);

      const request = new NextRequest("http://localhost:3000/api/terminal", {
        method: "POST",
        body: JSON.stringify({
          action: "invalid",
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("Invalid action");
    });
  });
});
