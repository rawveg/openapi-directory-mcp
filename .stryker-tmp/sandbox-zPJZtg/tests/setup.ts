// @ts-nocheck
import { jest } from '@jest/globals';

// Set up global test configuration
beforeAll(() => {
  // Increase timeout for integration tests
  jest.setTimeout(30000);
});

// Clean up after each test
afterEach(() => {
  // Clear all mocks
  jest.clearAllMocks();
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});