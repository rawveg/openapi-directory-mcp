// @ts-nocheck
import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { tool } from '../../../src/tools/api-discovery/get-metrics.js';
import { ToolContext } from '../../../src/tools/types.js';

describe('get_metrics tool', () => {
  let mockContext: ToolContext;
  let mockApiClient: any;

  beforeEach(() => {
    mockApiClient = {
      getMetrics: jest.fn(),
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
    expect(tool.name).toBe('get_metrics');
    expect(tool.description).toContain('statistics and metrics');
    expect(tool.inputSchema.type).toBe('object');
    expect(tool.inputSchema.properties).toBeDefined();
  });

  test('should return comprehensive metrics', async () => {
    const mockMetrics = {
      numSpecs: 2500,
      numAPIs: 1800,
      numEndpoints: 45000,
      unreachable: 25,
      invalid: 15,
      unofficial: 200,
      fixes: 180,
      fixedPct: 90,
      datasets: [
        {
          title: 'APIs.guru',
          data: [
            { name: 'Total APIs', value: 1600 },
            { name: 'Active APIs', value: 1575 },
            { name: 'Deprecated APIs', value: 25 }
          ]
        }
      ],
      stars: 12500,
      starsPercentile: 95,
      numProviders: 250
    };

    mockApiClient.getMetrics.mockResolvedValue(mockMetrics);

    const result = await tool.execute({}, mockContext);

    expect(mockApiClient.getMetrics).toHaveBeenCalled();
    expect(result).toEqual(mockMetrics);
  });

  test('should handle empty metrics', async () => {
    const emptyMetrics = {
      numSpecs: 0,
      numAPIs: 0,
      numEndpoints: 0,
      unreachable: 0,
      invalid: 0,
      unofficial: 0,
      fixes: 0,
      fixedPct: 0,
      datasets: [],
      stars: 0,
      starsPercentile: 0,
      numProviders: 0
    };

    mockApiClient.getMetrics.mockResolvedValue(emptyMetrics);

    const result = await tool.execute({}, mockContext);

    expect(result).toEqual(emptyMetrics);
  });

  test('should handle API client errors', async () => {
    mockApiClient.getMetrics.mockRejectedValue(
      new Error('Failed to fetch metrics')
    );

    await expect(tool.execute({}, mockContext))
      .rejects.toThrow('Failed to fetch metrics');
  });

  test('should handle malformed metrics response', async () => {
    mockApiClient.getMetrics.mockResolvedValue({
      // Missing required fields
      numSpecs: 100
    });

    // Should not throw, just return what's available
    const result = await tool.execute({}, mockContext);
    expect(result.numSpecs).toBe(100);
  });

  test('should handle null response', async () => {
    mockApiClient.getMetrics.mockResolvedValue(null);

    const result = await tool.execute({}, mockContext);

    expect(result).toBeNull();
  });

  test('should calculate quality percentages correctly', async () => {
    const mockMetrics = {
      numSpecs: 1000,
      numAPIs: 800,
      numEndpoints: 20000,
      unreachable: 50,   // 5% unreachable
      invalid: 30,       // 3% invalid
      unofficial: 200,   // 20% unofficial
      fixes: 150,        // 75% of invalid were fixed
      fixedPct: 75,
      datasets: [],
      stars: 5000,
      starsPercentile: 85,
      numProviders: 100
    };

    mockApiClient.getMetrics.mockResolvedValue(mockMetrics);

    const result = await tool.execute({}, mockContext);

    expect(result.fixedPct).toBe(75);
    expect(result.unreachable / result.numSpecs * 100).toBe(5);
    expect(result.invalid / result.numSpecs * 100).toBe(3);
  });

  test('should handle datasets with complex structure', async () => {
    const mockMetrics = {
      numSpecs: 100,
      numAPIs: 80,
      numEndpoints: 2000,
      unreachable: 2,
      invalid: 1,
      unofficial: 10,
      fixes: 1,
      fixedPct: 100,
      datasets: [
        {
          title: 'Primary Source',
          data: [
            { name: 'REST APIs', value: 60 },
            { name: 'GraphQL APIs', value: 15 },
            { name: 'gRPC APIs', value: 5 }
          ]
        },
        {
          title: 'Secondary Source',
          data: [
            { name: 'Public APIs', value: 70 },
            { name: 'Internal APIs', value: 10 }
          ]
        }
      ],
      stars: 1000,
      starsPercentile: 90,
      numProviders: 25
    };

    mockApiClient.getMetrics.mockResolvedValue(mockMetrics);

    const result = await tool.execute({}, mockContext);

    expect(result.datasets).toHaveLength(2);
    expect(result.datasets[0].title).toBe('Primary Source');
    expect(result.datasets[0].data).toHaveLength(3);
    expect(result.datasets[1].title).toBe('Secondary Source');
    expect(result.datasets[1].data).toHaveLength(2);
  });
});