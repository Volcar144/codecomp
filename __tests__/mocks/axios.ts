import axios from 'axios';

// Mock axios for code execution tests
export const mockAxiosPost = jest.fn();
export const mockAxiosGet = jest.fn();

jest.mock('axios', () => ({
  post: (...args: unknown[]) => mockAxiosPost(...args),
  get: (...args: unknown[]) => mockAxiosGet(...args),
  isAxiosError: (error: unknown) => error && typeof error === 'object' && 'isAxiosError' in error,
}));

export const resetAxiosMocks = () => {
  mockAxiosPost.mockClear();
  mockAxiosGet.mockClear();
};

// Helper to create successful execution response
export const createSuccessfulExecutionResponse = (stdout: string = 'Hello, World!') => ({
  data: {
    run: {
      stdout,
      stderr: '',
      code: 0,
      signal: null,
      output: stdout,
    },
    compile: null,
  },
});

// Helper to create compilation error response
export const createCompilationErrorResponse = (stderr: string = 'Syntax error') => ({
  data: {
    run: {
      stdout: '',
      stderr: '',
      code: 0,
      signal: null,
      output: '',
    },
    compile: {
      stdout: '',
      stderr,
      code: 1,
      signal: null,
    },
  },
});

// Helper to create runtime error response
export const createRuntimeErrorResponse = (stderr: string = 'Runtime error') => ({
  data: {
    run: {
      stdout: '',
      stderr,
      code: 1,
      signal: null,
      output: '',
    },
    compile: null,
  },
});
