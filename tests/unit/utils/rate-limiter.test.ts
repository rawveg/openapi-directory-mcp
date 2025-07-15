import { describe, test, expect, jest, beforeEach, afterEach, afterAll } from '@jest/globals';
import { RateLimiter, rateLimiters } from '../../../src/utils/rate-limiter.js';

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    // Clear any rate limiter instance created in tests
    if (rateLimiter) {
      rateLimiter.clear();
    }
  });

  afterAll(() => {
    // Clean up all global rate limiters
    Object.values(rateLimiters).forEach(limiter => {
      if (limiter && typeof limiter.clear === 'function') {
        limiter.clear();
      }
    });
  });

  describe('constructor', () => {
    test('should initialize with config', () => {
      rateLimiter = new RateLimiter({
        maxRequests: 10,
        windowMs: 60000
      });
      
      const status = rateLimiter.getStatus();
      expect(status.requestsInWindow).toBe(0);
      expect(status.queueLength).toBe(0);
      expect(status.canMakeRequest).toBe(true);
    });
  });

  describe('execute', () => {
    beforeEach(() => {
      rateLimiter = new RateLimiter({
        maxRequests: 3,
        windowMs: 10000
      });
    });

    test('should execute functions within rate limit', async () => {
      const fn1 = jest.fn().mockResolvedValue('result1');
      const fn2 = jest.fn().mockResolvedValue('result2');
      const fn3 = jest.fn().mockResolvedValue('result3');

      const promises = [
        rateLimiter.execute(fn1),
        rateLimiter.execute(fn2),
        rateLimiter.execute(fn3)
      ];

      // Process timers to execute queued requests
      await jest.runAllTimersAsync();
      
      const results = await Promise.all(promises);
      
      expect(fn1).toHaveBeenCalled();
      expect(fn2).toHaveBeenCalled();
      expect(fn3).toHaveBeenCalled();
      expect(results).toEqual(['result1', 'result2', 'result3']);
    });

    test('should queue requests when limit is reached', async () => {
      const functions = Array(5).fill(null).map((_, i) => 
        jest.fn().mockResolvedValue(`result${i}`)
      );

      const promises = functions.map(fn => rateLimiter.execute(fn));

      // Initially, status should show queue
      const status = rateLimiter.getStatus();
      expect(status.queueLength).toBeGreaterThan(0);

      // Process all timers
      await jest.runAllTimersAsync();
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(5);
      functions.forEach(fn => expect(fn).toHaveBeenCalled());
    });

    test('should handle function rejection', async () => {
      const error = new Error('Test error');
      const failingFn = jest.fn().mockRejectedValue(error);

      await expect(rateLimiter.execute(failingFn)).rejects.toThrow('Test error');
    });

    test('should respect time window', async () => {
      const functions = Array(6).fill(null).map((_, i) => 
        jest.fn().mockResolvedValue(`result${i}`)
      );

      // Execute first 3 (within limit)
      const firstBatch = functions.slice(0, 3).map(fn => rateLimiter.execute(fn));
      
      // Execute next 3 (should be queued)
      const secondBatch = functions.slice(3, 6).map(fn => rateLimiter.execute(fn));

      // Process timers
      await jest.runAllTimersAsync();

      const allResults = await Promise.all([...firstBatch, ...secondBatch]);
      expect(allResults).toHaveLength(6);
    });
  });

  describe('getStatus', () => {
    beforeEach(() => {
      rateLimiter = new RateLimiter({
        maxRequests: 2,
        windowMs: 5000
      });
    });

    test('should return accurate status', async () => {
      const fn1 = jest.fn().mockResolvedValue('result1');
      const fn2 = jest.fn().mockResolvedValue('result2');
      const fn3 = jest.fn().mockResolvedValue('result3');

      // Execute first two requests (fills the window)
      const promise1 = rateLimiter.execute(fn1);
      const promise2 = rateLimiter.execute(fn2);
      
      // Process them immediately
      await jest.runOnlyPendingTimersAsync();
      
      // Now add a third which should be queued
      const promise3 = rateLimiter.execute(fn3);

      const status = rateLimiter.getStatus();
      // Should have requests in window and queue
      expect(status.requestsInWindow).toBeGreaterThan(0);
      expect(status.queueLength).toBeGreaterThan(0);
      
      // Clean up
      await jest.runAllTimersAsync();
      await Promise.all([promise1, promise2, promise3]);
    });

    test('should update status after window expires', async () => {
      const fn = jest.fn().mockResolvedValue('result');
      
      await rateLimiter.execute(fn);
      jest.runAllTimers();
      
      let status = rateLimiter.getStatus();
      expect(status.requestsInWindow).toBeGreaterThan(0);

      // Advance time past window
      jest.advanceTimersByTime(6000);
      
      status = rateLimiter.getStatus();
      expect(status.requestsInWindow).toBe(0);
      expect(status.canMakeRequest).toBe(true);
    });
  });

  describe('clear', () => {
    beforeEach(() => {
      rateLimiter = new RateLimiter({
        maxRequests: 1,
        windowMs: 10000
      });
    });

    test('should clear queue and reject pending requests', async () => {
      const fn1 = jest.fn().mockResolvedValue('result1');
      const fn2 = jest.fn().mockResolvedValue('result2');
      
      // First will execute, second will be queued
      const promise1 = rateLimiter.execute(fn1);
      const promise2 = rateLimiter.execute(fn2);

      // Clear the rate limiter
      rateLimiter.clear();

      await expect(promise2).rejects.toThrow('Rate limiter cleared');
      
      const status = rateLimiter.getStatus();
      expect(status.queueLength).toBe(0);
      expect(status.requestsInWindow).toBe(0);
    });
  });

  describe('pre-configured rate limiters', () => {
    test('should have correct configurations', () => {
      expect(rateLimiters.external).toBeDefined();
      expect(rateLimiters.primary).toBeDefined();
      expect(rateLimiters.secondary).toBeDefined();
      expect(rateLimiters.custom).toBeDefined();
      expect(rateLimiters.testing).toBeDefined();

      // Test external limiter has conservative limits
      const externalStatus = rateLimiters.external.getStatus();
      expect(externalStatus.canMakeRequest).toBe(true);

      // Test custom limiter has high limits
      const customStatus = rateLimiters.custom.getStatus();
      expect(customStatus.canMakeRequest).toBe(true);
    });
  });

  describe('concurrent execution', () => {
    test('should handle concurrent requests properly', async () => {
      rateLimiter = new RateLimiter({
        maxRequests: 5,
        windowMs: 1000
      });

      const functions = Array(10).fill(null).map((_, i) => 
        jest.fn().mockImplementation(() => 
          new Promise(resolve => setTimeout(() => resolve(`result${i}`), 10))
        )
      );

      const promises = functions.map(fn => rateLimiter.execute(fn));
      
      // Run all timers
      await jest.runAllTimersAsync();
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(10);
      expect(functions.filter(fn => fn.mock.calls.length > 0)).toHaveLength(10);
    });
  });

  describe('edge cases', () => {
    test('should handle empty queue', () => {
      rateLimiter = new RateLimiter({
        maxRequests: 10,
        windowMs: 1000
      });

      const status = rateLimiter.getStatus();
      expect(status.requestsInWindow).toBe(0);
      expect(status.queueLength).toBe(0);
      expect(status.canMakeRequest).toBe(true);
    });

    test('should handle very small window', async () => {
      rateLimiter = new RateLimiter({
        maxRequests: 1,
        windowMs: 100
      });

      const fn1 = jest.fn().mockResolvedValue('result1');
      const fn2 = jest.fn().mockResolvedValue('result2');

      const promise1 = rateLimiter.execute(fn1);
      const promise2 = rateLimiter.execute(fn2);

      await jest.runAllTimersAsync();
      
      const results = await Promise.all([promise1, promise2]);
      expect(results).toEqual(['result1', 'result2']);
    });

    test('should handle burst limit if configured', () => {
      rateLimiter = new RateLimiter({
        maxRequests: 10,
        windowMs: 60000,
        burstLimit: 5
      });

      // This feature might not be implemented, but the config should accept it
      const status = rateLimiter.getStatus();
      expect(status).toBeDefined();
    });
  });
});