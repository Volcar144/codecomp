import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/competitions/route';

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

describe('Competitions API', () => {
  const { supabase } = require('@/lib/supabase');
  const { auth } = require('@/lib/auth');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/competitions', () => {
    const createRequest = (body: object) => {
      return new NextRequest('http://localhost:3000/api/competitions', {
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
        title: 'Test Competition',
        start_date: '2026-02-01T00:00:00Z',
        end_date: '2026-02-28T23:59:59Z',
        allowed_languages: ['python'],
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Unauthorized');
    });

    it('should return 400 when title is missing', async () => {
      auth.api.getSession.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      });

      const request = createRequest({
        start_date: '2026-02-01T00:00:00Z',
        end_date: '2026-02-28T23:59:59Z',
        allowed_languages: ['python'],
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Title is required');
    });

    it('should return 400 when title is too long', async () => {
      auth.api.getSession.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      });

      const request = createRequest({
        title: 'A'.repeat(201),
        start_date: '2026-02-01T00:00:00Z',
        end_date: '2026-02-28T23:59:59Z',
        allowed_languages: ['python'],
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('200 characters');
    });

    it('should return 400 when dates are missing', async () => {
      auth.api.getSession.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      });

      const request = createRequest({
        title: 'Test Competition',
        allowed_languages: ['python'],
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('date');
    });

    it('should return 400 when end date is before start date', async () => {
      auth.api.getSession.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      });

      const request = createRequest({
        title: 'Test Competition',
        start_date: '2026-02-28T00:00:00Z',
        end_date: '2026-02-01T00:00:00Z',
        allowed_languages: ['python'],
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('End date must be after start date');
    });

    it('should return 400 when start date is in the past', async () => {
      auth.api.getSession.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      });

      const request = createRequest({
        title: 'Test Competition',
        start_date: '2020-01-01T00:00:00Z',
        end_date: '2026-02-28T00:00:00Z',
        allowed_languages: ['python'],
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('past');
    });

    it('should return 400 when no languages are selected', async () => {
      auth.api.getSession.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      });

      const request = createRequest({
        title: 'Test Competition',
        start_date: '2026-02-01T00:00:00Z',
        end_date: '2026-02-28T23:59:59Z',
        allowed_languages: [],
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('language');
    });

    it('should create competition successfully', async () => {
      auth.api.getSession.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      });

      const mockCompetition = {
        id: 'comp-123',
        title: 'Test Competition',
        description: 'Test Description',
        rules: null,
        start_date: '2026-02-01T00:00:00Z',
        end_date: '2026-02-28T23:59:59Z',
        creator_id: 'user-123',
        allowed_languages: ['python', 'javascript'],
        status: 'draft',
      };

      supabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockCompetition,
              error: null,
            }),
          }),
        }),
      });

      const request = createRequest({
        title: 'Test Competition',
        description: 'Test Description',
        start_date: '2026-02-01T00:00:00Z',
        end_date: '2026-02-28T23:59:59Z',
        allowed_languages: ['python', 'javascript'],
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.id).toBe('comp-123');
      expect(data.title).toBe('Test Competition');
    });

    it('should return 500 on database error', async () => {
      auth.api.getSession.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      });

      supabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      });

      const request = createRequest({
        title: 'Test Competition',
        start_date: '2026-02-01T00:00:00Z',
        end_date: '2026-02-28T23:59:59Z',
        allowed_languages: ['python'],
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Failed to create competition');
    });
  });

  describe('GET /api/competitions', () => {
    const createGetRequest = (searchParams: Record<string, string> = {}) => {
      const url = new URL('http://localhost:3000/api/competitions');
      Object.entries(searchParams).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
      return new NextRequest(url);
    };

    it('should fetch competitions successfully', async () => {
      const mockCompetitions = [
        { id: 'comp-1', title: 'Competition 1', status: 'active', is_public: true },
        { id: 'comp-2', title: 'Competition 2', status: 'active', is_public: true },
      ];

      auth.api.getSession.mockResolvedValue(null);

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          neq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: mockCompetitions,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      const request = createGetRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(2);
      expect(data[0].title).toBe('Competition 1');
    });

    it('should filter by status', async () => {
      auth.api.getSession.mockResolvedValue(null);

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          neq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockResolvedValue({
                    data: [{ id: 'comp-1', title: 'Active Comp', status: 'active', is_public: true }],
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      const request = createGetRequest({ status: 'active' });
      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('should apply pagination with limit and offset', async () => {
      auth.api.getSession.mockResolvedValue(null);

      const mockFn = {
        select: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };
      supabase.from.mockReturnValue(mockFn);

      const request = createGetRequest({ limit: '10', offset: '20' });
      await GET(request);

      expect(mockFn.range).toHaveBeenCalledWith(20, 29);
    });

    it('should return 500 on database error', async () => {
      auth.api.getSession.mockResolvedValue(null);

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          neq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Database error' },
                }),
              }),
            }),
          }),
        }),
      });

      const request = createGetRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Failed to fetch competitions');
    });

    it('should show private competitions for authenticated user', async () => {
      auth.api.getSession.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      });

      const mockCompetitions = [
        { id: 'comp-1', title: 'Public Competition', status: 'active', is_public: true },
        { id: 'comp-2', title: 'Private Competition', status: 'active', is_public: false, creator_id: 'user-123' },
      ];

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          neq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockReturnValue({
                or: jest.fn().mockResolvedValue({
                  data: mockCompetitions,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      const request = createGetRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(2);
    });
  });
});
