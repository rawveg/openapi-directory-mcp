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
  // Try both source and built versions for robustness
  try {
    // Try built version first
    const { cleanupRateLimiters } = await import('./dist/utils/rate-limiter.js');
    if (cleanupRateLimiters) {
      cleanupRateLimiters();
    }
  } catch (error) {
    try {
      // Fallback to source version
      const { cleanupRateLimiters } = await import('./src/utils/rate-limiter.ts');
      if (cleanupRateLimiters) {
        cleanupRateLimiters();
      }
    } catch (fallbackError) {
      // Ignore all cleanup errors - this is best effort
    }
  }
  
  // Force clear all timers as a last resort
  jest.clearAllTimers();
});

// Also clean after each test file to prevent cross-file contamination
afterEach(async () => {
  try {
    // Try built version first
    const { cleanupRateLimiters } = await import('./dist/utils/rate-limiter.js');
    if (cleanupRateLimiters) {
      cleanupRateLimiters();
    }
  } catch (error) {
    try {
      // Fallback to source version
      const { cleanupRateLimiters } = await import('./src/utils/rate-limiter.ts');
      if (cleanupRateLimiters) {
        cleanupRateLimiters();
      }
    } catch (fallbackError) {
      // Ignore all cleanup errors - this is best effort
    }
  }
});