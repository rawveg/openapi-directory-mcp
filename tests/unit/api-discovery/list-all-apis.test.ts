import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { tool } from '../../../src/tools/api-discovery/list-all-apis.js';
import { ToolContext } from '../../../src/tools/types.js';

describe('list_all_apis tool', () => {
  let mockContext: ToolContext;
  let mockApiClient: any;

  beforeEach(() => {
    mockApiClient = {
      listAPIs: jest.fn(),
      primaryClient: {} as any,
      secondaryClient: {} as any,
      customClient: {} as any,
      cache: {} as any,
      getProviders: jest.fn(),
      getProvider: jest.fn(),
      getServices: jest.fn(),
      getAPI: jest.fn(),
      getServiceAPI: jest.fn(),
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
    expect(tool.name).toBe('list_all_apis');
    expect(tool.description).toContain('List all APIs in the directory');
    expect(tool.inputSchema.type).toBe('object');
  });

  test('should return list of all APIs', async () => {
    const mockResponse = {
      results: [
        {
          id: 'googleapis.com:admin',
          title: 'Admin SDK API',
          provider: 'googleapis.com',
          preferred: 'v1',
          categories: ['admin']
        },
        {
          id: 'stripe.com',
          title: 'Stripe API',
          provider: 'stripe.com',
          preferred: 'v1',
          categories: ['payment']
        },
        {
          id: 'github.com',
          title: 'GitHub API',
          provider: 'github.com',
          preferred: 'v3',
          categories: ['developer']
        }
      ],
      pagination: {
        page: 1,
        limit: 50,
        total_results: 3,
        total_pages: 1,
        has_next: false,
        has_previous: false
      }
    };

    mockApiClient.getPaginatedAPIs.mockResolvedValue(mockResponse);

    const result = await tool.execute({}, mockContext);

    expect(mockApiClient.getPaginatedAPIs).toHaveBeenCalled();
    expect(result).toEqual(mockResponse);
  });

  test('should handle empty API list', async () => {
    const emptyResponse = {
      results: [],
      pagination: {
        page: 1,
        limit: 50,
        total_results: 0,
        total_pages: 0,
        has_next: false,
        has_previous: false
      }
    };
    
    mockApiClient.getPaginatedAPIs.mockResolvedValue(emptyResponse);

    const result = await tool.execute({}, mockContext);

    expect(result).toEqual(emptyResponse);
  });

  test('should handle API client errors', async () => {
    mockApiClient.getPaginatedAPIs.mockRejectedValue(
      new Error('Failed to fetch API list')
    );

    await expect(tool.execute({}, mockContext))
      .rejects.toThrow('Failed to fetch API list');
  });

  test('should handle null response', async () => {
    mockApiClient.getPaginatedAPIs.mockResolvedValue(null);

    const result = await tool.execute({}, mockContext);

    expect(result).toBeNull();
  });
});