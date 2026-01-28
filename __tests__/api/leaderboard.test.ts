import { NextRequest } from 'next/server';
import { GET } from '@/app/api/leaderboard/route';

// Mock modules
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('Leaderboard API', () => {
  const { supabase } = require('@/lib/supabase');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createRequest = (searchParams: Record<string, string> = {}) => {
    const url = new URL('http://localhost:3000/api/leaderboard');
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
    return new NextRequest(url);
  };

  describe('GET /api/leaderboard', () => {
    it('should return 400 when competition_id is missing', async () => {
      const request = createRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('competition_id is required');
    });

    it('should fetch leaderboard successfully', async () => {
      const mockLeaderboard = [
        {
          rank: 1,
          user_id: 'user-1',
          competition_id: 'comp-123',
          best_score: 100,
          best_time: 500,
          submission_count: 3,
        },
        {
          rank: 2,
          user_id: 'user-2',
          competition_id: 'comp-123',
          best_score: 85,
          best_time: 750,
          submission_count: 5,
        },
        {
          rank: 3,
          user_id: 'user-3',
          competition_id: 'comp-123',
          best_score: 70,
          best_time: 1000,
          submission_count: 2,
        },
      ];

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockLeaderboard,
              error: null,
            }),
          }),
        }),
      });

      const request = createRequest({ competition_id: 'comp-123' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(3);
      expect(data[0].rank).toBe(1);
      expect(data[0].best_score).toBe(100);
      expect(supabase.from).toHaveBeenCalledWith('leaderboard');
    });

    it('should order leaderboard by rank ascending', async () => {
      const mockFn = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };
      supabase.from.mockReturnValue(mockFn);

      const request = createRequest({ competition_id: 'comp-123' });
      await GET(request);

      expect(mockFn.order).toHaveBeenCalledWith('rank', { ascending: true });
    });

    it('should return empty array when no entries in leaderboard', async () => {
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

      const request = createRequest({ competition_id: 'comp-123' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual([]);
    });

    it('should return 500 on database error', async () => {
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

      const request = createRequest({ competition_id: 'comp-123' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Failed to fetch leaderboard');
    });

    it('should filter by competition_id', async () => {
      const mockFn = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };
      supabase.from.mockReturnValue(mockFn);

      const request = createRequest({ competition_id: 'specific-comp-id' });
      await GET(request);

      expect(mockFn.eq).toHaveBeenCalledWith('competition_id', 'specific-comp-id');
    });

    it('should handle unexpected errors gracefully', async () => {
      supabase.from.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const request = createRequest({ competition_id: 'comp-123' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});
