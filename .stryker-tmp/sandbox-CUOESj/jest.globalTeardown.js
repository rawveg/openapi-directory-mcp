/**
 * Global teardown for Jest to clean up resources after all tests
 */
// @ts-nocheck


module.exports = async () => {
  // Force exit to prevent hanging due to open handles
  // This is a last resort after attempting to clean up properly
  
  // Give a small delay for any cleanup to complete
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Force exit if needed
  if (process.env.JEST_WORKER_ID) {
    // We're in a worker process, don't force exit here
    return;
  }
  
  // Clean up any global resources
  try {
    // Dynamic import to handle ES modules
    const { cleanupRateLimiters } = await import('./dist/utils/rate-limiter.js');
    if (cleanupRateLimiters) {
      cleanupRateLimiters();
    }
  } catch (error) {
    // Ignore errors during cleanup
  }
};