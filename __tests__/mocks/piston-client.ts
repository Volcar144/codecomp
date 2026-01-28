/**
 * Mock for Piston Client
 */

export const mockPistonClient = {
  run: jest.fn(),
  runInteractive: jest.fn(),
  sendInput: jest.fn(),
  destroySession: jest.fn(),
  getSession: jest.fn(),
  getAllSessions: jest.fn(),
  getRuntimes: jest.fn(),
  validateInstance: jest.fn(),
  installPackage: jest.fn(),
  installRuntime: jest.fn(),
  on: jest.fn(),
  emit: jest.fn(),
};

export const getPistonClient = jest.fn(() => mockPistonClient);

export const PISTON_LANGUAGE_MAP = {
  python: { version: "3.10.0", aliases: ["py", "python3"], extension: "py" },
  javascript: { version: "18.15.0", aliases: ["js", "node"], extension: "js" },
  typescript: { version: "5.0.3", aliases: ["ts"], extension: "ts" },
  java: { version: "15.0.2", aliases: [], extension: "java" },
  cpp: { version: "10.2.0", aliases: ["c++"], extension: "cpp" },
};

export class PistonClient {
  constructor() {
    return mockPistonClient;
  }
}

// Reset function for tests
export const resetPistonMock = () => {
  mockPistonClient.run.mockReset();
  mockPistonClient.runInteractive.mockReset();
  mockPistonClient.sendInput.mockReset();
  mockPistonClient.destroySession.mockReset();
  mockPistonClient.getSession.mockReset();
  mockPistonClient.getAllSessions.mockReset();
  mockPistonClient.getRuntimes.mockReset();
  mockPistonClient.validateInstance.mockReset();
  mockPistonClient.installPackage.mockReset();
  mockPistonClient.installRuntime.mockReset();
};
