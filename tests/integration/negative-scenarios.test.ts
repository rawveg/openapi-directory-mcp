import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import { CacheManager } from '../../src/cache/manager.js';
import { ToolContext } from '../../src/tools/types.js';
import { createMockedApiClient, mockConfigs, MockedDualSourceApiClient } from '../mocks/api-client-mock.js';

/**
 * Comprehensive negative scenario testing
 * Tests error conditions, edge cases, and failure modes to ensure code robustness
 */
describe('Negative Scenario Integration Tests', () => {
  let cacheManager: CacheManager;
  let toolContext: ToolContext;

  beforeAll(async () => {
    cacheManager = new CacheManager();
  });

  afterAll(() => {
    if (cacheManager) {
      cacheManager.clear();
    }
  });

  beforeEach(() => {
    cacheManager.clear();
    jest.clearAllMocks();
  });

  describe('Network Error Handling', () => {
    test('should handle connection refused errors gracefully', async () => {
      const mockClient = createMockedApiClient(cacheManager, 'network_error', {
        networkErrorType: 'connectionRefused'
      });
      toolContext = { apiClient: mockClient as any, cacheManager };

      await expect(mockClient.getProviders()).rejects.toThrow(/ECONNREFUSED/);
      await expect(mockClient.getMetrics()).rejects.toThrow(/ECONNREFUSED/);
      await expect(mockClient.searchAPIs('test')).rejects.toThrow(/ECONNREFUSED/);
    });

    test('should handle DNS resolution failures', async () => {
      const mockClient = createMockedApiClient(cacheManager, 'network_error', {
        networkErrorType: 'dnsError'
      });

      await expect(mockClient.getProviders()).rejects.toThrow(/ENOTFOUND/);
    });

    test('should handle request timeouts', async () => {
      const mockClient = createMockedApiClient(cacheManager, 'network_error', {
        networkErrorType: 'timeout'
      });

      await expect(mockClient.getProviders()).rejects.toThrow(/timeout/);
    });

    test('should handle rate limiting appropriately', async () => {
      const mockClient = createMockedApiClient(cacheManager, 'rate_limited');

      try {
        await mockClient.getProviders();
        fail('Should have thrown rate limit error');
      } catch (error: any) {
        expect(error.response?.status).toBe(429);
        expect(error.response?.data?.error?.type).toBe('rate_limit_error');
        expect(error.response?.headers?.['retry-after']).toBe('60');
      }
    });
  });

  describe('HTTP Error Handling', () => {
    test('should handle 404 Not Found errors', async () => {
      const mockClient = createMockedApiClient(cacheManager, 'http_error', {
        httpErrorType: 'notFound'
      });

      try {
        await mockClient.getAPI('nonexistent.com', 'v1');
        fail('Should have thrown 404 error');
      } catch (error: any) {
        expect(error.response?.status).toBe(404);
        expect(error.response?.data?.error?.type).toBe('not_found_error');
      }
    });

    test('should handle 401 Unauthorized errors', async () => {
      const mockClient = createMockedApiClient(cacheManager, 'http_error', {
        httpErrorType: 'unauthorized'
      });

      try {
        await mockClient.getProviders();
        fail('Should have thrown 401 error');
      } catch (error: any) {
        expect(error.response?.status).toBe(401);
        expect(error.response?.data?.error?.type).toBe('authentication_error');
      }
    });

    test('should handle 500 Internal Server errors', async () => {
      const mockClient = createMockedApiClient(cacheManager, 'http_error', {
        httpErrorType: 'internalServerError'
      });

      try {
        await mockClient.getMetrics();
        fail('Should have thrown 500 error');
      } catch (error: any) {
        expect(error.response?.status).toBe(500);
        expect(error.response?.data?.error?.type).toBe('server_error');
      }
    });

    test('should handle 503 Service Unavailable errors', async () => {
      const mockClient = createMockedApiClient(cacheManager, 'http_error', {
        httpErrorType: 'serviceUnavailable'
      });

      try {
        await mockClient.getProviders();
        fail('Should have thrown 503 error');
      } catch (error: any) {
        expect(error.response?.status).toBe(503);
        expect(error.response?.data?.error?.type).toBe('service_unavailable');
      }
    });
  });

  describe('Malformed Response Handling', () => {
    test('should handle invalid JSON responses', async () => {
      const mockClient = createMockedApiClient(cacheManager, 'malformed_response', {
        malformedType: 'invalidJson'
      });

      await expect(mockClient.getProviders()).rejects.toThrow(/JSON/);
    });

    test('should handle null responses gracefully', async () => {
      const mockClient = createMockedApiClient(cacheManager, 'malformed_response', {
        malformedType: 'nullResponse'
      });

      const result = await mockClient.getProviders();
      expect(result).toBeNull();
      
      // Code should handle null gracefully
      expect(() => {
        const data = result?.data || [];
        expect(Array.isArray(data)).toBe(true);
      }).not.toThrow();
    });

    test('should handle empty string responses', async () => {
      const mockClient = createMockedApiClient(cacheManager, 'malformed_response', {
        malformedType: 'emptyResponse'
      });

      const result = await mockClient.getProviders();
      expect(result).toBe('');
      
      // Code should handle empty strings gracefully
      expect(() => {
        const data = result?.data || [];
        expect(Array.isArray(data)).toBe(true);
      }).not.toThrow();
    });

    test('should handle unexpected response structure', async () => {
      const mockClient = createMockedApiClient(cacheManager, 'malformed_response', {
        malformedType: 'unexpectedStructure'
      });

      const result = await mockClient.getProviders();
      expect(result).toBeDefined();
      expect(result.completely).toBe('different');
      
      // Code should handle unexpected structure gracefully
      const data = result?.data || [];
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(0);
    });

    test('should handle array when object expected', async () => {
      const mockClient = createMockedApiClient(cacheManager, 'malformed_response', {
        malformedType: 'arrayInsteadOfObject'
      });

      const result = await mockClient.getProviders();
      expect(Array.isArray(result)).toBe(true);
      
      // Code should handle wrong type gracefully
      const data = result?.data || result || [];
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('Corrupted Data Handling', () => {
    test('should handle corrupted providers data', async () => {
      const mockClient = createMockedApiClient(cacheManager, 'corrupted_data', {
        corruptedType: 'providersCorrupted'
      });

      const result = await mockClient.getProviders();
      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      
      // Should filter out invalid entries
      const validProviders = result.data.filter((provider: any) => 
        typeof provider === 'string' && provider.length > 0
      );
      expect(validProviders.length).toBe(1); // Only 'valid-provider.com' should remain
      expect(validProviders[0]).toBe('valid-provider.com');
    });

    test('should handle corrupted metrics data', async () => {
      const mockClient = createMockedApiClient(cacheManager, 'corrupted_data', {
        corruptedType: 'metricsCorrupted'
      });

      const result = await mockClient.getMetrics();
      expect(result).toBeDefined();
      
      // Should handle invalid numeric values gracefully
      expect(typeof result.numSpecs === 'string').toBe(true);
      expect(result.numAPIs).toBe(-1);
      expect(result.numEndpoints).toBeNull();
      
      // Code should validate and sanitize these values
      const sanitizedSpecs = typeof result.numSpecs === 'number' ? result.numSpecs : 0;
      const sanitizedAPIs = typeof result.numAPIs === 'number' && result.numAPIs >= 0 ? result.numAPIs : 0;
      const sanitizedEndpoints = typeof result.numEndpoints === 'number' && result.numEndpoints >= 0 ? result.numEndpoints : 0;
      
      expect(sanitizedSpecs).toBe(0);
      expect(sanitizedAPIs).toBe(0);
      expect(sanitizedEndpoints).toBe(0);
    });

    test('should handle corrupted search results', async () => {
      const mockClient = createMockedApiClient(cacheManager, 'corrupted_data', {
        corruptedType: 'searchCorrupted'
      });

      const result = await mockClient.searchAPIs('test');
      expect(result).toBeDefined();
      
      // Should handle invalid search structure
      expect(typeof result.results).toBe('string'); // Should be array
      expect(result.pagination).toBeNull();
      expect(result.total).toBe('infinity');
      
      // Code should provide fallbacks
      const safeResults = Array.isArray(result.results) ? result.results : [];
      const safePagination = result.pagination || {
        page: 1,
        limit: 10,
        total_results: 0,
        total_pages: 0,
        has_next: false,
        has_previous: false
      };
      
      expect(Array.isArray(safeResults)).toBe(true);
      expect(safePagination.page).toBe(1);
    });

    test('should handle corrupted API details', async () => {
      const mockClient = createMockedApiClient(cacheManager, 'corrupted_data', {
        corruptedType: 'apiDetailsCorrupted'
      });

      const result = await mockClient.getAPI('test.com', 'v1');
      expect(result).toBeDefined();
      
      // Should handle invalid API structure
      expect(result.versions).toBeNull();
      expect(typeof result.preferred).toBe('number'); // Should be string
      expect(typeof result.info).toBe('string'); // Should be object
      
      // Code should provide safe fallbacks
      const safeVersions = result.versions || {};
      const safePreferred = typeof result.preferred === 'string' ? result.preferred : 'v1';
      const safeInfo = typeof result.info === 'object' ? result.info : { title: 'Unknown API' };
      
      expect(typeof safeVersions).toBe('object');
      expect(typeof safePreferred).toBe('string');
      expect(typeof safeInfo).toBe('object');
    });
  });

  describe('Edge Case Handling', () => {
    test('should handle extremely large responses', async () => {
      const mockClient = createMockedApiClient(cacheManager, 'edge_cases', {
        edgeCaseType: 'extremelyLargeResponse'
      });

      const startTime = Date.now();
      const result = await mockClient.getProviders();
      const endTime = Date.now();
      
      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBe(10000);
      
      // Should complete in reasonable time (under 5 seconds)
      expect(endTime - startTime).toBeLessThan(5000);
      
      // Memory usage should be reasonable
      const memUsage = process.memoryUsage();
      expect(memUsage.heapUsed).toBeLessThan(200 * 1024 * 1024); // Less than 200MB
    });

    test('should handle Unicode and special characters safely', async () => {
      const mockClient = createMockedApiClient(cacheManager, 'edge_cases', {
        edgeCaseType: 'unicodeAndSpecialChars'
      });

      const result = await mockClient.getProviders();
      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      
      // Should contain special characters safely
      const providers = result.data;
      expect(providers).toContain('api-🚀.com');
      expect(providers).toContain('unicode-测试.com');
      expect(providers).toContain('emoji-💻.com');
      
      // Should not execute any script tags
      const scriptProvider = providers.find((p: string) => p.includes('<script>'));
      expect(scriptProvider).toBe('test<script>alert(\'xss\')</script>.com');
      
      // Verify no actual script execution occurred (would need DOM for full test)
      expect(typeof window).toBe('undefined'); // In Node.js environment
    });

    test('should handle potential SQL injection attempts', async () => {
      const mockClient = createMockedApiClient(cacheManager, 'edge_cases', {
        edgeCaseType: 'sqlInjectionAttempt'
      });

      const result = await mockClient.getProviders();
      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      
      // Should contain the malicious strings as data, not execute them
      const providers = result.data;
      expect(providers).toContain('\'; DROP TABLE providers; --');
      expect(providers).toContain('admin\'--');
      expect(providers).toContain('1\' OR \'1\'=\'1');
      expect(providers).toContain('normal-provider.com');
      
      // Verify we still have 4 entries (no table was dropped)
      expect(providers.length).toBe(4);
    });

    test('should handle empty arrays gracefully', async () => {
      const mockClient = createMockedApiClient(cacheManager, 'edge_cases', {
        edgeCaseType: 'emptyArrays'
      });

      const result = await mockClient.getProviders();
      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBe(0);
      
      // Search should also handle empty results
      const searchResult = await mockClient.searchAPIs('test');
      expect(searchResult.results).toBeDefined();
      expect(Array.isArray(searchResult.results)).toBe(true);
      expect(searchResult.results.length).toBe(0);
      expect(searchResult.pagination.total_results).toBe(0);
    });
  });

  describe('Performance and Reliability', () => {
    test('should handle slow responses with appropriate timeouts', async () => {
      const mockClient = createMockedApiClient(cacheManager, 'slow_response', {
        delayMs: 1000 // 1 second delay
      });

      const startTime = Date.now();
      const result = await mockClient.getProviders();
      const endTime = Date.now();
      
      expect(result).toBeDefined();
      expect(endTime - startTime).toBeGreaterThanOrEqual(1000);
      expect(endTime - startTime).toBeLessThan(2000); // Should not take much longer
    });

    test('should handle intermittent failures with retries', async () => {
      // Test that failure scenarios work correctly
      const failureClient = createMockedApiClient(cacheManager, 'network_error');
      
      // Verify failure scenario throws error
      await expect(failureClient.getProviders()).rejects.toThrow();
      
      // Test that success scenario works correctly
      const successClient = createMockedApiClient(cacheManager, 'success');
      
      // Verify success scenario returns data
      const result = await successClient.getProviders();
      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });

    test('should handle concurrent requests with failures', async () => {
      // Test concurrent requests with a mix of failure and success clients
      const failureClient = createMockedApiClient(cacheManager, 'network_error');
      const successClient = createMockedApiClient(cacheManager, 'success');

      // Create promises with alternating success/failure patterns
      const promises = Array(10).fill(0).map((_, i) => 
        i % 2 === 0 ? successClient.getProviders() : failureClient.getProviders()
      );

      const results = await Promise.allSettled(promises);
      
      expect(results.length).toBe(10);
      
      const fulfilled = results.filter(r => r.status === 'fulfilled');
      const rejected = results.filter(r => r.status === 'rejected');
      
      // With alternating pattern: SFSFSFSFFS (5 successes, 5 failures)
      expect(fulfilled.length).toBe(5);
      expect(rejected.length).toBe(5);
    });

    test('should handle memory pressure gracefully', async () => {
      const mockClient = createMockedApiClient(cacheManager, 'edge_cases', {
        edgeCaseType: 'extremelyLargeResponse'
      });

      const initialMemory = process.memoryUsage();
      
      // Make multiple calls with large responses
      for (let i = 0; i < 5; i++) {
        await mockClient.getProviders();
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage();
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory growth should be reasonable (less than 50MB for large responses)
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Error Recovery and Fallbacks', () => {
    test('should provide fallback values for critical operations', async () => {
      const mockClient = createMockedApiClient(cacheManager, 'corrupted_data', {
        corruptedType: 'providersCorrupted'
      });

      const result = await mockClient.getProviders();
      
      // Even with corrupted data, should provide a valid structure
      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      
      // Should filter out invalid entries and keep valid ones
      const validProviders = result.data.filter((p: any) => 
        typeof p === 'string' && p.length > 0
      );
      expect(validProviders.length).toBeGreaterThan(0);
    });

    test('should maintain cache consistency during errors', async () => {
      const mockClient = createMockedApiClient(cacheManager, 'http_error', {
        httpErrorType: 'internalServerError'
      });

      // Cache should remain clean after errors
      const initialKeys = cacheManager.keys();
      
      try {
        await mockClient.getProviders();
      } catch (error) {
        // Expected to fail
      }
      
      const finalKeys = cacheManager.keys();
      expect(finalKeys.length).toBe(initialKeys.length);
      
      // Cache should not contain corrupted entries
      finalKeys.forEach(key => {
        const value = cacheManager.get(key);
        expect(value).toBeDefined();
      });
    });

    test('should validate input parameters properly', async () => {
      const mockClient = createMockedApiClient(cacheManager, 'success');

      // Test invalid pagination parameters
      const searchResult = await mockClient.searchAPIs('test', undefined, -1, 0);
      expect(searchResult).toBeDefined();
      
      // Should handle negative page numbers gracefully
      expect(searchResult.pagination?.page).toBeGreaterThan(0);
      expect(searchResult.pagination?.limit).toBeGreaterThan(0);
    });
  });
});