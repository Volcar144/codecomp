/**
 * Mock for GitHub Client
 */

export const mockGitHubClient = {
  getUser: jest.fn(),
  listRepos: jest.fn(),
  getRepo: jest.fn(),
  pathExists: jest.fn(),
  getFileContent: jest.fn(),
  listDirectory: jest.fn(),
  createOrUpdateFile: jest.fn(),
  deleteFile: jest.fn(),
  createMultipleFiles: jest.fn(),
  createArenaDirectory: jest.fn(),
  getArenaFiles: jest.fn(),
  saveArenaFile: jest.fn(),
};

export const getGitHubAuthUrl = jest.fn((state: string) => {
  return `https://github.com/login/oauth/authorize?client_id=test&state=${state}`;
});

export const exchangeCodeForToken = jest.fn();

export const createGitHubClient = jest.fn(() => mockGitHubClient);

export class GitHubClient {
  constructor() {
    return mockGitHubClient;
  }
}

// Reset function for tests
export const resetGitHubMock = () => {
  mockGitHubClient.getUser.mockReset();
  mockGitHubClient.listRepos.mockReset();
  mockGitHubClient.getRepo.mockReset();
  mockGitHubClient.pathExists.mockReset();
  mockGitHubClient.getFileContent.mockReset();
  mockGitHubClient.listDirectory.mockReset();
  mockGitHubClient.createOrUpdateFile.mockReset();
  mockGitHubClient.deleteFile.mockReset();
  mockGitHubClient.createMultipleFiles.mockReset();
  mockGitHubClient.createArenaDirectory.mockReset();
  mockGitHubClient.getArenaFiles.mockReset();
  mockGitHubClient.saveArenaFile.mockReset();
  getGitHubAuthUrl.mockClear();
  exchangeCodeForToken.mockReset();
  createGitHubClient.mockClear();
};
