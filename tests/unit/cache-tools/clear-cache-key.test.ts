import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { tool } from '../../../src/tools/cache-tools/clear-cache-key.js';
import { ToolContext } from '../../../src/tools/types.js';

describe('clear_cache_key tool', () => {
  let mockContext: ToolContext;
  let mockCacheManager: any;

  beforeEach(() => {
    mockCacheManager = {
      delete: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
      clear: jest.fn(),
      getStats: jest.fn(),
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
    expect(tool.name).toBe('clear_cache_key');
    expect(tool.description).toContain('Clear a specific cache key');
    expect(tool.inputSchema.required).toContain('key');
    expect(tool.inputSchema.properties.key).toBeDefined();
  });

  test('should clear existing cache key successfully', async () => {
    mockCacheManager.delete.mockReturnValue(1);

    const result = await tool.execute({ key: 'test-key' }, mockContext);

    expect(mockCacheManager.delete).toHaveBeenCalledWith('test-key');
    expect(result).toEqual({
      message: "Cache key 'test-key' cleared successfully.",
      deleted: 1
    });
  });

  test('should handle non-existent cache key', async () => {
    mockCacheManager.delete.mockReturnValue(0);

    const result = await tool.execute({ key: 'nonexistent-key' }, mockContext);

    expect(mockCacheManager.delete).toHaveBeenCalledWith('nonexistent-key');
    expect(result).toEqual({
      message: "Cache key 'nonexistent-key' not found.",
      deleted: 0
    });
  });

  test('should validate required key parameter', async () => {
    await expect(tool.execute({}, mockContext))
      .rejects.toThrow();
  });

  test('should validate key parameter type', async () => {
    await expect(tool.execute({ key: 123 }, mockContext))
      .rejects.toThrow();

    await expect(tool.execute({ key: null }, mockContext))
      .rejects.toThrow();

    await expect(tool.execute({ key: undefined }, mockContext))
      .rejects.toThrow();
  });

  test('should handle empty string key', async () => {
    mockCacheManager.delete.mockReturnValue(0);

    const result = await tool.execute({ key: '' }, mockContext);

    expect(mockCacheManager.delete).toHaveBeenCalledWith('');
    expect(result.deleted).toBe(0);
  });

  test('should handle special characters in key', async () => {
    const specialKeys = [
      'key-with-dashes',
      'key_with_underscores',
      'key.with.dots',
      'key:with:colons',
      'key/with/slashes',
      'key with spaces'
    ];

    for (const key of specialKeys) {
      mockCacheManager.delete.mockReturnValue(1);
      
      const result = await tool.execute({ key }, mockContext);
      
      expect(mockCacheManager.delete).toHaveBeenCalledWith(key);
      expect(result.deleted).toBe(1);
    }
  });

  test('should handle cache manager errors', async () => {
    mockCacheManager.delete.mockImplementation(() => {
      throw new Error('Cache delete error');
    });

    await expect(tool.execute({ key: 'test-key' }, mockContext))
      .rejects.toThrow('Cache delete error');
  });

  test('should handle long key names', async () => {
    const longKey = 'a'.repeat(1000);
    mockCacheManager.delete.mockReturnValue(1);

    const result = await tool.execute({ key: longKey }, mockContext);

    expect(mockCacheManager.delete).toHaveBeenCalledWith(longKey);
    expect(result.deleted).toBe(1);
  });
});