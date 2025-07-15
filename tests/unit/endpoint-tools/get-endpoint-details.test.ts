import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { tool } from '../../../src/tools/endpoint-tools/get-endpoint-details.js';
import { ToolContext } from '../../../src/tools/types.js';

describe('get_endpoint_details tool', () => {
  let mockContext: ToolContext;
  let mockApiClient: any;

  beforeEach(() => {
    mockApiClient = {
      getEndpointDetails: jest.fn(),
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
      getOpenAPISpec: jest.fn(),
      getAPIEndpoints: jest.fn(),
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
    expect(tool.name).toBe('get_endpoint_details');
    expect(tool.description).toContain('Get detailed information about a specific API endpoint');
    expect(tool.inputSchema.required).toEqual(['api_id', 'method', 'path']);
  });

  test('should return endpoint details successfully', async () => {
    const mockEndpointDetails = {
      api_id: 'googleapis.com:admin',
      method: 'GET',
      path: '/admin/directory/v1/users',
      summary: 'Retrieve all users in a domain',
      description: 'Retrieves a paginated list of all users in a domain',
      operationId: 'directory.users.list',
      parameters: [
        {
          name: 'domain',
          in: 'query',
          description: 'The domain name',
          required: true,
          schema: { type: 'string' }
        }
      ],
      responses: {
        '200': {
          description: 'Successful response',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  users: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/User' }
                  }
                }
              }
            }
          }
        }
      },
      security: [{ 'oauth2': ['https://www.googleapis.com/auth/admin.directory.user.readonly'] }]
    };

    mockApiClient.getEndpointDetails.mockResolvedValue(mockEndpointDetails);

    const result = await tool.execute({
      api_id: 'googleapis.com:admin',
      method: 'GET',
      path: '/admin/directory/v1/users'
    }, mockContext);

    expect(mockApiClient.getEndpointDetails).toHaveBeenCalledWith(
      'googleapis.com:admin',
      'GET',
      '/admin/directory/v1/users'
    );
    expect(result).toEqual(mockEndpointDetails);
  });

  test('should validate required parameters', async () => {
    await expect(tool.execute({}, mockContext))
      .rejects.toThrow();

    await expect(tool.execute({ api_id: 'test' }, mockContext))
      .rejects.toThrow();

    await expect(tool.execute({ api_id: 'test', method: 'GET' }, mockContext))
      .rejects.toThrow();
  });

  test('should handle different HTTP methods', async () => {
    const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
    
    for (const method of methods) {
      const mockDetails = {
        api_id: 'test.com:api',
        method,
        path: '/test',
        summary: `Test ${method} endpoint`
      };

      mockApiClient.getEndpointDetails.mockResolvedValue(mockDetails);
      
      const result = await tool.execute({
        api_id: 'test.com:api',
        method,
        path: '/test'
      }, mockContext);
      
      expect(mockApiClient.getEndpointDetails).toHaveBeenCalledWith('test.com:api', method, '/test');
      expect(result.method).toBe(method);
    }
  });

  test('should handle various path formats', async () => {
    const pathFormats = [
      '/users',
      '/users/{id}',
      '/api/v1/users/{userId}/posts/{postId}',
      '/organizations/{orgId}/repos',
      '/search/users'
    ];
    
    for (const path of pathFormats) {
      mockApiClient.getEndpointDetails.mockResolvedValue({
        api_id: 'test.com:api',
        method: 'GET',
        path,
        summary: 'Test endpoint'
      });
      
      await tool.execute({
        api_id: 'test.com:api',
        method: 'GET',
        path
      }, mockContext);
      
      expect(mockApiClient.getEndpointDetails).toHaveBeenCalledWith('test.com:api', 'GET', path);
    }
  });

  test('should handle non-existent endpoint', async () => {
    mockApiClient.getEndpointDetails.mockRejectedValue(
      new Error('Endpoint not found')
    );

    await expect(tool.execute({
      api_id: 'googleapis.com:admin',
      method: 'GET',
      path: '/nonexistent'
    }, mockContext)).rejects.toThrow('Endpoint not found');
  });

  test('should handle API client errors', async () => {
    mockApiClient.getEndpointDetails.mockRejectedValue(
      new Error('Network error')
    );

    await expect(tool.execute({
      api_id: 'googleapis.com:admin',
      method: 'GET',
      path: '/users'
    }, mockContext)).rejects.toThrow('Network error');
  });
});