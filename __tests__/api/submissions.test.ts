import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/submissions/route';

// Mock modules
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: jest.fn(),
    },
  },
}));

jest.mock('next/headers', () => ({
  headers: jest.fn().mockResolvedValue(new Headers()),
}));

// Mock global fetch for internal API calls
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Submissions API', () => {
  const { supabase } = require('@/lib/supabase');
  const { auth } = require('@/lib/auth');

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('POST /api/submissions', () => {
    const createRequest = (body: object) => {
      return new NextRequest('http://localhost:3000/api/submissions', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
          'Content-Type': 'application/json',
        },
      });
    };

    it('should return 401 when user is not authenticated', async () => {
      auth.api.getSession.mockResolvedValue(null);

      const request = createRequest({
        code: 'print("hello")',
        language: 'python',
        competition_id: 'comp-123',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Unauthorized');
    });

    it('should return 400 when code is missing', async () => {
      auth.api.getSession.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      });

      const request = createRequest({
        language: 'python',
        competition_id: 'comp-123',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Code, language, and competition_id are required');
    });

    it('should return 400 when language is missing', async () => {
      auth.api.getSession.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      });

      const request = createRequest({
        code: 'print("hello")',
        competition_id: 'comp-123',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Code, language, and competition_id are required');
    });

    it('should return 400 when competition_id is missing', async () => {
      auth.api.getSession.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      });

      const request = createRequest({
        code: 'print("hello")',
        language: 'python',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Code, language, and competition_id are required');
    });

    it('should return 404 when competition does not exist', async () => {
      auth.api.getSession.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      });

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' },
            }),
          }),
        }),
      });

      const request = createRequest({
        code: 'print("hello")',
        language: 'python',
        competition_id: 'nonexistent-comp',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('Competition not found');
    });

    it('should return 400 when competition has not started', async () => {
      auth.api.getSession.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      });

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 14);

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'comp-123',
                status: 'active',
                start_date: futureDate.toISOString(),
                end_date: endDate.toISOString(),
                allowed_languages: ['python'],
              },
              error: null,
            }),
          }),
        }),
      });

      const request = createRequest({
        code: 'print("hello")',
        language: 'python',
        competition_id: 'comp-123',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('has not started');
    });

    it('should return 400 when competition has ended', async () => {
      auth.api.getSession.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      });

      const pastStart = new Date();
      pastStart.setDate(pastStart.getDate() - 14);
      const pastEnd = new Date();
      pastEnd.setDate(pastEnd.getDate() - 7);

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'comp-123',
                status: 'active',
                start_date: pastStart.toISOString(),
                end_date: pastEnd.toISOString(),
                allowed_languages: ['python'],
              },
              error: null,
            }),
          }),
        }),
      });

      const request = createRequest({
        code: 'print("hello")',
        language: 'python',
        competition_id: 'comp-123',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('has ended');
    });

    it('should return 400 when language is not allowed', async () => {
      auth.api.getSession.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      });

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 1);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 7);

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'comp-123',
                status: 'active',
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
                allowed_languages: ['python', 'javascript'],
              },
              error: null,
            }),
          }),
        }),
      });

      const request = createRequest({
        code: 'public class Main {}',
        language: 'java',
        competition_id: 'comp-123',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('not allowed');
    });

    it('should create submission successfully', async () => {
      auth.api.getSession.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      });

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 1);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 7);

      // Mock competition fetch
      const mockCompetitionChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'comp-123',
            status: 'active',
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            allowed_languages: ['python'],
          },
          error: null,
        }),
      };

      // Mock submission insert
      const mockSubmissionChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'sub-123',
            competition_id: 'comp-123',
            user_id: 'user-123',
            code: 'print("hello")',
            language: 'python',
            status: 'passed',
            score: 100,
          },
          error: null,
        }),
      };

      supabase.from.mockImplementation((table: string) => {
        if (table === 'competitions') {
          return mockCompetitionChain;
        }
        if (table === 'submissions') {
          return mockSubmissionChain;
        }
        return {};
      });

      // Mock the execute API call
      mockFetch.mockResolvedValue({
        json: jest.fn().mockResolvedValue({
          score: 100,
          passedTests: 3,
          totalTests: 3,
          results: [{ passed: true }, { passed: true }, { passed: true }],
        }),
      });

      const request = createRequest({
        code: 'print("hello")',
        language: 'python',
        competition_id: 'comp-123',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.id).toBe('sub-123');
      expect(data.score).toBe(100);
    });

    it('should return 500 on database error when saving submission', async () => {
      auth.api.getSession.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      });

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 1);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 7);

      // Mock competition fetch
      const mockCompetitionChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'comp-123',
            status: 'active',
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            allowed_languages: ['python'],
          },
          error: null,
        }),
      };

      // Mock submission insert with error
      const mockSubmissionChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      };

      supabase.from.mockImplementation((table: string) => {
        if (table === 'competitions') {
          return mockCompetitionChain;
        }
        if (table === 'submissions') {
          return mockSubmissionChain;
        }
        return {};
      });

      // Mock the execute API call
      mockFetch.mockResolvedValue({
        json: jest.fn().mockResolvedValue({
          score: 100,
          passedTests: 3,
          totalTests: 3,
          results: [],
        }),
      });

      const request = createRequest({
        code: 'print("hello")',
        language: 'python',
        competition_id: 'comp-123',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Failed to save submission');
    });
  });

  describe('GET /api/submissions', () => {
    const createGetRequest = (searchParams: Record<string, string> = {}) => {
      const url = new URL('http://localhost:3000/api/submissions');
      Object.entries(searchParams).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
      return new NextRequest(url);
    };

    it('should return 401 when user is not authenticated', async () => {
      auth.api.getSession.mockResolvedValue(null);

      const request = createGetRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Unauthorized');
    });

    it('should fetch own submissions successfully', async () => {
      auth.api.getSession.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      });

      const mockSubmissions = [
        {
          id: 'sub-1',
          competition_id: 'comp-123',
          user_id: 'user-123',
          code: 'print("hello")',
          language: 'python',
          status: 'passed',
          score: 100,
          submitted_at: '2026-01-15T12:00:00Z',
        },
        {
          id: 'sub-2',
          competition_id: 'comp-123',
          user_id: 'user-123',
          code: 'console.log("hello")',
          language: 'javascript',
          status: 'failed',
          score: 50,
          submitted_at: '2026-01-14T10:00:00Z',
        },
      ];

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockSubmissions,
              error: null,
            }),
          }),
        }),
      });

      const request = createGetRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(2);
      expect(data[0].status).toBe('passed');
    });

    it('should filter by competition_id', async () => {
      auth.api.getSession.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      });

      const mockFn = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };
      supabase.from.mockReturnValue(mockFn);

      const request = createGetRequest({ competition_id: 'comp-123' });
      await GET(request);

      expect(mockFn.eq).toHaveBeenCalledWith('competition_id', 'comp-123');
    });

    it('should return 403 when trying to view other users submissions', async () => {
      auth.api.getSession.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      });

      const request = createGetRequest({ user_id: 'other-user-456' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Unauthorized to view other');
    });

    it('should allow viewing own submissions when user_id matches', async () => {
      auth.api.getSession.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      });

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      });

      const request = createGetRequest({ user_id: 'user-123' });
      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('should order submissions by submitted_at descending', async () => {
      auth.api.getSession.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      });

      const mockFn = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };
      supabase.from.mockReturnValue(mockFn);

      const request = createGetRequest();
      await GET(request);

      expect(mockFn.order).toHaveBeenCalledWith('submitted_at', { ascending: false });
    });

    it('should return 500 on database error', async () => {
      auth.api.getSession.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      });

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      });

      const request = createGetRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Failed to fetch submissions');
    });

    it('should handle unexpected errors gracefully', async () => {
      auth.api.getSession.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const request = createGetRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});
