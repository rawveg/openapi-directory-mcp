// @ts-nocheck
import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { tool } from '../../../src/tools/cache-tools/cache-info.js';
import { ToolContext } from '../../../src/tools/types.js';

describe('cache_info tool', () => {
  let mockContext: ToolContext;
  let mockCacheManager: any;

  beforeEach(() => {
    mockCacheManager = {
      isEnabled: jest.fn(),
      getConfig: jest.fn(),
      getSize: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
      getStats: jest.fn(),
      keys: jest.fn(),
      has: jest.fn(),
      getTtl: jest.fn(),
      getMemoryUsage: jest.fn(),
      prune: jest.fn(),
      setEnabled: jest.fn(),
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
    expect(tool.name).toBe('cache_info');
    expect(tool.description).toContain('cache configuration');
    expect(tool.inputSchema.type).toBe('object');
    expect(tool.inputSchema.properties).toBeDefined();
  });

  test('should return cache information', async () => {
    const mockConfig = {
      stdTTL: 600,
      checkperiod: 120,
      useClones: false,
      deleteOnExpire: true,
      maxKeys: 1000
    };

    mockCacheManager.isEnabled.mockReturnValue(true);
    mockCacheManager.getConfig.mockReturnValue(mockConfig);
    mockCacheManager.getSize.mockReturnValue(150);

    const result = await tool.execute({}, mockContext);

    expect(mockCacheManager.isEnabled).toHaveBeenCalled();
    expect(mockCacheManager.getConfig).toHaveBeenCalled();
    expect(mockCacheManager.getSize).toHaveBeenCalled();
    expect(result).toEqual({
      enabled: true,
      config: mockConfig,
      size: 150
    });
  });

  test('should handle disabled cache', async () => {
    const mockConfig = {
      stdTTL: 0,
      checkperiod: 0,
      useClones: false,
      deleteOnExpire: false,
      maxKeys: 0
    };

    mockCacheManager.isEnabled.mockReturnValue(false);
    mockCacheManager.getConfig.mockReturnValue(mockConfig);
    mockCacheManager.getSize.mockReturnValue(0);

    const result = await tool.execute({}, mockContext);

    expect(result).toEqual({
      enabled: false,
      config: mockConfig,
      size: 0
    });
  });

  test('should handle cache manager errors gracefully', async () => {
    mockCacheManager.isEnabled.mockImplementation(() => {
      throw new Error('Cache access error');
    });

    await expect(tool.execute({}, mockContext))
      .rejects.toThrow('Cache access error');
  });

  test('should handle partial cache manager failures', async () => {
    mockCacheManager.isEnabled.mockReturnValue(true);
    mockCacheManager.getConfig.mockImplementation(() => {
      throw new Error('Config access error');
    });

    await expect(tool.execute({}, mockContext))
      .rejects.toThrow('Config access error');
  });

  test('should return different cache sizes', async () => {
    const testCases = [0, 1, 50, 500, 1000];

    for (const size of testCases) {
      mockCacheManager.isEnabled.mockReturnValue(true);
      mockCacheManager.getConfig.mockReturnValue({});
      mockCacheManager.getSize.mockReturnValue(size);

      const result = await tool.execute({}, mockContext);
      expect(result.size).toBe(size);
    }
  });
});