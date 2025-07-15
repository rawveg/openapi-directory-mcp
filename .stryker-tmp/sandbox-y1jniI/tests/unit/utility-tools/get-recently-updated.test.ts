// @ts-nocheck
import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { tool } from '../../../src/tools/utility-tools/get-recently-updated.js';
import { ToolContext } from '../../../src/tools/types.js';

describe('get_recently_updated tool', () => {
  let mockContext: ToolContext;
  let mockApiClient: any;

  beforeEach(() => {
    mockApiClient = {
      getRecentlyUpdatedAPIs: jest.fn(),
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
    expect(tool.name).toBe('get_recently_updated');
    expect(tool.description).toContain('Get recently updated APIs');
    expect(tool.inputSchema.properties.limit).toBeDefined();
  });

  test('should return recently updated APIs with default limit', async () => {
    const mockResponse = [
      {
        id: 'googleapis.com:calendar',
        title: 'Calendar API',
        updated: '2023-12-01T10:00:00Z',
        version: 'v3'
      },
      {
        id: 'stripe.com',
        title: 'Stripe API',
        updated: '2023-11-28T15:30:00Z',
        version: '2020-08-27'
      }
    ];

    mockApiClient.getRecentlyUpdatedAPIs.mockResolvedValue(mockResponse);

    const result = await tool.execute({}, mockContext);

    expect(mockApiClient.getRecentlyUpdatedAPIs).toHaveBeenCalledWith(10);
    expect(result).toEqual(mockResponse);
  });

  test('should respect custom limit parameter', async () => {
    const mockResponse = [
      {
        id: 'github.com',
        title: 'GitHub API',
        updated: '2023-12-01T08:00:00Z'
      }
    ];

    mockApiClient.getRecentlyUpdatedAPIs.mockResolvedValue(mockResponse);

    const result = await tool.execute({ limit: 5 }, mockContext);

    expect(mockApiClient.getRecentlyUpdatedAPIs).toHaveBeenCalledWith(5);
    expect(result).toEqual(mockResponse);
  });

  test('should handle API client errors', async () => {
    mockApiClient.getRecentlyUpdatedAPIs.mockRejectedValue(
      new Error('Failed to fetch recently updated APIs')
    );

    await expect(tool.execute({}, mockContext))
      .rejects.toThrow('Failed to fetch recently updated APIs');
  });

  test('should handle empty result', async () => {
    mockApiClient.getRecentlyUpdatedAPIs.mockResolvedValue([]);

    const result = await tool.execute({}, mockContext);

    expect(result).toEqual([]);
  });

  test('should validate limit parameter type', async () => {
    await expect(tool.execute({ limit: 'not-a-number' }, mockContext))
      .rejects.toThrow();
  });
});