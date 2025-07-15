// @ts-nocheck
import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { tool } from '../../../src/tools/api-discovery/get-providers.js';
import { ToolContext } from '../../../src/tools/types.js';

describe('get_providers tool', () => {
  let mockContext: ToolContext;
  let mockApiClient: any;

  beforeEach(() => {
    mockApiClient = {
      getProviders: jest.fn(),
      primaryClient: {} as any,
      secondaryClient: {} as any,
      customClient: {} as any,
      cache: {} as any,
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
    expect(tool.name).toBe('get_providers');
    expect(tool.description).toContain('List all API providers');
    expect(tool.inputSchema.type).toBe('object');
    expect(tool.inputSchema.properties).toBeDefined();
  });

  test('should return list of providers', async () => {
    const mockProviders = [
      'googleapis.com',
      'azure.com',
      'github.com',
      'stripe.com',
      'twilio.com'
    ];

    mockApiClient.getProviders.mockResolvedValue(mockProviders);

    const result = await tool.execute({}, mockContext);

    expect(mockApiClient.getProviders).toHaveBeenCalled();
    expect(result).toEqual(mockProviders);
  });

  test('should handle empty provider list', async () => {
    mockApiClient.getProviders.mockResolvedValue([]);

    const result = await tool.execute({}, mockContext);

    expect(result).toEqual([]);
  });

  test('should handle API client errors', async () => {
    mockApiClient.getProviders.mockRejectedValue(
      new Error('Failed to fetch providers')
    );

    await expect(tool.execute({}, mockContext))
      .rejects.toThrow('Failed to fetch providers');
  });

  test('should handle null response', async () => {
    mockApiClient.getProviders.mockResolvedValue(null);

    const result = await tool.execute({}, mockContext);

    expect(result).toBeNull();
  });

  test('should handle various provider formats', async () => {
    const mockProviders = [
      'googleapis.com',
      'azure.com', 
      'github.com',
      'api.example.com'
    ];

    mockApiClient.getProviders.mockResolvedValue(mockProviders);

    const result = await tool.execute({}, mockContext);

    expect(result).toEqual(mockProviders);
  });
});