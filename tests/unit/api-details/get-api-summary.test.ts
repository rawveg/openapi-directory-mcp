import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { tool } from '../../../src/tools/api-details/get-api-summary.js';
import { ToolContext } from '../../../src/tools/types.js';

describe('get_api_summary tool', () => {
  let mockContext: ToolContext;
  let mockApiClient: any;

  beforeEach(() => {
    mockApiClient = {
      getAPISummaryById: jest.fn(),
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
    expect(tool.name).toBe('get_api_summary');
    expect(tool.description).toContain('Get basic information about a specific API');
    expect(tool.inputSchema.required).toContain('api_id');
    expect(tool.inputSchema.properties.api_id).toBeDefined();
  });

  test('should return API summary successfully', async () => {
    const mockApiSummary = {
      id: 'googleapis.com:admin',
      title: 'Admin SDK API',
      description: 'Admin SDK lets administrators manage their organization',
      provider: 'googleapis.com',
      service: 'admin',
      version: 'directory_v1',
      preferred: true,
      added: '2015-01-01T00:00:00Z',
      updated: '2023-12-01T10:00:00Z',
      openapiVer: '2.0',
      info: {
        version: 'directory_v1',
        title: 'Admin SDK API',
        description: 'Admin SDK lets administrators manage their organization'
      },
      externalDocs: {
        url: 'https://developers.google.com/admin-sdk/'
      }
    };

    mockApiClient.getAPISummaryById.mockResolvedValue(mockApiSummary);

    const result = await tool.execute({ api_id: 'googleapis.com:admin' }, mockContext);

    expect(mockApiClient.getAPISummaryById).toHaveBeenCalledWith('googleapis.com:admin');
    expect(result).toEqual(mockApiSummary);
  });

  test('should validate required api_id parameter', async () => {
    await expect(tool.execute({}, mockContext))
      .rejects.toThrow();
  });

  test('should validate api_id parameter type', async () => {
    await expect(tool.execute({ api_id: 123 }, mockContext))
      .rejects.toThrow();

    await expect(tool.execute({ api_id: null }, mockContext))
      .rejects.toThrow();

    await expect(tool.execute({ api_id: undefined }, mockContext))
      .rejects.toThrow();
  });

  test('should handle non-existent API', async () => {
    mockApiClient.getAPISummaryById.mockRejectedValue(
      new Error('API not found: nonexistent.com:api')
    );

    await expect(tool.execute({ api_id: 'nonexistent.com:api' }, mockContext))
      .rejects.toThrow('API not found: nonexistent.com:api');
  });

  test('should handle API client errors', async () => {
    mockApiClient.getAPISummaryById.mockRejectedValue(
      new Error('Network error')
    );

    await expect(tool.execute({ api_id: 'googleapis.com:admin' }, mockContext))
      .rejects.toThrow('Network error');
  });

  test('should handle different API ID formats', async () => {
    const testCases = [
      'googleapis.com:admin',
      'github.com',
      'stripe.com',
      'apis.guru:petstore',
      'azure.com:arm-compute'
    ];

    for (const apiId of testCases) {
      const mockSummary = {
        id: apiId,
        title: `Test API for ${apiId}`,
        description: 'Test description'
      };

      mockApiClient.getAPISummaryById.mockResolvedValue(mockSummary);
      
      const result = await tool.execute({ api_id: apiId }, mockContext);
      
      expect(mockApiClient.getAPISummaryById).toHaveBeenCalledWith(apiId);
      expect(result.id).toBe(apiId);
    }
  });

  test('should handle empty string api_id', async () => {
    mockApiClient.getAPISummaryById.mockResolvedValue(null);

    const result = await tool.execute({ api_id: '' }, mockContext);

    expect(mockApiClient.getAPISummaryById).toHaveBeenCalledWith('');
    expect(result).toBeNull();
  });

  test('should handle API with minimal information', async () => {
    const minimalApiSummary = {
      id: 'minimal.com:api',
      title: 'Minimal API',
      description: 'A minimal API'
    };

    mockApiClient.getAPISummaryById.mockResolvedValue(minimalApiSummary);

    const result = await tool.execute({ api_id: 'minimal.com:api' }, mockContext);

    expect(result).toEqual(minimalApiSummary);
  });
});