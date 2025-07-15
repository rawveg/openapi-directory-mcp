/**
 * Rate limiter utility for controlling API request frequency
 * Prevents overwhelming external APIs and handles backpressure gracefully
 */
// @ts-nocheck


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
  private activeTimeouts: Set<ReturnType<typeof setTimeout>> = new Set();
  private shouldStop = false;

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

    while (this.queue.length > 0 && !this.shouldStop) {
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
    if (this.shouldStop) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.activeTimeouts.delete(timeout);
        resolve();
      }, ms);

      this.activeTimeouts.add(timeout);
    });
  }

  /**
   * Clear all pending requests
   */
  clear(): void {
    this.shouldStop = true;

    // Clear all active timeouts
    this.activeTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.activeTimeouts.clear();

    // Reject all queued requests
    this.queue.forEach((item) =>
      item.reject(new Error("Rate limiter cleared")),
    );
    this.queue = [];
    this.requests = [];
    this.processing = false;
  }
}

/**
 * Lazy-loaded rate limiters to prevent initialization during module import
 */
let _rateLimiters: Record<string, RateLimiter> | null = null;

/**
 * Pre-configured rate limiters for different API types
 */
export const rateLimiters = new Proxy({} as Record<string, RateLimiter>, {
  get(_target, prop: string) {
    // Lazy initialize rate limiters on first access
    if (!_rateLimiters) {
      _rateLimiters = {
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
    }

    return _rateLimiters[prop];
  },

  // Allow iteration for cleanup
  ownKeys() {
    if (!_rateLimiters) return [];
    return Object.keys(_rateLimiters);
  },

  getOwnPropertyDescriptor(_target, prop) {
    if (!_rateLimiters || !(prop in _rateLimiters)) return undefined;
    return {
      enumerable: true,
      configurable: true,
      value: _rateLimiters[prop as string],
    };
  },
});

/**
 * Clean up all rate limiters - useful for testing
 */
export function cleanupRateLimiters(): void {
  if (_rateLimiters) {
    Object.values(_rateLimiters).forEach((limiter) => {
      if (limiter && typeof limiter.clear === "function") {
        limiter.clear();
      }
    });
    _rateLimiters = null;
  }
}
