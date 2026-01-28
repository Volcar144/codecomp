/**
 * Tests for GitHub Client
 */

// Create mock functions
const mockGetAuthenticated = jest.fn();
const mockListForAuthenticatedUser = jest.fn();
const mockGetRepo = jest.fn();
const mockGetContent = jest.fn();
const mockCreateOrUpdateFileContents = jest.fn();
const mockDeleteFile = jest.fn();
const mockGetRef = jest.fn();
const mockGetCommit = jest.fn();
const mockCreateBlob = jest.fn();
const mockCreateTree = jest.fn();
const mockCreateCommit = jest.fn();
const mockUpdateRef = jest.fn();

// Mock Octokit before importing
jest.mock("@octokit/rest", () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    users: {
      getAuthenticated: mockGetAuthenticated,
    },
    repos: {
      listForAuthenticatedUser: mockListForAuthenticatedUser,
      get: mockGetRepo,
      getContent: mockGetContent,
      createOrUpdateFileContents: mockCreateOrUpdateFileContents,
      deleteFile: mockDeleteFile,
    },
    git: {
      getRef: mockGetRef,
      getCommit: mockGetCommit,
      createBlob: mockCreateBlob,
      createTree: mockCreateTree,
      createCommit: mockCreateCommit,
      updateRef: mockUpdateRef,
    },
  })),
}));

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

import {
  GitHubClient,
  getGitHubAuthUrl,
  exchangeCodeForToken,
  createGitHubClient,
} from "@/lib/github-client";

describe("GitHub Client", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  describe("getGitHubAuthUrl", () => {
    it("should generate valid OAuth URL with state", () => {
      const url = getGitHubAuthUrl("test-state");

      expect(url).toContain("https://github.com/login/oauth/authorize");
      expect(url).toContain("state=test-state");
      expect(url).toContain("scope=");
    });

    it("should include default scopes", () => {
      const url = getGitHubAuthUrl("state");

      expect(url).toContain("repo");
      expect(url).toContain("read%3Auser");
      expect(url).toContain("user%3Aemail");
    });

    it("should include additional scopes when provided", () => {
      const url = getGitHubAuthUrl("state", ["workflow", "gist"]);

      expect(url).toContain("workflow");
      expect(url).toContain("gist");
    });
  });

  describe("exchangeCodeForToken", () => {
    it("should exchange code for access token", async () => {
      const mockTokens = {
        access_token: "gho_xxxx",
        token_type: "bearer",
        scope: "repo,user",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTokens),
      });

      const tokens = await exchangeCodeForToken("auth-code");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://github.com/login/oauth/access_token",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Accept: "application/json",
          }),
        })
      );
      expect(tokens).toEqual(mockTokens);
    });

    it("should throw error if OAuth fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            error: "bad_verification_code",
            error_description: "Invalid code",
          }),
      });

      await expect(exchangeCodeForToken("invalid-code")).rejects.toThrow(
        "Invalid code"
      );
    });

    it("should throw error if request fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Bad Request",
      });

      await expect(exchangeCodeForToken("code")).rejects.toThrow(
        "GitHub OAuth failed"
      );
    });
  });

  describe("GitHubClient", () => {
    let client: GitHubClient;

    beforeEach(() => {
      client = new GitHubClient("test-token");
      // Clear mocks
      mockGetAuthenticated.mockClear();
      mockListForAuthenticatedUser.mockClear();
      mockGetRepo.mockClear();
      mockGetContent.mockClear();
      mockCreateOrUpdateFileContents.mockClear();
      mockDeleteFile.mockClear();
    });

    describe("getUser", () => {
      it("should return authenticated user info", async () => {
        const mockUser = {
          id: 123,
          login: "testuser",
          name: "Test User",
          email: "test@example.com",
          avatar_url: "https://avatars.githubusercontent.com/u/123",
        };

        mockGetAuthenticated.mockResolvedValue({
          data: mockUser,
        });

        const user = await client.getUser();

        expect(user).toEqual(mockUser);
      });
    });

    describe("listRepos", () => {
      it("should list user repositories", async () => {
        const mockRepos = [
          {
            id: 1,
            name: "repo1",
            full_name: "user/repo1",
            private: false,
            html_url: "https://github.com/user/repo1",
            default_branch: "main",
            owner: { login: "user", id: 123 },
          },
        ];

        mockListForAuthenticatedUser.mockResolvedValue({
          data: mockRepos,
        });

        const repos = await client.listRepos();

        expect(repos).toHaveLength(1);
        expect(repos[0].full_name).toBe("user/repo1");
      });

      it("should support filtering by type", async () => {
        mockListForAuthenticatedUser.mockResolvedValue({
          data: [],
        });

        await client.listRepos("owner");

        expect(mockListForAuthenticatedUser).toHaveBeenCalledWith(
          expect.objectContaining({ type: "owner" })
        );
      });
    });

    describe("getRepo", () => {
      it("should get specific repository", async () => {
        const mockRepo = {
          id: 1,
          name: "repo1",
          full_name: "user/repo1",
          private: false,
          html_url: "https://github.com/user/repo1",
          default_branch: "main",
          owner: { login: "user", id: 123 },
        };

        mockGetRepo.mockResolvedValue({
          data: mockRepo,
        });

        const repo = await client.getRepo("user", "repo1");

        expect(repo.full_name).toBe("user/repo1");
      });
    });

    describe("pathExists", () => {
      it("should return true if path exists", async () => {
        mockGetContent.mockResolvedValue({
          data: { type: "file" },
        });

        const exists = await client.pathExists("user", "repo", "README.md");
        expect(exists).toBe(true);
      });

      it("should return false if path does not exist", async () => {
        mockGetContent.mockRejectedValue({ status: 404 });

        const exists = await client.pathExists("user", "repo", "nonexistent");
        expect(exists).toBe(false);
      });
    });

    describe("getFileContent", () => {
      it("should return file content and SHA", async () => {
        const content = Buffer.from("Hello, World!").toString("base64");
        mockGetContent.mockResolvedValue({
          data: { type: "file", content, sha: "abc123" },
        });

        const file = await client.getFileContent("user", "repo", "test.txt");

        expect(file?.content).toBe("Hello, World!");
        expect(file?.sha).toBe("abc123");
      });

      it("should return null if file not found", async () => {
        mockGetContent.mockRejectedValue({ status: 404 });

        const file = await client.getFileContent("user", "repo", "nonexistent");
        expect(file).toBeNull();
      });

      it("should return null for directories", async () => {
        mockGetContent.mockResolvedValue({
          data: [{ type: "dir" }],
        });

        const file = await client.getFileContent("user", "repo", "src");
        expect(file).toBeNull();
      });
    });

    describe("listDirectory", () => {
      it("should list directory contents", async () => {
        const mockContents = [
          { name: "file1.txt", path: "dir/file1.txt", type: "file", sha: "abc" },
          { name: "subdir", path: "dir/subdir", type: "dir", sha: "def" },
        ];

        mockGetContent.mockResolvedValue({
          data: mockContents,
        });

        const contents = await client.listDirectory("user", "repo", "dir");

        expect(contents).toHaveLength(2);
        expect(contents[0].type).toBe("file");
        expect(contents[1].type).toBe("dir");
      });

      it("should return empty array for non-existent directory", async () => {
        mockGetContent.mockRejectedValue({ status: 404 });

        const contents = await client.listDirectory("user", "repo", "nonexistent");
        expect(contents).toEqual([]);
      });
    });

    describe("createOrUpdateFile", () => {
      it("should create or update file", async () => {
        mockGetContent.mockRejectedValue({ status: 404 });
        mockCreateOrUpdateFileContents.mockResolvedValue({
          data: {
            commit: {
              sha: "newsha123",
              html_url: "https://github.com/user/repo/commit/newsha123",
              message: "Update file",
            },
          },
        });

        const result = await client.createOrUpdateFile(
          "user",
          "repo",
          "test.txt",
          "content",
          "Update file"
        );

        expect(result.sha).toBe("newsha123");
      });
    });

    describe("deleteFile", () => {
      it("should delete file", async () => {
        mockGetContent.mockResolvedValue({
          data: { type: "file", content: "", sha: "oldsha" },
        });

        mockDeleteFile.mockResolvedValue({
          data: {
            commit: {
              sha: "deletesha",
              html_url: "https://github.com/user/repo/commit/deletesha",
              message: "Delete file",
            },
          },
        });

        const result = await client.deleteFile(
          "user",
          "repo",
          "test.txt",
          "Delete file"
        );

        expect(result.sha).toBe("deletesha");
      });

      it("should throw error if file not found", async () => {
        mockGetContent.mockRejectedValue({ status: 404 });

        await expect(
          client.deleteFile("user", "repo", "nonexistent", "Delete")
        ).rejects.toThrow("File not found");
      });
    });

    describe("createArenaDirectory", () => {
      it("should create arena directory with README", async () => {
        mockGetContent.mockRejectedValue({ status: 404 });
        mockCreateOrUpdateFileContents.mockResolvedValue({
          data: {
            commit: { sha: "sha123", html_url: "", message: "" },
          },
        });

        const result = await client.createArenaDirectory(
          "user",
          "repo",
          "arena-1",
          "testuser"
        );

        expect(result.sha).toBe("sha123");
        expect(
          mockCreateOrUpdateFileContents
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            path: "arenas/arena-1/testuser/README.md",
          })
        );
      });
    });

    describe("saveArenaFile", () => {
      it("should save file in arena directory", async () => {
        mockGetContent.mockRejectedValue({ status: 404 });
        mockCreateOrUpdateFileContents.mockResolvedValue({
          data: {
            commit: { sha: "sha123", html_url: "", message: "" },
          },
        });

        const result = await client.saveArenaFile(
          "user",
          "repo",
          "arena-1",
          "testuser",
          "main.py",
          'print("Hello")'
        );

        expect(result.sha).toBe("sha123");
      });
    });
  });

  describe("createGitHubClient", () => {
    it("should create new GitHubClient instance", () => {
      const client = createGitHubClient("token");
      expect(client).toBeInstanceOf(GitHubClient);
    });
  });
});
