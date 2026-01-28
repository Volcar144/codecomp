/**
 * Tests for Arena API Routes
 */

import { NextRequest } from "next/server";

// Mock modules before imports
jest.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: jest.fn(),
    },
  },
}));

jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn(),
    })),
  },
}));

jest.mock("next/headers", () => ({
  headers: jest.fn(() => Promise.resolve(new Headers())),
}));

import { GET, POST } from "@/app/api/arenas/route";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

describe("Arena API Routes", () => {
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

  describe("GET /api/arenas", () => {
    it("should return public arenas for unauthenticated users", async () => {
      (auth.api.getSession as unknown as jest.Mock).mockResolvedValue(null);

      const mockArenas = [
        {
          id: "arena-1",
          title: "Public Arena",
          status: "active",
          is_public: true,
        },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockArenas, error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const request = new NextRequest("http://localhost:3000/api/arenas");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.arenas).toEqual(mockArenas);
    });

    it("should return 401 for my arenas filter when not authenticated", async () => {
      (auth.api.getSession as unknown as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/arenas?my=true");
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("Unauthorized");
    });

    it("should return arenas for authenticated user", async () => {
      (auth.api.getSession as unknown as jest.Mock).mockResolvedValue(mockSession);

      const mockArenas = [
        {
          id: "arena-1",
          title: "Test Arena",
          status: "active",
          is_public: true,
        },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockArenas, error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const request = new NextRequest("http://localhost:3000/api/arenas");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.arenas).toEqual(mockArenas);
    });

    it("should filter by my arenas", async () => {
      (auth.api.getSession as unknown as jest.Mock).mockResolvedValue(mockSession);

      const mockArenas = [{ id: "arena-1", title: "My Arena", creator_id: "user-123" }];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockArenas, error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const request = new NextRequest("http://localhost:3000/api/arenas?my=true");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.arenas).toEqual(mockArenas);
    });
  });

  describe("POST /api/arenas", () => {
    it("should return 401 if not authenticated", async () => {
      (auth.api.getSession as unknown as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/arenas", {
        method: "POST",
        body: JSON.stringify({ title: "Test Arena" }),
      });
      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it("should return 400 if title is missing", async () => {
      (auth.api.getSession as unknown as jest.Mock).mockResolvedValue(mockSession);

      const request = new NextRequest("http://localhost:3000/api/arenas", {
        method: "POST",
        body: JSON.stringify({ description: "No title" }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Title is required");
    });

    it("should return 400 if github_repo is invalid", async () => {
      (auth.api.getSession as unknown as jest.Mock).mockResolvedValue(mockSession);

      const request = new NextRequest("http://localhost:3000/api/arenas", {
        method: "POST",
        body: JSON.stringify({ title: "Test Arena", github_repo: "invalid" }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Valid GitHub repository (owner/repo) is required");
    });

    it("should create arena successfully", async () => {
      (auth.api.getSession as unknown as jest.Mock).mockResolvedValue(mockSession);

      const mockArena = {
        id: "arena-1",
        title: "Test Arena",
        github_repo: "owner/repo",
        creator_id: "user-123",
      };

      const mockQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockArena, error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const request = new NextRequest("http://localhost:3000/api/arenas", {
        method: "POST",
        body: JSON.stringify({
          title: "Test Arena",
          github_repo: "owner/repo",
          description: "A test arena",
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.arena).toEqual(mockArena);
    });

    it("should generate invite code for private arenas", async () => {
      (auth.api.getSession as unknown as jest.Mock).mockResolvedValue(mockSession);

      const mockArena = {
        id: "arena-1",
        title: "Private Arena",
        is_public: false,
        invite_code: "ABCD1234",
      };

      const mockQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockArena, error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const request = new NextRequest("http://localhost:3000/api/arenas", {
        method: "POST",
        body: JSON.stringify({
          title: "Private Arena",
          github_repo: "owner/repo",
          is_public: false,
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(mockQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          is_public: false,
          invite_code: expect.any(String),
        })
      );
    });
  });
});
