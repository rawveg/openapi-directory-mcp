import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { tool } from '../../../src/tools/endpoint-tools/get-endpoint-examples.js';
import { ToolContext } from '../../../src/tools/types.js';

describe('get_endpoint_examples tool', () => {
  let mockContext: ToolContext;
  let mockApiClient: any;

  beforeEach(() => {
    mockApiClient = {
      getEndpointExamples: jest.fn(),
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
      getEndpointSchema: jest.fn()
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
    expect(tool.name).toBe('get_endpoint_examples');
    expect(tool.description).toContain('Get request and response examples');
    expect(tool.inputSchema.required).toEqual(['api_id', 'method', 'path']);
  });

  test('should return endpoint examples successfully', async () => {
    const mockExamples = {
      api_id: 'googleapis.com:admin',
      method: 'POST',
      path: '/admin/directory/v1/users',
      requestExamples: [
        {
          summary: 'Create a new user',
          value: {
            primaryEmail: 'john.doe@example.com',
            name: {
              givenName: 'John',
              familyName: 'Doe'
            },
            password: 'securePassword123'
          }
        },
        {
          summary: 'Create admin user',
          value: {
            primaryEmail: 'admin@example.com',
            name: {
              givenName: 'Admin',
              familyName: 'User'
            },
            password: 'adminPassword456',
            isAdmin: true
          }
        }
      ],
      responseExamples: {
        '200': [
          {
            summary: 'Successful user creation',
            value: {
              id: '123456789',
              primaryEmail: 'john.doe@example.com',
              name: {
                givenName: 'John',
                familyName: 'Doe'
              },
              creationTime: '2023-12-01T10:00:00Z'
            }
          }
        ],
        '400': [
          {
            summary: 'Invalid email format',
            value: {
              error: 'Invalid email format',
              code: 400
            }
          }
        ]
      }
    };

    mockApiClient.getEndpointExamples.mockResolvedValue(mockExamples);

    const result = await tool.execute({
      api_id: 'googleapis.com:admin',
      method: 'POST',
      path: '/admin/directory/v1/users'
    }, mockContext);

    expect(mockApiClient.getEndpointExamples).toHaveBeenCalledWith(
      'googleapis.com:admin',
      'POST',
      '/admin/directory/v1/users'
    );
    expect(result).toEqual(mockExamples);
  });

  test('should validate required parameters', async () => {
    await expect(tool.execute({}, mockContext))
      .rejects.toThrow();

    await expect(tool.execute({ api_id: 'test' }, mockContext))
      .rejects.toThrow();

    await expect(tool.execute({ api_id: 'test', method: 'GET' }, mockContext))
      .rejects.toThrow();
  });

  test('should handle GET endpoints with no request examples', async () => {
    const mockExamples = {
      api_id: 'github.com',
      method: 'GET',
      path: '/users/{username}',
      requestExamples: [],
      responseExamples: {
        '200': [
          {
            summary: 'User information',
            value: {
              login: 'octocat',
              id: 1,
              name: 'The Octocat',
              location: 'San Francisco'
            }
          }
        ],
        '404': [
          {
            summary: 'User not found',
            value: {
              message: 'Not Found',
              documentation_url: 'https://docs.github.com/rest'
            }
          }
        ]
      }
    };

    mockApiClient.getEndpointExamples.mockResolvedValue(mockExamples);

    const result = await tool.execute({
      api_id: 'github.com',
      method: 'GET',
      path: '/users/{username}'
    }, mockContext);

    expect(result.requestExamples).toEqual([]);
    expect(result.responseExamples['200']).toBeDefined();
  });

  test('should handle different HTTP methods', async () => {
    const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
    
    for (const method of methods) {
      const mockExamples = {
        api_id: 'test.com:api',
        method,
        path: '/test',
        requestExamples: method !== 'GET' ? [{ summary: 'Test request', value: {} }] : [],
        responseExamples: {
          '200': [{ summary: 'Success', value: { success: true } }]
        }
      };

      mockApiClient.getEndpointExamples.mockResolvedValue(mockExamples);
      
      const result = await tool.execute({
        api_id: 'test.com:api',
        method,
        path: '/test'
      }, mockContext);
      
      expect(mockApiClient.getEndpointExamples).toHaveBeenCalledWith('test.com:api', method, '/test');
      expect(result.method).toBe(method);
    }
  });

  test('should handle endpoint with multiple response status codes', async () => {
    const mockExamples = {
      api_id: 'stripe.com',
      method: 'POST',
      path: '/v1/charges',
      requestExamples: [
        {
          summary: 'Create charge',
          value: {
            amount: 2000,
            currency: 'usd',
            source: 'tok_visa'
          }
        }
      ],
      responseExamples: {
        '200': [
          {
            summary: 'Successful charge',
            value: {
              id: 'ch_1234567890',
              amount: 2000,
              status: 'succeeded'
            }
          }
        ],
        '400': [
          {
            summary: 'Invalid parameters',
            value: {
              error: {
                type: 'invalid_request_error',
                message: 'Amount must be at least 50 cents'
              }
            }
          }
        ],
        '402': [
          {
            summary: 'Card declined',
            value: {
              error: {
                type: 'card_error',
                code: 'card_declined',
                message: 'Your card was declined.'
              }
            }
          }
        ]
      }
    };

    mockApiClient.getEndpointExamples.mockResolvedValue(mockExamples);

    const result = await tool.execute({
      api_id: 'stripe.com',
      method: 'POST',
      path: '/v1/charges'
    }, mockContext);

    expect(result.responseExamples).toHaveProperty('200');
    expect(result.responseExamples).toHaveProperty('400');
    expect(result.responseExamples).toHaveProperty('402');
  });

  test('should handle non-existent endpoint', async () => {
    mockApiClient.getEndpointExamples.mockRejectedValue(
      new Error('Endpoint not found')
    );

    await expect(tool.execute({
      api_id: 'googleapis.com:admin',
      method: 'GET',
      path: '/nonexistent'
    }, mockContext)).rejects.toThrow('Endpoint not found');
  });

  test('should handle API client errors', async () => {
    mockApiClient.getEndpointExamples.mockRejectedValue(
      new Error('Network error')
    );

    await expect(tool.execute({
      api_id: 'googleapis.com:admin',
      method: 'GET',
      path: '/users'
    }, mockContext)).rejects.toThrow('Network error');
  });
});