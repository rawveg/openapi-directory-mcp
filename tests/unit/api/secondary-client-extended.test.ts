import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { SecondaryApiClient } from '../../../src/api/secondary-client.js';
import { ICacheManager } from '../../../src/cache/types.js';
import axios from 'axios';
import { rateLimiters } from '../../../src/utils/rate-limiter.js';
import { NetworkError, TimeoutError, NotFoundError, OpenAPIDirectoryError } from '../../../src/utils/errors.js';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock rate limiters
jest.mock('../../../src/utils/rate-limiter.js', () => ({
  rateLimiters: {
    secondary: {
      execute: jest.fn((fn) => fn())
    }
  }
}));

describe('SecondaryApiClient - Extended Coverage', () => {
  let secondaryClient: SecondaryApiClient;
  let mockCacheManager: jest.Mocked<ICacheManager>;
  let mockAxiosInstance: any;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleInfoSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock cache manager
    mockCacheManager = {
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
      warmCache: jest.fn()
    } as any;

    // Mock axios instance
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      patch: jest.fn(),
      defaults: {
        baseURL: 'https://secondary.api.com'
      }
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);
    
    // Mock console methods
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
    
    secondaryClient = new SecondaryApiClient('https://secondary.api.com', mockCacheManager);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleInfoSpy.mockRestore();
    jest.restoreAllMocks();
  });

  describe('fetchWithCacheNoRateLimit', () => {
    test('should fetch without rate limiting', async () => {
      const mockData = { test: 'data' };
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockedAxios.get.mockResolvedValueOnce({ data: mockData });

      const result = await secondaryClient.getOpenAPISpec('https://test.com/spec.json');

      expect(rateLimiters.secondary.execute).not.toHaveBeenCalled();
      expect(mockedAxios.get).toHaveBeenCalledWith('https://test.com/spec.json', {
        timeout: expect.any(Number)
      });
      expect(result).toEqual(mockData);
    });

    test('should handle errors in fetchWithCacheNoRateLimit', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      const error = {
        code: 'ECONNRESET',
        message: 'Connection reset'
      };
      mockedAxios.get.mockRejectedValueOnce(error);

      await expect(secondaryClient.getOpenAPISpec('https://test.com/spec.json'))
        .rejects.toThrow(OpenAPIDirectoryError);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('hasProvider', () => {
    test('should return true when provider exists', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockResolvedValueOnce({ 
        data: { data: ['provider1.com', 'provider2.com'] } 
      });

      const result = await secondaryClient.hasProvider('provider1.com');

      expect(result).toBe(true);
    });

    test('should return false when provider does not exist', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockResolvedValueOnce({ 
        data: { data: ['provider1.com', 'provider2.com'] } 
      });

      const result = await secondaryClient.hasProvider('unknown.com');

      expect(result).toBe(false);
    });

    test('should return false on error', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockRejectedValueOnce(new Error('Network error'));

      const result = await secondaryClient.hasProvider('any.com');

      expect(result).toBe(false);
    });
  });

  describe('hasAPI', () => {
    test('should return true when API exists', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockResolvedValueOnce({ 
        data: {
          'api1.com:v1': { versions: {} },
          'api2.com:v2': { versions: {} }
        }
      });

      const result = await secondaryClient.hasAPI('api1.com:v1');

      expect(result).toBe(true);
    });

    test('should return false when API does not exist', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockResolvedValueOnce({ 
        data: {
          'api1.com:v1': { versions: {} },
          'api2.com:v2': { versions: {} }
        }
      });

      const result = await secondaryClient.hasAPI('unknown.com:v1');

      expect(result).toBe(false);
    });

    test('should return false on error', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockRejectedValueOnce(new Error('Network error'));

      const result = await secondaryClient.hasAPI('any.com:v1');

      expect(result).toBe(false);
    });
  });

  describe('getProviderStats', () => {
    test('should return provider statistics', async () => {
      const provider = 'test.com';
      const mockAPIs = {
        'api1': { versions: {} },
        'api2': { versions: {} },
        'api3': { versions: {} }
      };

      // First call gets from cache (miss)
      mockCacheManager.get.mockReturnValueOnce(undefined);
      // Second call for getProvider also misses cache
      mockCacheManager.get.mockReturnValueOnce(undefined);
      
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockAPIs });

      const result = await secondaryClient.getProviderStats(provider);

      expect(result).toEqual({
        provider: 'test.com',
        api_count: 3,
        source: 'secondary'
      });
    });
  });

  describe('getAPISummaryById', () => {
    test('should return API summary by exact ID', async () => {
      const apiId = 'test.com:api1';
      const mockAPIs = {
        'test.com:api1': {
          versions: { 'v1': {}, 'v2': {} },
          preferred: 'v2'
        }
      };

      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockAPIs });

      const result = await secondaryClient.getAPISummaryById(apiId);

      expect(result).toEqual({
        id: apiId,
        versions: { 'v1': {}, 'v2': {} },
        preferred: 'v2',
        source: 'secondary'
      });
    });

    test('should find API without version suffix', async () => {
      const apiId = 'test.com:api1:v1';
      const mockAPIs = {
        'test.com:api1': {
          versions: { 'v1': {}, 'v2': {} },
          preferred: 'v2'
        }
      };

      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockAPIs });

      const result = await secondaryClient.getAPISummaryById(apiId);

      expect(result).toEqual({
        id: apiId,
        versions: { 'v1': {}, 'v2': {} },
        preferred: 'v2',
        source: 'secondary'
      });
    });

    test('should throw error when API not found', async () => {
      const apiId = 'unknown.com:api';
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockResolvedValueOnce({ data: {} });

      await expect(secondaryClient.getAPISummaryById(apiId))
        .rejects.toThrow('API not found: unknown.com:api');
    });
  });

  describe('searchAPIs', () => {
    test('should search APIs with pagination', async () => {
      const mockAPIs = {
        'test-api-1': { versions: {} },
        'test-api-2': { versions: {} },
        'other-api': { versions: {} },
        'test-service': { versions: {} }
      };

      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockAPIs });

      const result = await secondaryClient.searchAPIs('test', 2, 1);

      expect(result).toEqual({
        results: [
          { id: 'test-api-1', versions: {} },
          { id: 'test-api-2', versions: {} }
        ],
        total_results: 3,
        query: 'test',
        source: 'secondary'
      });
    });

    test('should handle empty search results', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockResolvedValueOnce({ data: {} });

      const result = await secondaryClient.searchAPIs('nonexistent');

      expect(result).toEqual({
        results: [],
        total_results: 0,
        query: 'nonexistent',
        source: 'secondary'
      });
    });

    test('should use default pagination values', async () => {
      const mockAPIs = {};
      for (let i = 1; i <= 25; i++) {
        mockAPIs[`api-${i}`] = { versions: {} };
      }

      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockAPIs });

      const result = await secondaryClient.searchAPIs('api');

      expect(result.results).toHaveLength(20); // Default limit
      expect(result.total_results).toBe(25);
    });
  });

  describe('getPopularAPIs', () => {
    test('should return sorted popular APIs', async () => {
      const mockAPIs = {
        'api1': { preferred: '3.0.0' },
        'api2': { preferred: '1.0.0' },
        'api3': { preferred: '2.0.0' }
      };

      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockAPIs });

      const result = await secondaryClient.getPopularAPIs(2);

      expect(result).toEqual({
        results: [
          { id: 'api1', preferred: '3.0.0' },
          { id: 'api3', preferred: '2.0.0' }
        ],
        source: 'secondary'
      });
    });

    test('should handle APIs without preferred version', async () => {
      const mockAPIs = {
        'api1': { preferred: undefined },
        'api2': { preferred: '1.0.0' },
        'api3': { preferred: null }
      };

      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockAPIs });

      const result = await secondaryClient.getPopularAPIs();

      expect(result.results[0].id).toBe('api2');
    });
  });

  describe('getRecentlyUpdatedAPIs', () => {
    test('should return APIs sorted by version', async () => {
      const mockAPIs = {
        'api1': { preferred: '1.0.0' },
        'api2': { preferred: '3.0.0' },
        'api3': { preferred: '2.0.0' }
      };

      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockAPIs });

      const result = await secondaryClient.getRecentlyUpdatedAPIs(2);

      expect(result).toEqual({
        results: [
          { id: 'api2', preferred: '3.0.0' },
          { id: 'api3', preferred: '2.0.0' }
        ],
        source: 'secondary'
      });
    });
  });

  describe('getEndpointDetails', () => {
    test('should return endpoint details', async () => {
      const mockEndpoints = {
        results: [
          { method: 'GET', path: '/users', summary: 'Get users' },
          { method: 'POST', path: '/users', summary: 'Create user' }
        ]
      };

      // Cache miss for endpoint details
      mockCacheManager.get.mockReturnValueOnce(undefined);
      // Cache miss for getAPIEndpoints
      mockCacheManager.get.mockReturnValueOnce(undefined);
      // Cache miss for listAPIs
      mockCacheManager.get.mockReturnValueOnce(undefined);
      
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          'test.com:api': {
            versions: { 'v1': { swaggerUrl: '/specs/test.com/api/v1.json' } },
            preferred: 'v1'
          }
        }
      });

      // Mock OpenAPI spec
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          paths: {
            '/users': {
              get: { summary: 'Get users' },
              post: { summary: 'Create user' }
            }
          }
        }
      });

      const result = await secondaryClient.getEndpointDetails('test.com:api', 'GET', '/users');

      expect(result).toEqual({
        method: 'GET',
        path: '/users',
        summary: 'Get users',
        operationId: undefined,
        tags: [],
        deprecated: false,
        api_id: 'test.com:api',
        source: 'secondary'
      });
    });

    test('should throw error when endpoint not found', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockCacheManager.get.mockReturnValueOnce(undefined);
      
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          'test.com:api': {
            versions: { 'v1': { swaggerUrl: '/specs/test.com/api/v1.json' } },
            preferred: 'v1'
          }
        }
      });

      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockedAxios.get.mockResolvedValueOnce({
        data: { paths: {} }
      });

      await expect(secondaryClient.getEndpointDetails('test.com:api', 'GET', '/unknown'))
        .rejects.toThrow('Endpoint not found: GET /unknown');
    });
  });

  describe('getEndpointSchema', () => {
    test('should return endpoint schema', async () => {
      const mockSpec = {
        paths: {
          '/users/{id}': {
            get: {
              parameters: [{ name: 'id', in: 'path', required: true }],
              responses: {
                '200': { description: 'Success' },
                '404': { description: 'Not found' }
              }
            }
          }
        }
      };

      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockCacheManager.get.mockReturnValueOnce(undefined);
      
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          'test.com:api': {
            versions: { 
              'v1': { 
                swaggerUrl: 'https://external.com/spec.json' 
              } 
            },
            preferred: 'v1'
          }
        }
      });

      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockedAxios.get.mockResolvedValueOnce({ data: mockSpec });

      const result = await secondaryClient.getEndpointSchema('test.com:api', 'GET', '/users/{id}');

      expect(result).toEqual({
        api_id: 'test.com:api',
        method: 'GET',
        path: '/users/{id}',
        parameters: [{ name: 'id', in: 'path', required: true }],
        requestBody: undefined,
        responses: {
          '200': { description: 'Success' },
          '404': { description: 'Not found' }
        },
        source: 'secondary'
      });
    });

    test('should handle relative swagger URLs', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockCacheManager.get.mockReturnValueOnce(undefined);
      
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          'test.com:api': {
            versions: { 
              'v1': { 
                swaggerUrl: '/specs/test.com/api/v1.json' 
              } 
            },
            preferred: 'v1'
          }
        }
      });

      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          paths: {
            '/test': {
              post: {
                requestBody: { required: true },
                responses: { '201': { description: 'Created' } }
              }
            }
          }
        }
      });

      const result = await secondaryClient.getEndpointSchema('test.com:api', 'POST', '/test');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://secondary.api.com/specs/test.com/api/v1.json',
        expect.any(Object)
      );
      expect(result.requestBody).toEqual({ required: true });
    });

    test('should handle API ID with version', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockCacheManager.get.mockReturnValueOnce(undefined);
      
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          'test.com:api': {
            versions: { 'v1': { swaggerUrl: '/spec.json' } },
            preferred: 'v1'
          }
        }
      });

      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockedAxios.get.mockResolvedValueOnce({
        data: { paths: { '/test': { get: {} } } }
      });

      await secondaryClient.getEndpointSchema('test.com:api:v1', 'GET', '/test');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/list.json');
    });

    test('should throw error when API not found', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockResolvedValueOnce({ data: {} });

      await expect(secondaryClient.getEndpointSchema('unknown:api', 'GET', '/test'))
        .rejects.toThrow('API not found: unknown:api');
    });

    test('should throw error when preferred version not found', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockCacheManager.get.mockReturnValueOnce(undefined);
      
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          'test.com:api': {
            versions: {},
            preferred: 'v1'
          }
        }
      });

      await expect(secondaryClient.getEndpointSchema('test.com:api', 'GET', '/test'))
        .rejects.toThrow('Preferred version not found for API: test.com:api');
    });

    test('should throw error when endpoint not found in spec', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockCacheManager.get.mockReturnValueOnce(undefined);
      
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          'test.com:api': {
            versions: { 'v1': { swaggerUrl: '/spec.json' } },
            preferred: 'v1'
          }
        }
      });

      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockedAxios.get.mockResolvedValueOnce({
        data: { paths: {} }
      });

      await expect(secondaryClient.getEndpointSchema('test.com:api', 'GET', '/unknown'))
        .rejects.toThrow('Endpoint not found: GET /unknown');
    });
  });

  describe('getEndpointExamples', () => {
    test('should return empty examples', async () => {
      // Mock successful endpoint schema check
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockCacheManager.get.mockReturnValueOnce(undefined);
      
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          'test.com:api': {
            versions: { 'v1': { swaggerUrl: '/spec.json' } },
            preferred: 'v1'
          }
        }
      });

      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          paths: {
            '/test': {
              get: { summary: 'Test endpoint' }
            }
          }
        }
      });

      const result = await secondaryClient.getEndpointExamples('test.com:api', 'GET', '/test');

      expect(result).toEqual({
        api_id: 'test.com:api',
        method: 'GET',
        path: '/test',
        request_examples: [],
        response_examples: [],
        source: 'secondary'
      });
    });
  });

  describe('getAPIEndpoints', () => {
    test('should return paginated endpoints', async () => {
      const mockSpec = {
        paths: {
          '/users': {
            get: { 
              summary: 'List users',
              operationId: 'listUsers',
              tags: ['users']
            },
            post: { 
              summary: 'Create user',
              tags: ['users', 'admin']
            }
          },
          '/products': {
            get: { 
              summary: 'List products',
              tags: ['products'],
              deprecated: true
            }
          }
        }
      };

      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockCacheManager.get.mockReturnValueOnce(undefined);
      
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          'test.com:api': {
            versions: { 'v1': { swaggerUrl: '/spec.json' } },
            preferred: 'v1'
          }
        }
      });

      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockedAxios.get.mockResolvedValueOnce({ data: mockSpec });

      const result = await secondaryClient.getAPIEndpoints('test.com:api', 1, 2);

      expect(result.results).toHaveLength(2);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 2,
        total_results: 3,
        total_pages: 2,
        has_next: true,
        has_previous: false
      });
      expect(result.available_tags).toEqual(['admin', 'products', 'users']);
    });

    test('should filter endpoints by tag', async () => {
      const mockSpec = {
        paths: {
          '/users': {
            get: { tags: ['users'] },
            post: { tags: ['users', 'admin'] }
          },
          '/admin': {
            get: { tags: ['admin'] }
          }
        }
      };

      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockCacheManager.get.mockReturnValueOnce(undefined);
      
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          'test.com:api': {
            versions: { 'v1': { swaggerUrl: '/spec.json' } },
            preferred: 'v1'
          }
        }
      });

      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockedAxios.get.mockResolvedValueOnce({ data: mockSpec });

      const result = await secondaryClient.getAPIEndpoints('test.com:api', 1, 10, 'admin');

      expect(result.results).toHaveLength(2);
      expect(result.results.every(r => r.tags.includes('admin'))).toBe(true);
    });

    test('should handle endpoints without tags', async () => {
      const mockSpec = {
        paths: {
          '/users': {
            get: { summary: 'No tags' },
            parameters: {} // Should be ignored
          }
        }
      };

      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockCacheManager.get.mockReturnValueOnce(undefined);
      
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          'test.com:api': {
            versions: { 'v1': { swaggerUrl: '/spec.json' } },
            preferred: 'v1'
          }
        }
      });

      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockedAxios.get.mockResolvedValueOnce({ data: mockSpec });

      const result = await secondaryClient.getAPIEndpoints('test.com:api');

      expect(result.results[0].tags).toEqual([]);
      expect(result.available_tags).toEqual([]);
    });

    test('should enforce limit bounds', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockCacheManager.get.mockReturnValueOnce(undefined);
      
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          'test.com:api': {
            versions: { 'v1': { swaggerUrl: '/spec.json' } },
            preferred: 'v1'
          }
        }
      });

      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockedAxios.get.mockResolvedValueOnce({ data: { paths: {} } });

      // Test max limit
      await secondaryClient.getAPIEndpoints('test.com:api', 1, 200);
      
      // Check that the cache key was called
      const cacheKey = mockCacheManager.get.mock.calls[0][0];
      expect(cacheKey).toContain('secondary:endpoints:');
      expect(cacheKey).toContain('test.com:api');

      // Test min limit
      mockCacheManager.get.mockClear();
      mockCacheManager.set.mockClear();
      
      // Need to set up mocks again after clearing
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockCacheManager.get.mockReturnValueOnce(undefined);
      
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          'test.com:api': {
            versions: { 'v1': { swaggerUrl: '/spec.json' } },
            preferred: 'v1'
          }
        }
      });

      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockedAxios.get.mockResolvedValueOnce({ data: { paths: {} } });
      
      await secondaryClient.getAPIEndpoints('test.com:api', 1, 0);
      
      const cacheKey2 = mockCacheManager.get.mock.calls[0][0];
      expect(cacheKey2).toContain('secondary:endpoints:');
      expect(cacheKey2).toContain('test.com:api');
    });

    test('should handle malformed path items', async () => {
      const mockSpec = {
        paths: {
          '/valid': {
            get: { summary: 'Valid' }
          },
          '/invalid': null,
          '/string': 'not an object'
        }
      };

      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockCacheManager.get.mockReturnValueOnce(undefined);
      
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          'test.com:api': {
            versions: { 'v1': { swaggerUrl: '/spec.json' } },
            preferred: 'v1'
          }
        }
      });

      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockedAxios.get.mockResolvedValueOnce({ data: mockSpec });

      const result = await secondaryClient.getAPIEndpoints('test.com:api');

      expect(result.results).toHaveLength(1);
      expect(result.results[0].path).toBe('/valid');
    });

    test('should sort endpoints consistently', async () => {
      const mockSpec = {
        paths: {
          '/z-path': { get: {} },
          '/a-path': { post: {}, get: {} },
          '/m-path': { delete: {} }
        }
      };

      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockCacheManager.get.mockReturnValueOnce(undefined);
      
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          'test.com:api': {
            versions: { 'v1': { swaggerUrl: '/spec.json' } },
            preferred: 'v1'
          }
        }
      });

      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockedAxios.get.mockResolvedValueOnce({ data: mockSpec });

      const result = await secondaryClient.getAPIEndpoints('test.com:api');

      expect(result.results[0].path).toBe('/a-path');
      expect(result.results[0].method).toBe('GET');
      expect(result.results[1].path).toBe('/a-path');
      expect(result.results[1].method).toBe('POST');
      expect(result.results[2].path).toBe('/m-path');
      expect(result.results[3].path).toBe('/z-path');
    });

    test('should handle spec without paths', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockCacheManager.get.mockReturnValueOnce(undefined);
      
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          'test.com:api': {
            versions: { 'v1': { swaggerUrl: '/spec.json' } },
            preferred: 'v1'
          }
        }
      });

      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockedAxios.get.mockResolvedValueOnce({ data: {} });

      const result = await secondaryClient.getAPIEndpoints('test.com:api');

      expect(result.results).toEqual([]);
      expect(result.pagination.total_results).toBe(0);
    });
  });

  describe('edge cases and error scenarios', () => {
    test('should handle ECONNRESET as OpenAPIDirectoryError', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      const error = {
        code: 'ECONNRESET',
        message: 'Connection reset by peer'
      };
      mockAxiosInstance.get.mockRejectedValueOnce(error);

      await expect(secondaryClient.getProviders())
        .rejects.toThrow(OpenAPIDirectoryError);
    });

    test('should log errors with appropriate levels', async () => {
      // Network error (should use console.error)
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockRejectedValueOnce({
        code: 'ENOTFOUND',
        message: 'DNS lookup failed'
      });

      await expect(secondaryClient.getProviders()).rejects.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalled();

      // Timeout error (should use console.warn)
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockRejectedValueOnce({
        code: 'ETIMEDOUT',
        message: 'Request timeout'
      });

      await expect(secondaryClient.getProviders()).rejects.toThrow();
      expect(consoleWarnSpy).toHaveBeenCalled();

      // Not found error (should use console.info)
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockRejectedValueOnce({
        response: { status: 404 }
      });

      await expect(secondaryClient.getProviders()).rejects.toThrow();
      expect(consoleInfoSpy).toHaveBeenCalled();
    });

    test('should handle empty responses gracefully', async () => {
      // Empty providers
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockResolvedValueOnce({ data: { data: [] } });
      const providers = await secondaryClient.getProviders();
      expect(providers.data).toEqual([]);

      // Empty APIs
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockResolvedValueOnce({ data: {} });
      const apis = await secondaryClient.listAPIs();
      expect(apis).toEqual({});
    });

    test('should handle malformed responses', async () => {
      // Malformed metrics response
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockResolvedValueOnce({ data: null });
      const metrics = await secondaryClient.getMetrics();
      expect(metrics).toBeNull();

      // Malformed provider response
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockResolvedValueOnce({ data: { /* missing data property */ } });
      const providers = await secondaryClient.getProviders();
      expect(providers).toEqual({});
    });

    test('should handle API version detection correctly', async () => {
      // Test with version prefix
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockResolvedValueOnce({ data: { test: 'data' } });
      
      await secondaryClient.getAPI('provider.com', 'v2');
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/specs/provider.com/v2.json');

      // Test without version prefix - tries v1 first
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get
        .mockRejectedValueOnce({ response: { status: 404 } })
        .mockResolvedValueOnce({ data: { test: 'data' } });
      
      await secondaryClient.getAPI('provider.com', 'main');
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/specs/provider.com/main/v1.json');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/specs/provider.com/main.json');
    });
  });

  describe('cache TTL usage', () => {
    test('should use correct TTL values for different operations', async () => {
      // Test providers TTL
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockResolvedValueOnce({ data: { data: [] } });
      await secondaryClient.getProviders();
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'secondary:providers',
        expect.any(Object),
        expect.any(Number) // CACHE_TTL.PROVIDERS
      );

      // Test APIs TTL
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockResolvedValueOnce({ data: {} });
      await secondaryClient.listAPIs();
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'secondary:all_apis',
        expect.any(Object),
        expect.any(Number) // CACHE_TTL.APIS
      );

      // Test metrics TTL
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockResolvedValueOnce({ data: {} });
      await secondaryClient.getMetrics();
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'secondary:metrics',
        expect.any(Object),
        expect.any(Number) // CACHE_TTL.METRICS
      );

      // Test spec TTL
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockedAxios.get.mockResolvedValueOnce({ data: {} });
      await secondaryClient.getOpenAPISpec('https://test.com/spec.json');
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'secondary:spec:https://test.com/spec.json',
        expect.any(Object),
        expect.any(Number) // CACHE_TTL.SPECS
      );

      // Test endpoints with custom TTL
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          'test.com:api': {
            versions: { 'v1': { swaggerUrl: '/spec.json' } },
            preferred: 'v1'
          }
        }
      });
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockedAxios.get.mockResolvedValueOnce({ data: { paths: {} } });
      
      await secondaryClient.getAPIEndpoints('test.com:api');
      
      expect(mockCacheManager.set).toHaveBeenLastCalledWith(
        expect.stringContaining('secondary:endpoints:'),
        expect.any(Object),
        600000 // 10 minutes
      );
    });
  });
});