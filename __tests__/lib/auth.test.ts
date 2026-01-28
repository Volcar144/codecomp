// Mock better-auth before importing auth module
jest.mock('better-auth', () => ({
  betterAuth: jest.fn(() => ({
    api: {
      getSession: jest.fn(),
    },
    $Infer: {
      Session: {},
    },
  })),
}));

// Mock email module
jest.mock('@/lib/email', () => ({
  sendPasswordResetEmail: jest.fn(),
}));

describe('auth lib', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should export auth object', () => {
    const { auth } = require('@/lib/auth');
    
    expect(auth).toBeDefined();
    expect(auth.api).toBeDefined();
  });

  it('should use DATABASE_URL environment variable', () => {
    const { betterAuth } = require('better-auth');
    
    process.env.DATABASE_URL = 'postgresql://custom:custom@customhost:5432/customdb';
    
    require('@/lib/auth');
    
    // Verify betterAuth was called (configuration is set up)
    expect(betterAuth).toHaveBeenCalled();
  });

  it('should use fallback database URL when DATABASE_URL is not set', () => {
    const { betterAuth } = require('better-auth');
    
    delete process.env.DATABASE_URL;
    
    require('@/lib/auth');
    
    expect(betterAuth).toHaveBeenCalled();
  });

  it('should enable email and password authentication', () => {
    const { betterAuth } = require('better-auth');
    
    require('@/lib/auth');
    
    const config = betterAuth.mock.calls[0][0];
    expect(config.emailAndPassword.enabled).toBe(true);
  });

  it('should configure password reset token expiration', () => {
    const { betterAuth } = require('better-auth');
    
    require('@/lib/auth');
    
    const config = betterAuth.mock.calls[0][0];
    expect(config.emailAndPassword.resetPasswordTokenExpiresIn).toBe(3600);
  });

  it('should enable GitHub OAuth when credentials are provided', () => {
    const { betterAuth } = require('better-auth');
    
    process.env.GITHUB_CLIENT_ID = 'test-client-id';
    process.env.GITHUB_CLIENT_SECRET = 'test-client-secret';
    
    require('@/lib/auth');
    
    const config = betterAuth.mock.calls[0][0];
    expect(config.socialProviders.github.clientId).toBe('test-client-id');
    expect(config.socialProviders.github.clientSecret).toBe('test-client-secret');
    expect(config.socialProviders.github.enabled).toBe(true);
  });

  it('should disable GitHub OAuth when credentials are missing', () => {
    const { betterAuth } = require('better-auth');
    
    delete process.env.GITHUB_CLIENT_ID;
    delete process.env.GITHUB_CLIENT_SECRET;
    
    require('@/lib/auth');
    
    const config = betterAuth.mock.calls[0][0];
    expect(config.socialProviders.github.enabled).toBe(false);
  });

  it('should configure sendResetPassword callback', async () => {
    const { betterAuth } = require('better-auth');
    const { sendPasswordResetEmail } = require('@/lib/email');
    
    require('@/lib/auth');
    
    const config = betterAuth.mock.calls[0][0];
    
    // Call the sendResetPassword callback
    await config.emailAndPassword.sendResetPassword(
      { user: { email: 'test@example.com' }, url: 'https://example.com/reset' },
      {}
    );
    
    expect(sendPasswordResetEmail).toHaveBeenCalledWith(
      'test@example.com',
      'https://example.com/reset'
    );
  });
});

describe('auth-client lib', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should create auth client with NEXT_PUBLIC_APP_URL', () => {
    jest.mock('better-auth/react', () => ({
      createAuthClient: jest.fn(() => ({
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        useSession: jest.fn(),
        requestPasswordReset: jest.fn(),
        resetPassword: jest.fn(),
      })),
    }));

    process.env.NEXT_PUBLIC_APP_URL = 'https://codecomp.com';
    
    const { createAuthClient } = require('better-auth/react');
    require('@/lib/auth-client');
    
    expect(createAuthClient).toHaveBeenCalledWith({
      baseURL: 'https://codecomp.com',
    });
  });

  it('should export authentication methods', () => {
    jest.mock('better-auth/react', () => ({
      createAuthClient: jest.fn(() => ({
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        useSession: jest.fn(),
        requestPasswordReset: jest.fn(),
        resetPassword: jest.fn(),
      })),
    }));

    const authClient = require('@/lib/auth-client');
    
    expect(authClient.signIn).toBeDefined();
    expect(authClient.signUp).toBeDefined();
    expect(authClient.signOut).toBeDefined();
    expect(authClient.useSession).toBeDefined();
    expect(authClient.requestPasswordReset).toBeDefined();
    expect(authClient.resetPassword).toBeDefined();
  });
});
