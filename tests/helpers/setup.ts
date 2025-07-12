import { jest, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';

// Global test setup
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.CACHE_ENABLED = 'true';
  process.env.CACHE_TTL = '1000'; // 1 second for testing
});

afterAll(() => {
  // Cleanup test environment
  delete process.env.NODE_ENV;
  delete process.env.CACHE_ENABLED;
  delete process.env.CACHE_TTL;
});

// Mock console.error to reduce noise in tests
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = jest.fn();
});

afterEach(() => {
  console.error = originalConsoleError;
  jest.clearAllMocks();
});

// Increase timeout for integration tests
jest.setTimeout(30000);