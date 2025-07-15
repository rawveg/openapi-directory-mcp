// @ts-nocheck
import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { tool } from '../../../src/tools/api-details/get-api.js';
import { ToolContext } from '../../../src/tools/types.js';

describe('get_api tool', () => {
  let mockContext: ToolContext;
  let mockApiClient: any;

  beforeEach(() => {
    mockApiClient = {
      getAPI: jest.fn(),
      getServiceAPI: jest.fn(),
      primaryClient: {} as any,
      secondaryClient: {} as any,
      customClient: {} as any,
      cache: {} as any,
      getProviders: jest.fn(),
      getProvider: jest.fn(),
      getServices: jest.fn(),
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
    expect(tool.name).toBe('get_api');
    expect(tool.description).toContain('Get detailed information about a specific API');
    expect(tool.inputSchema.required).toEqual(['provider', 'api']);
  });

  test('should call getAPI when no service is provided', async () => {
    const mockResponse = {
      provider: 'stripe.com',
      api: '2020-08-27',
      info: {
        title: 'Stripe API',
        version: '2020-08-27'
      }
    };

    mockApiClient.getAPI.mockResolvedValue(mockResponse);

    const result = await tool.execute({
      provider: 'stripe.com',
      api: '2020-08-27'
    }, mockContext);

    expect(mockApiClient.getAPI).toHaveBeenCalledWith('stripe.com', '2020-08-27');
    expect(mockApiClient.getServiceAPI).not.toHaveBeenCalled();
    expect(result).toEqual(mockResponse);
  });

  test('should call getServiceAPI when service is provided', async () => {
    const mockResponse = {
      provider: 'googleapis.com',
      service: 'admin',
      api: 'directory_v1',
      info: {
        title: 'Admin SDK API',
        version: 'directory_v1'
      }
    };

    mockApiClient.getServiceAPI.mockResolvedValue(mockResponse);

    const result = await tool.execute({
      provider: 'googleapis.com',
      service: 'admin',
      api: 'directory_v1'
    }, mockContext);

    expect(mockApiClient.getServiceAPI).toHaveBeenCalledWith('googleapis.com', 'admin', 'directory_v1');
    expect(mockApiClient.getAPI).not.toHaveBeenCalled();
    expect(result).toEqual(mockResponse);
  });

  test('should validate required parameters', async () => {
    await expect(tool.execute({}, mockContext))
      .rejects.toThrow();

    await expect(tool.execute({ provider: 'test' }, mockContext))
      .rejects.toThrow();
  });

  test('should handle API client errors for direct API', async () => {
    mockApiClient.getAPI.mockRejectedValue(
      new Error('API not found')
    );

    await expect(tool.execute({
      provider: 'nonexistent.com',
      api: 'v1'
    }, mockContext)).rejects.toThrow('API not found');
  });

  test('should handle API client errors for service API', async () => {
    mockApiClient.getServiceAPI.mockRejectedValue(
      new Error('Service API not found')
    );

    await expect(tool.execute({
      provider: 'googleapis.com',
      service: 'nonexistent',
      api: 'v1'
    }, mockContext)).rejects.toThrow('Service API not found');
  });

  test('should handle different API formats', async () => {
    const testCases = [
      { provider: 'github.com', api: 'v3' },
      { provider: 'azure.com', api: '2020-01-01' },
      { provider: 'twilio.com', api: '2010-04-01' }
    ];

    for (const testCase of testCases) {
      const mockResponse = { ...testCase, info: { title: 'Test API' } };
      mockApiClient.getAPI.mockResolvedValue(mockResponse);
      
      const result = await tool.execute(testCase, mockContext);
      
      expect(mockApiClient.getAPI).toHaveBeenCalledWith(testCase.provider, testCase.api);
      expect(result).toEqual(mockResponse);
    }
  });
});