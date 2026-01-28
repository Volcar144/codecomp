import { isLanguageSupported } from '@/lib/code-execution';

// Mock axios before importing executeCode
jest.mock('axios');

describe('code-execution lib', () => {
  describe('isLanguageSupported', () => {
    it('should return true for supported languages', () => {
      const supportedLanguages = ['python', 'javascript', 'java', 'cpp', 'csharp', 'go', 'rust'];
      
      supportedLanguages.forEach(lang => {
        expect(isLanguageSupported(lang)).toBe(true);
      });
    });

    it('should return true for supported languages with different casing', () => {
      expect(isLanguageSupported('Python')).toBe(true);
      expect(isLanguageSupported('JAVASCRIPT')).toBe(true);
      expect(isLanguageSupported('Java')).toBe(true);
    });

    it('should return false for unsupported languages', () => {
      const unsupportedLanguages = ['ruby', 'php', 'perl', 'swift', 'kotlin', 'unknown'];
      
      unsupportedLanguages.forEach(lang => {
        expect(isLanguageSupported(lang)).toBe(false);
      });
    });

    it('should return false for empty string', () => {
      expect(isLanguageSupported('')).toBe(false);
    });
  });

  describe('executeCode', () => {
    const axios = require('axios');
    
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should execute Python code successfully', async () => {
      const { executeCode } = require('@/lib/code-execution');
      
      axios.post.mockResolvedValueOnce({
        data: {
          run: {
            stdout: 'Hello, World!',
            stderr: '',
            code: 0,
          },
          compile: null,
        },
      });

      const result = await executeCode('print("Hello, World!")', 'python', '');

      expect(result.output).toBe('Hello, World!');
      expect(result.error).toBeNull();
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/execute'),
        expect.objectContaining({
          language: 'python',
          version: '3.10.0',
          files: [{ name: 'main.py', content: 'print("Hello, World!")' }],
        }),
        expect.any(Object)
      );
    });

    it('should execute JavaScript code successfully', async () => {
      const { executeCode } = require('@/lib/code-execution');
      
      axios.post.mockResolvedValueOnce({
        data: {
          run: {
            stdout: '42',
            stderr: '',
            code: 0,
          },
          compile: null,
        },
      });

      const result = await executeCode('console.log(42)', 'javascript', '');

      expect(result.output).toBe('42');
      expect(result.error).toBeNull();
    });

    it('should pass stdin input to the code', async () => {
      const { executeCode } = require('@/lib/code-execution');
      
      axios.post.mockResolvedValueOnce({
        data: {
          run: {
            stdout: '5',
            stderr: '',
            code: 0,
          },
          compile: null,
        },
      });

      await executeCode('print(input())', 'python', '5');

      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          stdin: '5',
        }),
        expect.any(Object)
      );
    });

    it('should handle compilation errors', async () => {
      const { executeCode } = require('@/lib/code-execution');
      
      axios.post.mockResolvedValueOnce({
        data: {
          run: {
            stdout: '',
            stderr: '',
            code: 0,
          },
          compile: {
            stdout: '',
            stderr: 'error: expected `;`',
            code: 1,
          },
        },
      });

      const result = await executeCode('invalid code', 'cpp', '');

      expect(result.error).toBe('error: expected `;`');
      expect(result.output).toBe('');
    });

    it('should handle runtime errors', async () => {
      const { executeCode } = require('@/lib/code-execution');
      
      axios.post.mockResolvedValueOnce({
        data: {
          run: {
            stdout: '',
            stderr: 'ZeroDivisionError: division by zero',
            code: 1,
          },
          compile: null,
        },
      });

      const result = await executeCode('print(1/0)', 'python', '');

      expect(result.error).toBe('ZeroDivisionError: division by zero');
    });

    it('should throw error for unsupported language', async () => {
      const { executeCode } = require('@/lib/code-execution');

      const result = await executeCode('puts "hello"', 'ruby', '');

      expect(result.error).toBe('Unsupported language: ruby');
    });

    it('should handle network timeout', async () => {
      const { executeCode } = require('@/lib/code-execution');
      
      const timeoutError = new Error('timeout');
      (timeoutError as any).code = 'ECONNABORTED';
      (timeoutError as any).isAxiosError = true;
      axios.post.mockRejectedValueOnce(timeoutError);
      axios.isAxiosError = jest.fn().mockReturnValue(true);

      const result = await executeCode('while True: pass', 'python', '');

      expect(result.error).toContain('timeout');
    });

    it('should handle API errors', async () => {
      const { executeCode } = require('@/lib/code-execution');
      
      const apiError = new Error('API Error');
      (apiError as any).response = { data: { message: 'Rate limit exceeded' } };
      (apiError as any).isAxiosError = true;
      axios.post.mockRejectedValueOnce(apiError);
      axios.isAxiosError = jest.fn().mockReturnValue(true);

      const result = await executeCode('print("test")', 'python', '');

      expect(result.error).toBe('Rate limit exceeded');
    });

    it('should track execution time', async () => {
      const { executeCode } = require('@/lib/code-execution');
      
      axios.post.mockResolvedValueOnce({
        data: {
          run: {
            stdout: 'done',
            stderr: '',
            code: 0,
          },
          compile: null,
        },
      });

      const result = await executeCode('print("done")', 'python', '');

      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getSupportedLanguages', () => {
    const axios = require('axios');
    
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should fetch supported languages from Piston API', async () => {
      const { getSupportedLanguages } = require('@/lib/code-execution');
      
      const mockLanguages = [
        { language: 'python', version: '3.10.0' },
        { language: 'javascript', version: '18.15.0' },
      ];
      
      axios.get.mockResolvedValueOnce({ data: mockLanguages });

      const result = await getSupportedLanguages();

      expect(result).toEqual(mockLanguages);
      expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/runtimes'));
    });

    it('should return empty array on API error', async () => {
      const { getSupportedLanguages } = require('@/lib/code-execution');
      
      axios.get.mockRejectedValueOnce(new Error('Network error'));

      const result = await getSupportedLanguages();

      expect(result).toEqual([]);
    });
  });
});
