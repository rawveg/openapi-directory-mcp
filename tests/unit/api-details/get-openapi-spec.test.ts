import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { tool } from '../../../src/tools/api-details/get-openapi-spec.js';
import { ToolContext } from '../../../src/tools/types.js';

describe('get_openapi_spec tool', () => {
  let mockContext: ToolContext;
  let mockApiClient: any;

  beforeEach(() => {
    mockApiClient = {
      getOpenAPISpec: jest.fn(),
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
      getAPISummaryById: jest.fn(),
      getPopularAPIs: jest.fn(),
      getRecentlyUpdatedAPIs: jest.fn(),
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
    expect(tool.name).toBe('get_openapi_spec');
    expect(tool.description).toContain('Get the OpenAPI specification');
    expect(tool.inputSchema.required).toContain('url');
    expect(tool.inputSchema.properties.url).toBeDefined();
  });

  test('should return OpenAPI specification successfully', async () => {
    const mockSpec = {
      openapi: '3.0.0',
      info: {
        title: 'Example API',
        version: '1.0.0',
        description: 'An example API specification'
      },
      servers: [
        {
          url: 'https://api.example.com/v1',
          description: 'Production server'
        }
      ],
      paths: {
        '/users': {
          get: {
            summary: 'List users',
            responses: {
              '200': {
                description: 'List of users',
                content: {
                  'application/json': {
                    schema: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          name: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    };

    mockApiClient.getOpenAPISpec.mockResolvedValue(mockSpec);

    const result = await tool.execute({
      url: 'https://api.example.com/openapi.json'
    }, mockContext);

    expect(mockApiClient.getOpenAPISpec).toHaveBeenCalledWith('https://api.example.com/openapi.json');
    expect(result).toEqual(mockSpec);
  });

  test('should validate required url parameter', async () => {
    await expect(tool.execute({}, mockContext))
      .rejects.toThrow();
  });

  test('should validate url parameter type', async () => {
    await expect(tool.execute({ url: 123 }, mockContext))
      .rejects.toThrow();

    await expect(tool.execute({ url: null }, mockContext))
      .rejects.toThrow();
  });

  test('should handle different URL formats', async () => {
    const urls = [
      'https://api.example.com/openapi.json',
      'https://raw.githubusercontent.com/example/repo/main/openapi.yaml',
      'https://petstore.swagger.io/v2/swagger.json',
      'https://api.apis.guru/v2/specs/googleapis.com/admin/directory_v1/swagger.yaml'
    ];

    for (const url of urls) {
      const mockSpec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' }
      };

      mockApiClient.getOpenAPISpec.mockResolvedValue(mockSpec);
      
      const result = await tool.execute({ url }, mockContext);
      
      expect(mockApiClient.getOpenAPISpec).toHaveBeenCalledWith(url);
      expect(result.openapi).toBe('3.0.0');
    }
  });

  test('should handle non-existent URL', async () => {
    mockApiClient.getOpenAPISpec.mockRejectedValue(
      new Error('Failed to fetch spec: 404 Not Found')
    );

    await expect(tool.execute({
      url: 'https://api.example.com/nonexistent.json'
    }, mockContext)).rejects.toThrow('Failed to fetch spec: 404 Not Found');
  });

  test('should handle invalid OpenAPI specification', async () => {
    mockApiClient.getOpenAPISpec.mockRejectedValue(
      new Error('Invalid OpenAPI specification format')
    );

    await expect(tool.execute({
      url: 'https://api.example.com/invalid.json'
    }, mockContext)).rejects.toThrow('Invalid OpenAPI specification format');
  });

  test('should handle network errors', async () => {
    mockApiClient.getOpenAPISpec.mockRejectedValue(
      new Error('Network timeout')
    );

    await expect(tool.execute({
      url: 'https://api.example.com/openapi.json'
    }, mockContext)).rejects.toThrow('Network timeout');
  });

  test('should handle empty string URL', async () => {
    mockApiClient.getOpenAPISpec.mockResolvedValue(null);

    const result = await tool.execute({ url: '' }, mockContext);

    expect(mockApiClient.getOpenAPISpec).toHaveBeenCalledWith('');
    expect(result).toBeNull();
  });
});