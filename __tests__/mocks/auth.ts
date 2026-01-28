// Mock auth module
export const mockGetSession = jest.fn();

export const mockAuth = {
  api: {
    getSession: mockGetSession,
  },
};

export const resetAuthMocks = () => {
  mockGetSession.mockClear();
};

// Helper to create a mock session
export const createMockSession = (userId: string = 'test-user-id', email: string = 'test@example.com') => ({
  user: {
    id: userId,
    email,
    name: 'Test User',
  },
  session: {
    id: 'test-session-id',
    userId,
    token: 'test-token',
    expiresAt: new Date(Date.now() + 86400000), // 24 hours from now
  },
});
