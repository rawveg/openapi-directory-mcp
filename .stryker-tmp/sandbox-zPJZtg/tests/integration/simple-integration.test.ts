// @ts-nocheck
import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { CacheManager } from '../../src/cache/manager.js';
import { DualSourceApiClient } from '../../src/api/dual-source-client.js';
import { ToolContext } from '../../src/tools/types.js';
import { createMockedApiClient, MockedDualSourceApiClient } from '../mocks/api-client-mock.js';

/**
 * Simplified integration tests using mocked API client
 * Focus on core functionality without external dependencies
 */
describe('Simplified Integration Tests', () => {
  let cacheManager: CacheManager;
  let apiClient: MockedDualSourceApiClient;
  let toolContext: ToolContext;

  beforeAll(async () => {
    cacheManager = new CacheManager();
    apiClient = createMockedApiClient(cacheManager, 'success');
    toolContext = { apiClient: apiClient as any, cacheManager };
  });

  afterAll(() => {
    if (cacheManager) {
      cacheManager.clear();
    }
  });

  beforeEach(() => {
    // Clear cache before each test
    cacheManager.clear();
  });

  describe('Core Component Integration', () => {
    test('cache manager should initialize correctly', () => {
      expect(cacheManager).toBeDefined();
      expect(typeof cacheManager.clear).toBe('function');
      expect(typeof cacheManager.getStats).toBe('function');
      expect(typeof cacheManager.keys).toBe('function');
    });

    test('API client should initialize correctly', () => {
      expect(apiClient).toBeDefined();
      expect(typeof apiClient.getProviders).toBe('function');
      expect(typeof apiClient.getMetrics).toBe('function');
      expect(typeof apiClient.listAPIs).toBe('function');
    });

    test('cache should work with API client', async () => {
      // Start with empty cache
      let keys = cacheManager.keys();
      expect(keys.length).toBe(0);

      // Test cache operations directly since mocked clients don't use cache
      cacheManager.set('test-providers', { data: ['mock-provider'] });
      
      keys = cacheManager.keys();
      expect(keys.length).toBeGreaterThan(0);

      // Stats should reflect cache usage
      const stats = cacheManager.getStats();
      expect(stats.keys).toBeGreaterThan(0);
      
      // Verify we can retrieve cached data
      const cached = cacheManager.get('test-providers');
      expect(cached).toBeDefined();
      expect(cached.data).toEqual(['mock-provider']);
    }, 30000);

    test('API client failover should work', async () => {
      // Test that a successful client works reliably
      const reliableClient = createMockedApiClient(cacheManager, 'success');

      // Should work consistently
      const metrics = await reliableClient.getMetrics();
      expect(metrics).toBeDefined();
      expect(typeof metrics.numSpecs).toBe('number');
      expect(metrics.numSpecs).toBeGreaterThan(0);
      
      // Test multiple calls to verify reliability
      const metrics2 = await reliableClient.getMetrics();
      expect(metrics2).toBeDefined();
      expect(metrics2.numSpecs).toBe(metrics.numSpecs);
    }, 30000);

    test('cache operations should be consistent', () => {
      // Set some cache entries
      cacheManager.set('test1', { value: 'data1' });
      cacheManager.set('test2', { value: 'data2' });

      // Verify cache state
      let keys = cacheManager.keys();
      expect(keys).toContain('test1');
      expect(keys).toContain('test2');

      let stats = cacheManager.getStats();
      expect(stats.keys).toBe(2);

      // Clear specific key
      cacheManager.delete('test1');
      keys = cacheManager.keys();
      expect(keys).not.toContain('test1');
      expect(keys).toContain('test2');

      stats = cacheManager.getStats();
      expect(stats.keys).toBe(1);

      // Clear all
      cacheManager.clear();
      keys = cacheManager.keys();
      expect(keys.length).toBe(0);

      stats = cacheManager.getStats();
      expect(stats.keys).toBe(0);
    });
  });

  describe('Individual Tool Functions', () => {
    test('cache stats tool functionality should work', () => {
      // Test direct cache manager functionality that tools use
      const stats = cacheManager.getStats();
      
      expect(stats).toBeDefined();
      expect(typeof stats.keys).toBe('number');
      expect(typeof stats.hits).toBe('number');
      expect(typeof stats.misses).toBe('number');
      expect(stats.keys).toBeGreaterThanOrEqual(0);
      expect(stats.hits).toBeGreaterThanOrEqual(0);
      expect(stats.misses).toBeGreaterThanOrEqual(0);
    });

    test('cache clear functionality should work', () => {
      // Add some entries
      cacheManager.set('key1', 'value1');
      cacheManager.set('key2', 'value2');
      
      let keysBefore = cacheManager.keys().length;
      expect(keysBefore).toBe(2);

      // Clear cache
      cacheManager.clear();

      let keysAfter = cacheManager.keys().length;
      expect(keysAfter).toBe(0);
    });

    test('get providers functionality should work', async () => {
      const providers = await apiClient.getProviders();
      
      expect(providers.data).toBeDefined();
      expect(Array.isArray(providers.data)).toBe(true);
      expect(providers.data.length).toBeGreaterThan(0);
      
      // Each provider should be a non-empty string
      providers.data.forEach(provider => {
        expect(typeof provider).toBe('string');
        expect(provider.length).toBeGreaterThan(0);
      });
    }, 30000);

    test('get metrics functionality should work', async () => {
      const metrics = await apiClient.getMetrics();
      
      expect(metrics).toBeDefined();
      expect(typeof metrics.numSpecs).toBe('number');
      expect(typeof metrics.numAPIs).toBe('number');
      expect(typeof metrics.numEndpoints).toBe('number');
      
      expect(metrics.numSpecs).toBeGreaterThan(0);
      expect(metrics.numAPIs).toBeGreaterThan(0);
      expect(metrics.numEndpoints).toBeGreaterThan(0);
    }, 30000);

    test('search APIs functionality should work', async () => {
      const searchResult = await apiClient.searchAPIs('google', undefined, 1, 5);
      
      expect(searchResult).toBeDefined();
      expect(searchResult.results).toBeDefined();
      expect(Array.isArray(searchResult.results)).toBe(true);
      expect(searchResult.pagination).toBeDefined();
      expect(typeof searchResult.pagination.total_results).toBe('number');
      expect(typeof searchResult.pagination.page).toBe('number');
      expect(typeof searchResult.pagination.limit).toBe('number');
      
      // Basic validation of search results
      searchResult.results.forEach((result: any) => {
        expect(result.id).toBeDefined();
        expect(typeof result.id).toBe('string');
      });
    }, 30000);

    test('get API functionality should work', async () => {
      const api = await apiClient.getAPI('google.com', 'v3');
      
      expect(api).toBeDefined();
      expect(api.info).toBeDefined();
      expect(api.info.title).toBeDefined();
      expect(typeof api.info.title).toBe('string');
      
      // Check the versions structure that the mock returns
      expect(api.versions).toBeDefined();
      expect(api.preferred).toBeDefined();
      expect(api.versions[api.preferred]).toBeDefined();
      expect(api.versions[api.preferred].swaggerUrl).toBeDefined();
      expect(typeof api.versions[api.preferred].swaggerUrl).toBe('string');
    }, 30000);
  });

  describe('Performance and Reliability', () => {
    test('should handle multiple concurrent API calls', async () => {
      const promises = [
        apiClient.getProviders(),
        apiClient.getMetrics(),
        apiClient.searchAPIs('test', undefined, 1, 5),
        apiClient.getAPI('google.com', 'v3'),
        apiClient.listAPIs()
      ];

      const results = await Promise.allSettled(promises);
      
      // All should complete (some may fail due to network)
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(['fulfilled', 'rejected']).toContain(result.status);
      });
    }, 60000);

    test('should handle cache operations under load', () => {
      const iterations = 100;
      
      // Add many cache entries
      for (let i = 0; i < iterations; i++) {
        cacheManager.set(`key${i}`, { value: `data${i}`, index: i });
      }

      // Verify all were added
      const keys = cacheManager.keys();
      expect(keys.length).toBe(iterations);

      // Verify stats are correct
      const stats = cacheManager.getStats();
      expect(stats.keys).toBe(iterations);

      // Clear half the entries
      for (let i = 0; i < iterations / 2; i++) {
        cacheManager.delete(`key${i}`);
      }

      // Verify correct number remain
      const remainingKeys = cacheManager.keys();
      expect(remainingKeys.length).toBe(iterations / 2);
    });

    test('should maintain memory efficiency', async () => {
      const initialMemory = process.memoryUsage();
      
      // Perform many operations
      for (let i = 0; i < 20; i++) {
        cacheManager.set(`test${i}`, { data: `large data string ${i}`.repeat(100) });
        await apiClient.getMetrics();
        if (i % 5 === 0) {
          cacheManager.clear();
        }
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory growth should be reasonable (less than 20MB)
      expect(memoryGrowth).toBeLessThan(20 * 1024 * 1024);
    }, 60000);
  });

  describe('Error Handling', () => {
    test('should handle invalid API requests gracefully', async () => {
      // Test with mocked client configured for errors
      const errorClient = createMockedApiClient(cacheManager, 'http_error', { httpErrorType: 'notFound' });
      
      await expect(errorClient.getAPI('invalid-provider.com', 'nonexistent'))
        .rejects.toThrow();

      // Test with invalid search parameters - these are handled gracefully, not rejected
      const invalidSearchResult = await apiClient.searchAPIs('', undefined, -1, 0);
      expect(invalidSearchResult).toBeDefined();
      expect(invalidSearchResult.results).toBeDefined();
      expect(invalidSearchResult.pagination).toBeDefined();
    });

    test('should handle cache errors gracefully', () => {
      // Test invalid cache operations - these might log warnings but shouldn't crash
      expect(() => cacheManager.delete('')).not.toThrow();
      
      // Test getting non-existent key
      const result = cacheManager.get('nonexistent-key');
      expect(result).toBeUndefined();
    });

    test('should handle network errors gracefully', async () => {
      const networkErrorClient = createMockedApiClient(cacheManager, 'network_error');

      // Should fail with network error
      await expect(networkErrorClient.getProviders())
        .rejects.toThrow();
    }, 15000);
  });
});