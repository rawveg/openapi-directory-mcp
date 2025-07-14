/**
 * Rate limiter utility for controlling API request frequency
 * Prevents overwhelming external APIs and handles backpressure gracefully
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  burstLimit?: number;
}

interface QueuedRequest {
  execute: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

export class RateLimiter {
  private requests: number[] = [];
  private queue: QueuedRequest[] = [];
  private processing = false;

  constructor(private config: RateLimitConfig) {}

  /**
   * Execute a function with rate limiting
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        execute: fn,
        resolve,
        reject,
      });

      this.processQueue();
    });
  }

  /**
   * Process the queue of pending requests
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      // Clean old requests outside the window
      const now = Date.now();
      this.requests = this.requests.filter(
        (time) => now - time < this.config.windowMs,
      );

      // Check if we can make a request
      if (this.requests.length >= this.config.maxRequests) {
        // Wait until the oldest request expires
        const oldestRequest = Math.min(...this.requests);
        const waitTime = oldestRequest + this.config.windowMs - now;
        await this.sleep(Math.max(waitTime, 100)); // Minimum 100ms wait
        continue;
      }

      // Process the next request
      const item = this.queue.shift();
      if (!item) break;

      try {
        this.requests.push(now);
        const result = await item.execute();
        item.resolve(result);
      } catch (error) {
        item.reject(error);
      }

      // Add small delay between requests to be respectful
      await this.sleep(50);
    }

    this.processing = false;
  }

  /**
   * Get current rate limit status
   */
  getStatus(): {
    requestsInWindow: number;
    queueLength: number;
    canMakeRequest: boolean;
  } {
    const now = Date.now();
    const requestsInWindow = this.requests.filter(
      (time) => now - time < this.config.windowMs,
    ).length;

    return {
      requestsInWindow,
      queueLength: this.queue.length,
      canMakeRequest: requestsInWindow < this.config.maxRequests,
    };
  }

  /**
   * Wait for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Clear all pending requests
   */
  clear(): void {
    this.queue.forEach((item) =>
      item.reject(new Error("Rate limiter cleared")),
    );
    this.queue = [];
    this.requests = [];
  }
}

/**
 * Pre-configured rate limiters for different API types
 */
export const rateLimiters = {
  // Conservative limits for external APIs
  external: new RateLimiter({
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
  }),

  // More generous limits for primary API (APIs.guru)
  primary: new RateLimiter({
    maxRequests: 30,
    windowMs: 60 * 1000, // 1 minute
  }),

  // Medium limits for secondary API
  secondary: new RateLimiter({
    maxRequests: 20,
    windowMs: 60 * 1000, // 1 minute
  }),

  // No limits for local custom specs
  custom: new RateLimiter({
    maxRequests: 1000,
    windowMs: 1000, // Effectively no limit
  }),

  // Strict limits for testing to prevent overwhelming during CI
  testing: new RateLimiter({
    maxRequests: 5,
    windowMs: 30 * 1000, // 30 seconds
  }),
};
