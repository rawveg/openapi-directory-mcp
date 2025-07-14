import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { tool } from '../../../src/tools/api-details/search-apis.js';
import { ToolContext } from '../../../src/tools/types.js';

describe('search_apis tool', () => {
  let mockContext: ToolContext;
  let mockApiClient: any;

  beforeEach(() => {
    mockApiClient = {
      searchAPIs: jest.fn(),
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
    expect(tool.name).toBe('search_apis');
    expect(tool.description).toContain('Search for APIs');
    expect(tool.inputSchema.required).toContain('query');
  });

  test('should search APIs with default parameters', async () => {
    const mockResponse = {
      results: [
        {
          id: 'googleapis.com:calendar',
          title: 'Calendar API',
          description: 'Manipulates events and other calendar data'
        }
      ],
      total: 1,
      page: 1,
      limit: 20
    };

    mockApiClient.searchAPIs.mockResolvedValue(mockResponse);

    const result = await tool.execute({
      query: 'calendar'
    }, mockContext);

    expect(mockApiClient.searchAPIs).toHaveBeenCalledWith('calendar', undefined, 1, 20);
    expect(result).toEqual(mockResponse);
  });

  test('should search APIs with custom parameters', async () => {
    const mockResponse = {
      results: [],
      total: 0,
      page: 2,
      limit: 10
    };

    mockApiClient.searchAPIs.mockResolvedValue(mockResponse);

    const result = await tool.execute({
      query: 'payment',
      provider: 'stripe.com',
      page: 2,
      limit: 10
    }, mockContext);

    expect(mockApiClient.searchAPIs).toHaveBeenCalledWith('payment', 'stripe.com', 2, 10);
    expect(result).toEqual(mockResponse);
  });

  test('should validate required query parameter', async () => {
    await expect(tool.execute({}, mockContext))
      .rejects.toThrow();
  });

  test('should handle search with no results', async () => {
    const mockResponse = {
      results: [],
      total: 0,
      page: 1,
      limit: 20
    };

    mockApiClient.searchAPIs.mockResolvedValue(mockResponse);

    const result = await tool.execute({
      query: 'nonexistent-api'
    }, mockContext);

    expect(result.results).toEqual([]);
    expect(result.total).toBe(0);
  });

  test('should handle API client errors', async () => {
    mockApiClient.searchAPIs.mockRejectedValue(
      new Error('Search service unavailable')
    );

    await expect(tool.execute({
      query: 'test'
    }, mockContext)).rejects.toThrow('Search service unavailable');
  });

  test('should handle different search queries', async () => {
    const queries = [
      'google',
      'payment processing',
      'REST API',
      'social media'
    ];

    for (const query of queries) {
      const mockResponse = {
        results: [{ id: 'test', title: `${query} API` }],
        total: 1,
        page: 1,
        limit: 20
      };

      mockApiClient.searchAPIs.mockResolvedValue(mockResponse);
      
      const result = await tool.execute({ query }, mockContext);
      
      expect(mockApiClient.searchAPIs).toHaveBeenCalledWith(query, undefined, 1, 20);
      expect(result.results[0].title).toContain(query);
    }
  });

  test('should validate parameter types', async () => {
    await expect(tool.execute({
      query: 'test',
      page: 'not-a-number'
    }, mockContext)).rejects.toThrow();

    await expect(tool.execute({
      query: 'test',
      limit: 'not-a-number'
    }, mockContext)).rejects.toThrow();
  });
});