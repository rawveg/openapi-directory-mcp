import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { tool } from '../../../src/tools/cache-tools/list-cache-keys.js';
import { ToolContext } from '../../../src/tools/types.js';

describe('list_cache_keys tool', () => {
  let mockContext: ToolContext;
  let mockCacheManager: any;

  beforeEach(() => {
    mockCacheManager = {
      keys: jest.fn(),
      getTtl: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
      getStats: jest.fn(),
      has: jest.fn(),
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
    expect(tool.name).toBe('list_cache_keys');
    expect(tool.description).toContain('List all cache keys');
    expect(tool.inputSchema.type).toBe('object');
    expect(tool.inputSchema.properties).toBeDefined();
  });

  test('should list cache keys', async () => {
    const mockKeys = ['key1', 'key2', 'key3'];
    
    mockCacheManager.keys.mockReturnValue(mockKeys);

    const result = await tool.execute({}, mockContext);

    expect(mockCacheManager.keys).toHaveBeenCalled();
    expect(result).toEqual({
      total: 3,
      keys: ['key1', 'key2', 'key3']
    });
  });

  test('should handle empty cache', async () => {
    mockCacheManager.keys.mockReturnValue([]);

    const result = await tool.execute({}, mockContext);

    expect(result).toEqual({
      total: 0,
      keys: []
    });
  });

  test('should handle cache manager errors', async () => {
    mockCacheManager.keys.mockImplementation(() => {
      throw new Error('Cache keys error');
    });

    await expect(tool.execute({}, mockContext))
      .rejects.toThrow('Cache keys error');
  });

  test('should handle various key formats', async () => {
    const mockKeys = [
      'api:v1:users',
      'cache:stats',
      'custom-key',
      'key_with_underscores',
      'key.with.dots'
    ];
    
    mockCacheManager.keys.mockReturnValue(mockKeys);

    const result = await tool.execute({}, mockContext);

    expect(result.total).toBe(5);
    expect(result.keys).toEqual(mockKeys);
  });

  test('should call keys method twice for total calculation', async () => {
    const mockKeys = ['key1', 'key2'];
    
    mockCacheManager.keys.mockReturnValue(mockKeys);

    await tool.execute({}, mockContext);

    // The implementation calls keys() twice - once for keys and once for total
    expect(mockCacheManager.keys).toHaveBeenCalledTimes(2);
  });
});