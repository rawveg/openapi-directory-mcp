import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { tool } from '../../../src/tools/cache-tools/clear-cache.js';
import { ToolContext } from '../../../src/tools/types.js';

describe('clear_cache tool', () => {
  let mockContext: ToolContext;
  let mockCacheManager: any;

  beforeEach(() => {
    mockCacheManager = {
      clear: jest.fn(),
      getStats: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
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
    expect(tool.name).toBe('clear_cache');
    expect(tool.description).toContain('Clear all cache entries');
    expect(tool.inputSchema.type).toBe('object');
    expect(tool.inputSchema.properties).toBeDefined();
  });

  test('should clear cache successfully', async () => {
    mockCacheManager.keys.mockReturnValue(['key1', 'key2', 'key3', 'key4', 'key5']);
    
    const result = await tool.execute({}, mockContext);

    expect(mockCacheManager.keys).toHaveBeenCalled();
    expect(mockCacheManager.clear).toHaveBeenCalled();
    expect(result).toEqual({
      message: 'Cache cleared successfully. Removed 5 entries.',
      cleared: 5
    });
  });

  test('should handle empty cache', async () => {
    mockCacheManager.keys.mockReturnValue([]);
    
    const result = await tool.execute({}, mockContext);

    expect(mockCacheManager.keys).toHaveBeenCalled();
    expect(mockCacheManager.clear).toHaveBeenCalled();
    expect(result).toEqual({
      message: 'Cache cleared successfully. Removed 0 entries.',
      cleared: 0
    });
  });

  test('should handle cache clear errors', async () => {
    mockCacheManager.keys.mockReturnValue(['key1', 'key2']);
    mockCacheManager.clear.mockImplementation(() => {
      throw new Error('Failed to clear cache');
    });

    await expect(tool.execute({}, mockContext))
      .rejects.toThrow('Failed to clear cache');
  });

  test('should handle keys error gracefully', async () => {
    mockCacheManager.keys.mockImplementation(() => {
      throw new Error('Keys error');
    });

    await expect(tool.execute({}, mockContext))
      .rejects.toThrow('Keys error');
  });
});