import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { tool } from '../../../src/tools/utility-tools/get-popular-apis.js';
import { ToolContext } from '../../../src/tools/types.js';

describe('get_popular_apis tool', () => {
  let mockContext: ToolContext;
  let mockApiClient: any;

  beforeEach(() => {
    mockApiClient = {
      getPopularAPIs: jest.fn(),
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
      getRecentlyUpdatedAPIs: jest.fn(),
      getOpenAPISpec: jest.fn(),
      getAPIEndpoints: jest.fn(),
      getEndpointDetails: jest.fn(),
      getEndpointSchema: jest.fn(),
      getEndpointExamples: jest.fn()
    };

    mockContext = {
      apiClient: mockApiClient,
      cacheManager: {
        get: jest.fn(),
        set: jest.fn(),
        delete: jest.fn(),
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
      }
    } as ToolContext;
  });

  test('should have correct metadata', () => {
    expect(tool.name).toBe('get_popular_apis');
    expect(tool.description).toContain('most popular APIs');
    expect(tool.inputSchema.type).toBe('object');
    expect(tool.inputSchema.properties.limit).toBeDefined();
  });

  test('should return popular APIs', async () => {
    const mockResponse = [
      {
        id: 'googleapis.com:admin',
        title: 'Admin SDK API',
        description: 'Admin SDK lets administrators manage their organization',
        provider: 'googleapis.com',
        category: 'admin',
        popularity_score: 95.5,
        stars: 1200,
        updated: '2023-12-01T10:00:00Z'
      },
      {
        id: 'stripe.com',
        title: 'Stripe API',
        description: 'The Stripe API for online payments',
        provider: 'stripe.com',
        category: 'payment',
        popularity_score: 92.3,
        stars: 980,
        updated: '2023-11-15T14:30:00Z'
      }
    ];

    mockApiClient.getPopularAPIs.mockResolvedValue(mockResponse);

    const result = await tool.execute({}, mockContext);

    expect(mockApiClient.getPopularAPIs).toHaveBeenCalledWith();
    expect(result).toEqual(mockResponse);
  });

  test('should handle empty popular APIs list', async () => {
    mockApiClient.getPopularAPIs.mockResolvedValue([]);

    const result = await tool.execute({}, mockContext);

    expect(result).toEqual([]);
  });

  test('should handle API client errors', async () => {
    mockApiClient.getPopularAPIs.mockRejectedValue(
      new Error('Failed to fetch popular APIs')
    );

    await expect(tool.execute({}, mockContext))
      .rejects.toThrow('Failed to fetch popular APIs');
  });

  test('should handle malformed response', async () => {
    mockApiClient.getPopularAPIs.mockResolvedValue(null);

    const result = await tool.execute({}, mockContext);

    expect(result).toBeNull();
  });

  test('should ignore limit parameter', async () => {
    const mockResponse = [{ id: 'test', title: 'Test API' }];
    mockApiClient.getPopularAPIs.mockResolvedValue(mockResponse);

    // The implementation ignores the limit parameter
    const result = await tool.execute({ limit: 5 }, mockContext);

    expect(mockApiClient.getPopularAPIs).toHaveBeenCalledWith();
    expect(result).toEqual(mockResponse);
  });
});