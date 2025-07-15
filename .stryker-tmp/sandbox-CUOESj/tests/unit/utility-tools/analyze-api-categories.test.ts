// @ts-nocheck
import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { tool } from '../../../src/tools/utility-tools/analyze-api-categories.js';
import { ToolContext } from '../../../src/tools/types.js';

describe('analyze_api_categories tool', () => {
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
    expect(tool.name).toBe('analyze_api_categories');
    expect(tool.description).toContain('Analyze API distribution by categories');
    expect(tool.inputSchema.properties.provider).toBeDefined();
  });

  test('should analyze API categories', async () => {
    const mockAPIs = {
      'googleapis.com:admin': {
        preferred: 'v1',
        versions: {
          'v1': {
            info: {
              'x-apisguru-categories': ['enterprise', 'admin']
            }
          }
        }
      },
      'stripe.com': {
        preferred: '2020-08-27',
        versions: {
          '2020-08-27': {
            info: {
              'x-apisguru-categories': ['payment', 'financial']
            }
          }
        }
      },
      'github.com': {
        preferred: 'v3',
        versions: {
          'v3': {
            info: {
              'x-apisguru-categories': ['developer_tools', 'enterprise']
            }
          }
        }
      }
    };

    mockApiClient.listAPIs.mockResolvedValue(mockAPIs);

    const result = await tool.execute({}, mockContext);

    expect(mockApiClient.listAPIs).toHaveBeenCalled();
    expect(result).toEqual({
      totalAPIs: 3,
      categories: [
        { category: 'enterprise', count: 2 },
        { category: 'admin', count: 1 },
        { category: 'payment', count: 1 },
        { category: 'financial', count: 1 },
        { category: 'developer_tools', count: 1 }
      ]
    });
  });

  test('should filter by provider when specified', async () => {
    const mockAPIs = {
      'googleapis.com:admin': {
        preferred: 'v1',
        versions: {
          'v1': {
            info: {
              'x-apisguru-categories': ['enterprise', 'admin']
            }
          }
        }
      },
      'googleapis.com:calendar': {
        preferred: 'v3',
        versions: {
          'v3': {
            info: {
              'x-apisguru-categories': ['productivity', 'enterprise']
            }
          }
        }
      },
      'stripe.com': {
        preferred: '2020-08-27',
        versions: {
          '2020-08-27': {
            info: {
              'x-apisguru-categories': ['payment']
            }
          }
        }
      }
    };

    mockApiClient.listAPIs.mockResolvedValue(mockAPIs);

    const result = await tool.execute({ provider: 'googleapis.com' }, mockContext);

    expect(result).toEqual({
      totalAPIs: 2,
      categories: [
        { category: 'enterprise', count: 2 },
        { category: 'admin', count: 1 },
        { category: 'productivity', count: 1 }
      ]
    });
  });

  test('should handle APIs without categories', async () => {
    const mockAPIs = {
      'test.com:api': {
        preferred: 'v1',
        versions: {
          'v1': {
            info: {
              title: 'Test API'
              // No x-apisguru-categories
            }
          }
        }
      },
      'example.com:api': {
        preferred: 'v2',
        versions: {
          'v2': {
            info: {
              'x-apisguru-categories': ['test']
            }
          }
        }
      }
    };

    mockApiClient.listAPIs.mockResolvedValue(mockAPIs);

    const result = await tool.execute({}, mockContext);

    expect(result).toEqual({
      totalAPIs: 2,
      categories: [
        { category: 'test', count: 1 }
      ]
    });
  });

  test('should handle empty API list', async () => {
    mockApiClient.listAPIs.mockResolvedValue({});

    const result = await tool.execute({}, mockContext);

    expect(result).toEqual({
      totalAPIs: 0,
      categories: []
    });
  });

  test('should handle API client errors', async () => {
    mockApiClient.listAPIs.mockRejectedValue(
      new Error('Failed to fetch APIs')
    );

    await expect(tool.execute({}, mockContext))
      .rejects.toThrow('Failed to fetch APIs');
  });

  test('should handle invalid categories data', async () => {
    const mockAPIs = {
      'test.com:api': {
        preferred: 'v1',
        versions: {
          'v1': {
            info: {
              'x-apisguru-categories': 'not-an-array' // Invalid format
            }
          }
        }
      }
    };

    mockApiClient.listAPIs.mockResolvedValue(mockAPIs);

    const result = await tool.execute({}, mockContext);

    expect(result).toEqual({
      totalAPIs: 1,
      categories: []
    });
  });
});