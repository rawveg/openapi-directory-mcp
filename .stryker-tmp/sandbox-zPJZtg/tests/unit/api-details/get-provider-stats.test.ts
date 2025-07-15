// @ts-nocheck
import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { tool } from '../../../src/tools/api-details/get-provider-stats.js';
import { ToolContext } from '../../../src/tools/types.js';

describe('get_provider_stats tool', () => {
  let mockContext: ToolContext;
  let mockApiClient: any;

  beforeEach(() => {
    mockApiClient = {
      getProviderStats: jest.fn(),
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
    expect(tool.name).toBe('get_provider_stats');
    expect(tool.description).toContain('Get statistics for a specific provider');
    expect(tool.inputSchema.required).toContain('provider');
  });

  test('should return provider statistics successfully', async () => {
    const mockStats = {
      provider: 'googleapis.com',
      totalAPIs: 45,
      totalServices: 12,
      totalEndpoints: 2847,
      averageEndpointsPerAPI: 63.3,
      mostPopularAPI: {
        id: 'googleapis.com:calendar',
        title: 'Calendar API',
        popularity_score: 95.2
      },
      categories: [
        { name: 'productivity', count: 8 },
        { name: 'enterprise', count: 12 },
        { name: 'developer_tools', count: 5 }
      ],
      lastUpdated: '2023-12-01T10:00:00Z',
      healthStatus: 'healthy',
      reliability: 99.8
    };

    mockApiClient.getProviderStats.mockResolvedValue(mockStats);

    const result = await tool.execute({
      provider: 'googleapis.com'
    }, mockContext);

    expect(mockApiClient.getProviderStats).toHaveBeenCalledWith('googleapis.com');
    expect(result).toEqual(mockStats);
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
  });

  test('should handle non-existent provider', async () => {
    mockApiClient.getProviderStats.mockRejectedValue(
      new Error('Provider not found: nonexistent.com')
    );

    await expect(tool.execute({
      provider: 'nonexistent.com'
    }, mockContext)).rejects.toThrow('Provider not found: nonexistent.com');
  });

  test('should handle API client errors', async () => {
    mockApiClient.getProviderStats.mockRejectedValue(
      new Error('Stats service unavailable')
    );

    await expect(tool.execute({
      provider: 'googleapis.com'
    }, mockContext)).rejects.toThrow('Stats service unavailable');
  });

  test('should handle different provider formats', async () => {
    const providers = [
      'googleapis.com',
      'azure.com',
      'github.com',
      'stripe.com',
      'twilio.com'
    ];

    for (const provider of providers) {
      const mockStats = {
        provider,
        totalAPIs: 10,
        totalServices: 5,
        totalEndpoints: 100
      };

      mockApiClient.getProviderStats.mockResolvedValue(mockStats);
      
      const result = await tool.execute({ provider }, mockContext);
      
      expect(mockApiClient.getProviderStats).toHaveBeenCalledWith(provider);
      expect(result.provider).toBe(provider);
    }
  });

  test('should handle provider with minimal stats', async () => {
    const mockStats = {
      provider: 'small.com',
      totalAPIs: 1,
      totalServices: 1,
      totalEndpoints: 5
    };

    mockApiClient.getProviderStats.mockResolvedValue(mockStats);

    const result = await tool.execute({
      provider: 'small.com'
    }, mockContext);

    expect(result).toEqual(mockStats);
  });

  test('should handle empty string provider', async () => {
    mockApiClient.getProviderStats.mockResolvedValue(null);

    const result = await tool.execute({ provider: '' }, mockContext);

    expect(mockApiClient.getProviderStats).toHaveBeenCalledWith('');
    expect(result).toBeNull();
  });
});