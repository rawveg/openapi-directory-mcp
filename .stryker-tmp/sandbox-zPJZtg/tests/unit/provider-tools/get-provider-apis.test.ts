// @ts-nocheck
import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { tool } from '../../../src/tools/provider-tools/get-provider-apis.js';
import { ToolContext } from '../../../src/tools/types.js';

describe('get_provider_apis tool', () => {
  let mockContext: ToolContext;
  let mockApiClient: any;

  beforeEach(() => {
    mockApiClient = {
      getProvider: jest.fn(),
      primaryClient: {} as any,
      secondaryClient: {} as any,
      customClient: {} as any,
      cache: {} as any,
      getProviders: jest.fn(),
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
    expect(tool.name).toBe('get_provider_apis');
    expect(tool.description).toContain('List all APIs for a specific provider');
    expect(tool.inputSchema.required).toContain('provider');
    expect(tool.inputSchema.properties.provider).toBeDefined();
  });

  test('should return APIs for a provider', async () => {
    const mockResponse = {
      data: {
        'admin': {
          'directory_v1': {
            added: '2015-01-01T00:00:00Z',
            info: {
              title: 'Admin SDK API',
              version: 'directory_v1',
              description: 'Admin SDK lets administrators manage their organization'
            }
          }
        }
      }
    };

    mockApiClient.getProvider.mockResolvedValue(mockResponse);

    const result = await tool.execute({ provider: 'googleapis.com' }, mockContext);

    expect(mockApiClient.getProvider).toHaveBeenCalledWith('googleapis.com');
    expect(result).toEqual(mockResponse);
  });

  test('should handle empty provider response', async () => {
    const mockResponse = { data: {} };

    mockApiClient.getProvider.mockResolvedValue(mockResponse);

    const result = await tool.execute({ provider: 'empty.com' }, mockContext);

    expect(result).toEqual(mockResponse);
  });

  test('should validate required provider parameter', async () => {
    await expect(tool.execute({}, mockContext))
      .rejects.toThrow();
  });

  test('should handle non-existent provider', async () => {
    mockApiClient.getProvider.mockRejectedValue(
      new Error('Provider not found: nonexistent.com')
    );

    await expect(tool.execute({ provider: 'nonexistent.com' }, mockContext))
      .rejects.toThrow('Provider not found: nonexistent.com');
  });

  test('should handle API client errors', async () => {
    mockApiClient.getProvider.mockRejectedValue(
      new Error('Network error')
    );

    await expect(tool.execute({ provider: 'googleapis.com' }, mockContext))
      .rejects.toThrow('Network error');
  });

  test('should handle null response', async () => {
    mockApiClient.getProvider.mockResolvedValue(null);

    const result = await tool.execute({ provider: 'googleapis.com' }, mockContext);

    expect(result).toBeNull();
  });
});