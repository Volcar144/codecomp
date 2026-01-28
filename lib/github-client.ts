/**
 * GitHub API Client for Arena Repository Integration
 * Handles OAuth app authentication and repository operations
 */

import { Octokit } from "@octokit/rest";

// Types
export interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  default_branch: string;
  owner: {
    login: string;
    id: number;
  };
}

export interface GitHubFile {
  path: string;
  content: string;
  sha?: string;
}

export interface CommitResult {
  sha: string;
  html_url: string;
  message: string;
}

export interface GitHubTokens {
  access_token: string;
  token_type: string;
  scope: string;
  refresh_token?: string;
  expires_in?: number;
}

// GitHub OAuth App configuration
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || "";
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || "";
const GITHUB_APP_REDIRECT_URI =
  process.env.NEXT_PUBLIC_APP_URL + "/api/github/callback";

/**
 * Generate GitHub OAuth authorization URL
 */
export function getGitHubAuthUrl(state: string, scopes: string[] = []): string {
  const defaultScopes = ["repo", "read:user", "user:email"];
  const allScopes = [...new Set([...defaultScopes, ...scopes])];

  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: GITHUB_APP_REDIRECT_URI,
    scope: allScopes.join(" "),
    state,
    allow_signup: "true",
  });

  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

/**
 * Exchange OAuth code for access token
 */
export async function exchangeCodeForToken(
  code: string
): Promise<GitHubTokens> {
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: GITHUB_APP_REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    throw new Error(`GitHub OAuth failed: ${response.statusText}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(`GitHub OAuth error: ${data.error_description}`);
  }

  return data;
}

/**
 * GitHub client for repository operations
 */
export class GitHubClient {
  private octokit: Octokit;
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
    this.octokit = new Octokit({ auth: accessToken });
  }

  /**
   * Get authenticated user info
   */
  async getUser(): Promise<GitHubUser> {
    const { data } = await this.octokit.users.getAuthenticated();
    return {
      id: data.id,
      login: data.login,
      name: data.name,
      email: data.email,
      avatar_url: data.avatar_url,
    };
  }

  /**
   * List repositories the user has access to
   */
  async listRepos(
    type: "all" | "owner" | "member" = "all"
  ): Promise<GitHubRepo[]> {
    const { data } = await this.octokit.repos.listForAuthenticatedUser({
      type,
      sort: "updated",
      per_page: 100,
    });

    return data.map((repo) => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      private: repo.private,
      html_url: repo.html_url,
      default_branch: repo.default_branch,
      owner: {
        login: repo.owner.login,
        id: repo.owner.id,
      },
    }));
  }

  /**
   * Get a specific repository
   */
  async getRepo(owner: string, repo: string): Promise<GitHubRepo> {
    const { data } = await this.octokit.repos.get({ owner, repo });
    return {
      id: data.id,
      name: data.name,
      full_name: data.full_name,
      private: data.private,
      html_url: data.html_url,
      default_branch: data.default_branch,
      owner: {
        login: data.owner.login,
        id: data.owner.id,
      },
    };
  }

  /**
   * Check if a path exists in the repository
   */
  async pathExists(
    owner: string,
    repo: string,
    path: string
  ): Promise<boolean> {
    try {
      await this.octokit.repos.getContent({ owner, repo, path });
      return true;
    } catch (error: unknown) {
      if (error && typeof error === "object" && "status" in error && error.status === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get file content from repository
   */
  async getFileContent(
    owner: string,
    repo: string,
    path: string
  ): Promise<{ content: string; sha: string } | null> {
    try {
      const { data } = await this.octokit.repos.getContent({
        owner,
        repo,
        path,
      });

      if (Array.isArray(data) || data.type !== "file") {
        return null;
      }

      const content = Buffer.from(data.content, "base64").toString("utf-8");
      return { content, sha: data.sha };
    } catch (error: unknown) {
      if (error && typeof error === "object" && "status" in error && error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * List directory contents
   */
  async listDirectory(
    owner: string,
    repo: string,
    path: string = ""
  ): Promise<Array<{ name: string; path: string; type: "file" | "dir"; sha: string }>> {
    try {
      const { data } = await this.octokit.repos.getContent({
        owner,
        repo,
        path,
      });

      if (!Array.isArray(data)) {
        return [];
      }

      return data.map((item) => ({
        name: item.name,
        path: item.path,
        type: item.type as "file" | "dir",
        sha: item.sha,
      }));
    } catch (error: unknown) {
      if (error && typeof error === "object" && "status" in error && error.status === 404) {
        return [];
      }
      throw error;
    }
  }

  /**
   * Create or update a file in the repository
   */
  async createOrUpdateFile(
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string,
    sha?: string
  ): Promise<CommitResult> {
    // Get existing file SHA if not provided
    if (!sha) {
      const existing = await this.getFileContent(owner, repo, path);
      sha = existing?.sha;
    }

    const { data } = await this.octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message,
      content: Buffer.from(content).toString("base64"),
      sha,
    });

    return {
      sha: data.commit.sha || "",
      html_url: data.commit.html_url || "",
      message: data.commit.message || message,
    };
  }

  /**
   * Delete a file from the repository
   */
  async deleteFile(
    owner: string,
    repo: string,
    path: string,
    message: string
  ): Promise<CommitResult> {
    const existing = await this.getFileContent(owner, repo, path);
    if (!existing) {
      throw new Error(`File not found: ${path}`);
    }

    const { data } = await this.octokit.repos.deleteFile({
      owner,
      repo,
      path,
      message,
      sha: existing.sha,
    });

    return {
      sha: data.commit.sha || "",
      html_url: data.commit.html_url || "",
      message: data.commit.message || message,
    };
  }

  /**
   * Create multiple files in a single commit
   */
  async createMultipleFiles(
    owner: string,
    repo: string,
    files: GitHubFile[],
    message: string,
    branch?: string
  ): Promise<CommitResult> {
    // Get the latest commit SHA on the branch
    const { data: refData } = await this.octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${branch || "main"}`,
    });
    const latestCommitSha = refData.object.sha;

    // Get the tree SHA from the latest commit
    const { data: commitData } = await this.octokit.git.getCommit({
      owner,
      repo,
      commit_sha: latestCommitSha,
    });
    const baseTreeSha = commitData.tree.sha;

    // Create blobs for each file
    const blobs = await Promise.all(
      files.map(async (file) => {
        const { data: blob } = await this.octokit.git.createBlob({
          owner,
          repo,
          content: Buffer.from(file.content).toString("base64"),
          encoding: "base64",
        });
        return { path: file.path, sha: blob.sha };
      })
    );

    // Create a new tree
    const { data: newTree } = await this.octokit.git.createTree({
      owner,
      repo,
      base_tree: baseTreeSha,
      tree: blobs.map((blob) => ({
        path: blob.path,
        mode: "100644" as const,
        type: "blob" as const,
        sha: blob.sha,
      })),
    });

    // Create a new commit
    const { data: newCommit } = await this.octokit.git.createCommit({
      owner,
      repo,
      message,
      tree: newTree.sha,
      parents: [latestCommitSha],
    });

    // Update the reference
    await this.octokit.git.updateRef({
      owner,
      repo,
      ref: `heads/${branch || "main"}`,
      sha: newCommit.sha,
    });

    return {
      sha: newCommit.sha,
      html_url: newCommit.html_url,
      message: newCommit.message,
    };
  }

  /**
   * Create a directory structure for an arena participant
   */
  async createArenaDirectory(
    owner: string,
    repo: string,
    arenaId: string,
    username: string
  ): Promise<CommitResult> {
    const basePath = `arenas/${arenaId}/${username}`;
    const readmeContent = `# ${username}'s Submission

Arena ID: ${arenaId}
Created: ${new Date().toISOString()}

## Files
Add your code files to this directory.
`;

    return this.createOrUpdateFile(
      owner,
      repo,
      `${basePath}/README.md`,
      readmeContent,
      `Initialize arena directory for ${username}`
    );
  }

  /**
   * Get all files for a participant in an arena
   */
  async getArenaFiles(
    owner: string,
    repo: string,
    arenaId: string,
    username: string
  ): Promise<Array<{ name: string; path: string; content?: string }>> {
    const basePath = `arenas/${arenaId}/${username}`;
    const files = await this.listDirectory(owner, repo, basePath);

    const results = await Promise.all(
      files
        .filter((f) => f.type === "file")
        .map(async (file) => {
          const content = await this.getFileContent(owner, repo, file.path);
          return {
            name: file.name,
            path: file.path,
            content: content?.content,
          };
        })
    );

    return results;
  }

  /**
   * Save a file for a participant in an arena
   */
  async saveArenaFile(
    owner: string,
    repo: string,
    arenaId: string,
    username: string,
    filename: string,
    content: string
  ): Promise<CommitResult> {
    const path = `arenas/${arenaId}/${username}/${filename}`;
    return this.createOrUpdateFile(
      owner,
      repo,
      path,
      content,
      `Update ${filename} by ${username}`
    );
  }
}

/**
 * Create GitHub client from stored access token
 */
export function createGitHubClient(accessToken: string): GitHubClient {
  return new GitHubClient(accessToken);
}
