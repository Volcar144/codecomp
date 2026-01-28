/**
 * Tests for GitHub API Routes
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
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    })),
  },
}));

jest.mock("@/lib/github-client", () => ({
  getGitHubAuthUrl: jest.fn((state: string) => `https://github.com/oauth?state=${state}`),
  createGitHubClient: jest.fn(),
}));

jest.mock("next/headers", () => ({
  headers: jest.fn(() => Promise.resolve(new Headers())),
}));

import { GET as getRepos } from "@/app/api/github/repos/route";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { createGitHubClient } from "@/lib/github-client";

describe("GitHub API Routes", () => {
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

  describe("GET /api/github/repos", () => {
    it("should return 401 if not authenticated", async () => {
      (auth.api.getSession as unknown as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/github/repos");
      const response = await getRepos(request);

      expect(response.status).toBe(401);
    });

    it("should return 403 if GitHub not connected", async () => {
      (auth.api.getSession as unknown as jest.Mock).mockResolvedValue(mockSession);

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const request = new NextRequest("http://localhost:3000/api/github/repos");
      const response = await getRepos(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.connected).toBe(false);
    });

    it("should return repos for connected user", async () => {
      (auth.api.getSession as unknown as jest.Mock).mockResolvedValue(mockSession);

      const tokenData = {
        access_token: "github_token",
        expires_at: new Date(Date.now() + 3600000).toISOString(),
      };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: tokenData, error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const mockRepos = [
        { id: 1, name: "repo1", full_name: "user/repo1" },
        { id: 2, name: "repo2", full_name: "user/repo2" },
      ];

      const mockGitHubClient = {
        listRepos: jest.fn().mockResolvedValue(mockRepos),
      };
      (createGitHubClient as jest.Mock).mockReturnValue(mockGitHubClient);

      const request = new NextRequest("http://localhost:3000/api/github/repos");
      const response = await getRepos(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.repos).toEqual(mockRepos);
      expect(data.connected).toBe(true);
    });

    it("should return 403 if token is expired", async () => {
      (auth.api.getSession as unknown as jest.Mock).mockResolvedValue(mockSession);

      const tokenData = {
        access_token: "github_token",
        expires_at: new Date(Date.now() - 3600000).toISOString(), // Expired
      };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: tokenData, error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const request = new NextRequest("http://localhost:3000/api/github/repos");
      const response = await getRepos(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain("expired");
    });
  });
});
