"use strict";
/**
 * Rate limiter utility for controlling API request frequency
 * Prevents overwhelming external APIs and handles backpressure gracefully
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimiters = exports.RateLimiter = void 0;
class RateLimiter {
    constructor(config) {
        this.config = config;
        this.requests = [];
        this.queue = [];
        this.processing = false;
    }
    /**
     * Execute a function with rate limiting
     */
    async execute(fn) {
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
    async processQueue() {
        if (this.processing || this.queue.length === 0) {
            return;
        }
        this.processing = true;
        while (this.queue.length > 0) {
            // Clean old requests outside the window
            const now = Date.now();
            this.requests = this.requests.filter((time) => now - time < this.config.windowMs);
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
            if (!item)
                break;
            try {
                this.requests.push(now);
                const result = await item.execute();
                item.resolve(result);
            }
            catch (error) {
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
    getStatus() {
        const now = Date.now();
        const requestsInWindow = this.requests.filter((time) => now - time < this.config.windowMs).length;
        return {
            requestsInWindow,
            queueLength: this.queue.length,
            canMakeRequest: requestsInWindow < this.config.maxRequests,
        };
    }
    /**
     * Wait for specified milliseconds
     */
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    /**
     * Clear all pending requests
     */
    clear() {
        this.queue.forEach((item) => item.reject(new Error("Rate limiter cleared")));
        this.queue = [];
        this.requests = [];
    }
}
exports.RateLimiter = RateLimiter;
/**
 * Pre-configured rate limiters for different API types
 */
exports.rateLimiters = {
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
