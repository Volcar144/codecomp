import { NextRequest } from 'next/server';
import { POST } from '@/app/api/execute/route';

// Mock modules
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock('@/lib/code-execution', () => ({
  executeCode: jest.fn(),
  isLanguageSupported: jest.fn(),
}));

describe('Execute API', () => {
  const { supabase } = require('@/lib/supabase');
  const { executeCode, isLanguageSupported } = require('@/lib/code-execution');

  beforeEach(() => {
    jest.clearAllMocks();
    // Default to language being supported
    isLanguageSupported.mockReturnValue(true);
  });

  const createRequest = (body: object) => {
    return new NextRequest('http://localhost:3000/api/execute', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  };

  describe('POST /api/execute', () => {
    it('should return 400 when code is missing', async () => {
      const request = createRequest({
        language: 'python',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Code and language are required');
    });

    it('should return 400 when language is missing', async () => {
      const request = createRequest({
        code: 'print("hello")',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Code and language are required');
    });

    it('should return 400 for unsupported language', async () => {
      isLanguageSupported.mockReturnValue(false);

      const request = createRequest({
        code: 'puts "hello"',
        language: 'ruby',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Unsupported language');
    });

    it('should execute code with default test cases when no competition_id', async () => {
      executeCode.mockResolvedValue({
        output: '5',
        error: null,
        executionTime: 100,
        memoryUsed: 0,
      });

      const request = createRequest({
        code: 'print(input())',
        language: 'python',
        test_only: true,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results).toBeDefined();
      expect(data.score).toBeDefined();
      expect(data.passedTests).toBeDefined();
      expect(data.totalTests).toBeDefined();
    });

    it('should fetch test cases from database when competition_id provided', async () => {
      const mockTestCases = [
        { input: '10', expected_output: '20', points: 50, is_hidden: false },
        { input: '5', expected_output: '10', points: 50, is_hidden: false },
      ];

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockTestCases,
              error: null,
            }),
          }),
        }),
      });

      executeCode.mockResolvedValue({
        output: '20',
        error: null,
        executionTime: 50,
        memoryUsed: 0,
      });

      const request = createRequest({
        code: 'print(int(input()) * 2)',
        language: 'python',
        competition_id: 'comp-123',
        test_only: true,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(supabase.from).toHaveBeenCalledWith('test_cases');
    });

    it('should filter out hidden test cases when test_only is true', async () => {
      const mockTestCases = [
        { input: '10', expected_output: '20', points: 50, is_hidden: false },
        { input: '5', expected_output: '10', points: 50, is_hidden: true },
      ];

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockTestCases,
              error: null,
            }),
          }),
        }),
      });

      executeCode.mockResolvedValue({
        output: '20',
        error: null,
        executionTime: 50,
        memoryUsed: 0,
      });

      const request = createRequest({
        code: 'print(int(input()) * 2)',
        language: 'python',
        competition_id: 'comp-123',
        test_only: true,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.totalTests).toBe(1); // Only non-hidden test case
    });

    it('should include all test cases when test_only is false', async () => {
      const mockTestCases = [
        { input: '10', expected_output: '20', points: 50, is_hidden: false },
        { input: '5', expected_output: '10', points: 50, is_hidden: true },
      ];

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockTestCases,
              error: null,
            }),
          }),
        }),
      });

      executeCode.mockResolvedValue({
        output: '20',
        error: null,
        executionTime: 50,
        memoryUsed: 0,
      });

      const request = createRequest({
        code: 'print(int(input()) * 2)',
        language: 'python',
        competition_id: 'comp-123',
        test_only: false,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.totalTests).toBe(2); // Both test cases
    });

    it('should calculate score correctly', async () => {
      const mockTestCases = [
        { input: '5', expected_output: '5', points: 10, is_hidden: false },
        { input: '10', expected_output: '10', points: 10, is_hidden: false },
        { input: '1', expected_output: '1', points: 10, is_hidden: false },
      ];

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockTestCases,
              error: null,
            }),
          }),
        }),
      });

      // First two pass, third fails
      executeCode
        .mockResolvedValueOnce({ output: '5', error: null, executionTime: 50, memoryUsed: 0 })
        .mockResolvedValueOnce({ output: '10', error: null, executionTime: 50, memoryUsed: 0 })
        .mockResolvedValueOnce({ output: '2', error: null, executionTime: 50, memoryUsed: 0 });

      const request = createRequest({
        code: 'print(input())',
        language: 'python',
        competition_id: 'comp-123',
        test_only: true,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.passedTests).toBe(2);
      expect(data.totalTests).toBe(3);
      expect(data.score).toBe(66); // Math.floor(2/3 * 100)
    });

    it('should handle execution errors in test results', async () => {
      executeCode.mockResolvedValue({
        output: '',
        error: 'SyntaxError: invalid syntax',
        executionTime: 0,
        memoryUsed: 0,
      });

      const request = createRequest({
        code: 'print(hello',
        language: 'python',
        test_only: true,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results[0].passed).toBe(false);
      expect(data.results[0].error).toBe('SyntaxError: invalid syntax');
    });

    it('should handle exception during execution', async () => {
      executeCode.mockRejectedValue(new Error('Network error'));

      const request = createRequest({
        code: 'print("hello")',
        language: 'python',
        test_only: true,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results[0].passed).toBe(false);
      expect(data.results[0].error).toBe('Network error');
    });

    it('should return 100 score when all tests pass', async () => {
      // Mock executeCode to return the expected output for each default test case
      // Default test cases are: input "5" expects "5", input "10" expects "10", input "1" expects "1"
      executeCode
        .mockResolvedValueOnce({ output: '5', error: null, executionTime: 50, memoryUsed: 0 })
        .mockResolvedValueOnce({ output: '10', error: null, executionTime: 50, memoryUsed: 0 })
        .mockResolvedValueOnce({ output: '1', error: null, executionTime: 50, memoryUsed: 0 });

      const request = createRequest({
        code: 'print(input())',
        language: 'python',
        test_only: true,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.score).toBe(100);
      expect(data.passedTests).toBe(data.totalTests);
    });

    it('should trim output when comparing', async () => {
      // Output has extra whitespace - mock all 3 default test cases with trailing newlines
      executeCode
        .mockResolvedValueOnce({ output: '5\n', error: null, executionTime: 50, memoryUsed: 0 })
        .mockResolvedValueOnce({ output: '10\n', error: null, executionTime: 50, memoryUsed: 0 })
        .mockResolvedValueOnce({ output: '1\n', error: null, executionTime: 50, memoryUsed: 0 });

      const request = createRequest({
        code: 'print(input())',
        language: 'python',
        test_only: true,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results[0].passed).toBe(true);
    });
  });
});
