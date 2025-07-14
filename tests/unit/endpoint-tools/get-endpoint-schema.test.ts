import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { tool } from '../../../src/tools/endpoint-tools/get-endpoint-schema.js';
import { ToolContext } from '../../../src/tools/types.js';

describe('get_endpoint_schema tool', () => {
  let mockContext: ToolContext;
  let mockApiClient: any;

  beforeEach(() => {
    mockApiClient = {
      getEndpointSchema: jest.fn(),
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
      getEndpointDetails: jest.fn(),
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
    expect(tool.name).toBe('get_endpoint_schema');
    expect(tool.description).toContain('Get request and response schemas');
    expect(tool.inputSchema.required).toEqual(['api_id', 'method', 'path']);
  });

  test('should return endpoint schema successfully', async () => {
    const mockSchema = {
      api_id: 'googleapis.com:admin',
      method: 'POST',
      path: '/admin/directory/v1/users',
      requestSchema: {
        type: 'object',
        properties: {
          primaryEmail: {
            type: 'string',
            format: 'email',
            description: 'The user\'s primary email address'
          },
          name: {
            type: 'object',
            properties: {
              givenName: { type: 'string' },
              familyName: { type: 'string' }
            },
            required: ['givenName', 'familyName']
          },
          password: {
            type: 'string',
            minLength: 8
          }
        },
        required: ['primaryEmail', 'name', 'password']
      },
      responseSchema: {
        '200': {
          description: 'User created successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  primaryEmail: { type: 'string' },
                  name: {
                    type: 'object',
                    properties: {
                      givenName: { type: 'string' },
                      familyName: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        },
        '400': {
          description: 'Bad request',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: { type: 'string' },
                  code: { type: 'number' }
                }
              }
            }
          }
        }
      }
    };

    mockApiClient.getEndpointSchema.mockResolvedValue(mockSchema);

    const result = await tool.execute({
      api_id: 'googleapis.com:admin',
      method: 'POST',
      path: '/admin/directory/v1/users'
    }, mockContext);

    expect(mockApiClient.getEndpointSchema).toHaveBeenCalledWith(
      'googleapis.com:admin',
      'POST',
      '/admin/directory/v1/users'
    );
    expect(result).toEqual(mockSchema);
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
    const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
    
    for (const method of methods) {
      const mockSchema = {
        api_id: 'test.com:api',
        method,
        path: '/test',
        requestSchema: { type: 'object' },
        responseSchema: { '200': { description: 'Success' } }
      };

      mockApiClient.getEndpointSchema.mockResolvedValue(mockSchema);
      
      const result = await tool.execute({
        api_id: 'test.com:api',
        method,
        path: '/test'
      }, mockContext);
      
      expect(mockApiClient.getEndpointSchema).toHaveBeenCalledWith('test.com:api', method, '/test');
      expect(result.method).toBe(method);
    }
  });

  test('should handle endpoint with no request schema', async () => {
    const mockSchema = {
      api_id: 'github.com',
      method: 'GET',
      path: '/users/{username}',
      requestSchema: null,
      responseSchema: {
        '200': {
          description: 'User information',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  login: { type: 'string' },
                  id: { type: 'number' }
                }
              }
            }
          }
        }
      }
    };

    mockApiClient.getEndpointSchema.mockResolvedValue(mockSchema);

    const result = await tool.execute({
      api_id: 'github.com',
      method: 'GET',
      path: '/users/{username}'
    }, mockContext);

    expect(result.requestSchema).toBeNull();
    expect(result.responseSchema).toBeDefined();
  });

  test('should handle non-existent endpoint', async () => {
    mockApiClient.getEndpointSchema.mockRejectedValue(
      new Error('Endpoint not found')
    );

    await expect(tool.execute({
      api_id: 'googleapis.com:admin',
      method: 'GET',
      path: '/nonexistent'
    }, mockContext)).rejects.toThrow('Endpoint not found');
  });

  test('should handle API client errors', async () => {
    mockApiClient.getEndpointSchema.mockRejectedValue(
      new Error('Network error')
    );

    await expect(tool.execute({
      api_id: 'googleapis.com:admin',
      method: 'GET',
      path: '/users'
    }, mockContext)).rejects.toThrow('Network error');
  });
});