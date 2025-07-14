/**
 * Jest setup file to polyfill import.meta for test environments
 */

// Ensure NODE_ENV is set to 'test' for proper NodeCache configuration
process.env.NODE_ENV = 'test';

// Polyfill import.meta for Jest
if (typeof globalThis.importMeta === 'undefined') {
  globalThis.importMeta = {
    url: `file://${process.cwd()}/src/tools/loader.js`
  };
}

// Make import.meta available globally for ES modules in Jest
if (typeof global !== 'undefined') {
  // Polyfill import.meta in the global scope for Jest
  Object.defineProperty(global, 'import', {
    value: {
      meta: {
        url: `file://${process.cwd()}/src/tools/loader.js`
      }
    },
    writable: true,
    configurable: true
  });
}

// Global cleanup for rate limiters
afterAll(async () => {
  // Dynamic import to handle ES modules
  try {
    const { cleanupRateLimiters } = await import('./dist/utils/rate-limiter.js');
    if (cleanupRateLimiters) {
      cleanupRateLimiters();
    }
  } catch (error) {
    // Ignore errors during cleanup
  }
  
  // Force clear all timers as a last resort
  jest.clearAllTimers();
});

// Also clean after each test file to prevent cross-file contamination
afterEach(async () => {
  try {
    const { cleanupRateLimiters } = await import('./dist/utils/rate-limiter.js');
    if (cleanupRateLimiters) {
      cleanupRateLimiters();
    }
  } catch (error) {
    // Ignore errors during cleanup
  }
});