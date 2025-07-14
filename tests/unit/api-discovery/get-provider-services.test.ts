import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { tool } from '../../../src/tools/api-discovery/get-provider-services.js';
import { ToolContext } from '../../../src/tools/types.js';

describe('get_provider_services tool', () => {
  let mockContext: ToolContext;
  let mockApiClient: any;

  beforeEach(() => {
    mockApiClient = {
      getServices: jest.fn(),
      primaryClient: {} as any,
      secondaryClient: {} as any,
      customClient: {} as any,
      cache: {} as any,
      getProviders: jest.fn(),
      getProvider: jest.fn(),
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
    expect(tool.name).toBe('get_provider_services');
    expect(tool.description).toContain('List all services for a specific provider');
    expect(tool.inputSchema.required).toContain('provider');
    expect(tool.inputSchema.properties.provider).toBeDefined();
  });

  test('should return services for a provider', async () => {
    const mockServices = [
      'admin',
      'calendar',
      'drive',
      'gmail',
      'sheets',
      'youtube'
    ];

    mockApiClient.getServices.mockResolvedValue(mockServices);

    const result = await tool.execute({ provider: 'googleapis.com' }, mockContext);

    expect(mockApiClient.getServices).toHaveBeenCalledWith('googleapis.com');
    expect(result).toEqual(mockServices);
  });

  test('should validate required provider parameter', async () => {
    await expect(tool.execute({}, mockContext))
      .rejects.toThrow();
  });

  test('should validate provider parameter type', async () => {
    await expect(tool.execute({ provider: 123 }, mockContext))
      .rejects.toThrow();

    await expect(tool.execute({ provider: null }, mockContext))
      .rejects.toThrow();

    await expect(tool.execute({ provider: undefined }, mockContext))
      .rejects.toThrow();
  });

  test('should handle non-existent provider', async () => {
    mockApiClient.getServices.mockRejectedValue(
      new Error('Provider not found: nonexistent.com')
    );

    await expect(tool.execute({ provider: 'nonexistent.com' }, mockContext))
      .rejects.toThrow('Provider not found: nonexistent.com');
  });

  test('should handle API client errors', async () => {
    mockApiClient.getServices.mockRejectedValue(
      new Error('Network error')
    );

    await expect(tool.execute({ provider: 'googleapis.com' }, mockContext))
      .rejects.toThrow('Network error');
  });

  test('should handle provider with no services', async () => {
    mockApiClient.getServices.mockResolvedValue([]);

    const result = await tool.execute({ provider: 'empty.com' }, mockContext);

    expect(result).toEqual([]);
  });

  test('should handle different provider formats', async () => {
    const testProviders = [
      'googleapis.com',
      'azure.com',
      'github.com',
      'stripe.com',
      'twilio.com'
    ];

    for (const provider of testProviders) {
      const mockServices = [`service1-${provider}`, `service2-${provider}`];
      mockApiClient.getServices.mockResolvedValue(mockServices);
      
      const result = await tool.execute({ provider }, mockContext);
      
      expect(mockApiClient.getServices).toHaveBeenCalledWith(provider);
      expect(result).toEqual(mockServices);
    }
  });

  test('should handle empty string provider', async () => {
    mockApiClient.getServices.mockResolvedValue([]);

    const result = await tool.execute({ provider: '' }, mockContext);

    expect(mockApiClient.getServices).toHaveBeenCalledWith('');
    expect(result).toEqual([]);
  });

  test('should handle large number of services', async () => {
    const manyServices = Array.from({ length: 100 }, (_, i) => `service-${i + 1}`);
    
    mockApiClient.getServices.mockResolvedValue(manyServices);

    const result = await tool.execute({ provider: 'bigprovider.com' }, mockContext);

    expect(result).toHaveLength(100);
    expect(result).toEqual(manyServices);
  });
});