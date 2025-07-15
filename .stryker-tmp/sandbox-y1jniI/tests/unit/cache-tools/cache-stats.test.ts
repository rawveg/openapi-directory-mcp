// @ts-nocheck
import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { tool } from '../../../src/tools/cache-tools/cache-stats.js';
import { ToolContext } from '../../../src/tools/types.js';

describe('cache_stats tool', () => {
  let mockContext: ToolContext;
  let mockCacheManager: any;

  beforeEach(() => {
    mockCacheManager = {
      getStats: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
      keys: jest.fn(),
      has: jest.fn(),
      getTtl: jest.fn(),
      getSize: jest.fn(),
      getMemoryUsage: jest.fn(),
      prune: jest.fn(),
      setEnabled: jest.fn(),
      isEnabled: jest.fn(),
      getConfig: jest.fn(),
      invalidatePattern: jest.fn(),
      invalidateKeys: jest.fn(),
      warmCache: jest.fn(),
      performHealthCheck: jest.fn()
    };

    mockContext = {
      apiClient: {
        primaryClient: {} as any,
        secondaryClient: {} as any,
        customClient: {} as any,
        cache: {} as any,
        getProviders: jest.fn(),
        getProvider: jest.fn(),
        getServices: jest.fn(),
        getAPI: jest.fn(),
        getServiceAPI: jest.fn(),
        listAPIs: jest.fn(),
        getMetrics: jest.fn(),
        hasAPI: jest.fn(),
        hasProvider: jest.fn(),
        getPaginatedAPIs: jest.fn(),
        searchAPIs: jest.fn(),
        getManifestManager: jest.fn(),
        invalidateCache: jest.fn(),
        getCustomSpecsSummary: jest.fn(),
        getProviderStats: jest.fn(),
        getAPISummaryById: jest.fn(),
        getPopularAPIs: jest.fn(),
        getRecentlyUpdatedAPIs: jest.fn(),
        getOpenAPISpec: jest.fn(),
        getAPIEndpoints: jest.fn(),
        getEndpointDetails: jest.fn(),
        getEndpointSchema: jest.fn(),
        getEndpointExamples: jest.fn()
      },
      cacheManager: mockCacheManager
    } as ToolContext;
  });

  test('should have correct metadata', () => {
    expect(tool.name).toBe('cache_stats');
    expect(tool.description).toContain('cache statistics');
    expect(tool.inputSchema.type).toBe('object');
    expect(tool.inputSchema.properties).toBeDefined();
  });

  test('should return cache statistics', async () => {
    const mockStats = {
      hits: 150,
      misses: 25,
      keys: 42,
      ksize: 1024,
      vsize: 2048
    };

    mockCacheManager.getStats.mockReturnValue(mockStats);

    const result = await tool.execute({}, mockContext);

    expect(mockCacheManager.getStats).toHaveBeenCalled();
    expect(result).toEqual(mockStats);
  });

  test('should handle cache manager errors gracefully', async () => {
    mockCacheManager.getStats.mockImplementation(() => {
      throw new Error('Cache error');
    });

    await expect(tool.execute({}, mockContext))
      .rejects.toThrow('Cache error');
  });
});