/**
 * Tests for Arena Join API Routes
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
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    })),
  },
}));

jest.mock("next/headers", () => ({
  headers: jest.fn(() => Promise.resolve(new Headers())),
}));

import { POST, DELETE } from "@/app/api/arenas/[id]/join/route";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

describe("Arena Join API Routes", () => {
  const mockSession = {
    user: {
      id: "user-123",
      name: "Test User",
      email: "test@example.com",
    },
  };

  const mockParams = Promise.resolve({ id: "arena-123" });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/arenas/[id]/join", () => {
    it("should return 401 if not authenticated", async () => {
      (auth.api.getSession as unknown as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/arenas/arena-123/join", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const response = await POST(request, { params: mockParams });

      expect(response.status).toBe(401);
    });

    it("should return 404 if arena not found", async () => {
      (auth.api.getSession as unknown as jest.Mock).mockResolvedValue(mockSession);

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: "Not found" } }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const request = new NextRequest("http://localhost:3000/api/arenas/arena-123/join", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const response = await POST(request, { params: mockParams });

      expect(response.status).toBe(404);
    });

    it("should return 403 for private arena without invite code", async () => {
      (auth.api.getSession as unknown as jest.Mock).mockResolvedValue(mockSession);

      const mockArena = {
        id: "arena-123",
        is_public: false,
        invite_code: "SECRET123",
        status: "active",
      };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockArena, error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const request = new NextRequest("http://localhost:3000/api/arenas/arena-123/join", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const response = await POST(request, { params: mockParams });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe("Invalid invite code");
    });

    it("should allow joining public arena", async () => {
      (auth.api.getSession as unknown as jest.Mock).mockResolvedValue(mockSession);

      const mockArena = {
        id: "arena-123",
        is_public: true,
        status: "active",
        arena_participants: [{ count: 0 }],
      };

      const mockParticipant = {
        id: "participant-1",
        arena_id: "arena-123",
        user_id: "user-123",
        directory_path: "arenas/arena-123/Test_User",
      };

      // First call for arena fetch
      const arenaQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockArena, error: null }),
      };

      // Second call to check existing participant - returns null
      const checkQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      };

      // Third call to insert participant
      const insertQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockParticipant, error: null }),
      };

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(arenaQuery)
        .mockReturnValueOnce(checkQuery)
        .mockReturnValueOnce(insertQuery);

      const request = new NextRequest("http://localhost:3000/api/arenas/arena-123/join", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const response = await POST(request, { params: mockParams });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.participant).toEqual(mockParticipant);
    });

    it("should allow joining private arena with correct invite code", async () => {
      (auth.api.getSession as unknown as jest.Mock).mockResolvedValue(mockSession);

      const mockArena = {
        id: "arena-123",
        is_public: false,
        invite_code: "SECRET123",
        status: "active",
        arena_participants: [{ count: 0 }],
      };

      const mockParticipant = {
        id: "participant-1",
        arena_id: "arena-123",
        user_id: "user-123",
      };

      const arenaQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockArena, error: null }),
      };

      const checkQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      };

      const insertQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockParticipant, error: null }),
      };

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(arenaQuery)
        .mockReturnValueOnce(checkQuery)
        .mockReturnValueOnce(insertQuery);

      const request = new NextRequest("http://localhost:3000/api/arenas/arena-123/join", {
        method: "POST",
        body: JSON.stringify({ invite_code: "SECRET123" }),
      });
      const response = await POST(request, { params: mockParams });

      expect(response.status).toBe(200);
    });

    it("should return 400 if already participating", async () => {
      (auth.api.getSession as unknown as jest.Mock).mockResolvedValue(mockSession);

      const mockArena = {
        id: "arena-123",
        is_public: true,
        status: "active",
        arena_participants: [{ count: 1 }],
      };

      const existingParticipant = {
        id: "participant-1",
        user_id: "user-123",
      };

      const arenaQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockArena, error: null }),
      };

      const checkQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: existingParticipant, error: null }),
      };

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(arenaQuery)
        .mockReturnValueOnce(checkQuery);

      const request = new NextRequest("http://localhost:3000/api/arenas/arena-123/join", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const response = await POST(request, { params: mockParams });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Already participating in this arena");
    });
  });

  describe("DELETE /api/arenas/[id]/join", () => {
    it("should return 401 if not authenticated", async () => {
      (auth.api.getSession as unknown as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/arenas/arena-123/join", {
        method: "DELETE",
      });
      const response = await DELETE(request, { params: mockParams });

      expect(response.status).toBe(401);
    });

    it("should allow leaving arena", async () => {
      (auth.api.getSession as unknown as jest.Mock).mockResolvedValue(mockSession);

      const mockQuery = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockImplementation(function(this: typeof mockQuery) {
          return this;
        }),
      };
      // Make the final eq call resolve
      mockQuery.eq.mockImplementation(function(this: typeof mockQuery) {
        return Object.assign({}, this, {
          eq: jest.fn().mockResolvedValue({ error: null }),
        });
      });
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const request = new NextRequest("http://localhost:3000/api/arenas/arena-123/join", {
        method: "DELETE",
      });
      const response = await DELETE(request, { params: mockParams });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe("Successfully left the arena");
    });
  });
});
