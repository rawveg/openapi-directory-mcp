import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { SecondaryApiClient } from '../../../src/api/secondary-client.js';
import { ICacheManager } from '../../../src/cache/types.js';
import axios from 'axios';
import { rateLimiters } from '../../../src/utils/rate-limiter.js';
import { NetworkError, TimeoutError, NotFoundError, ServerError } from '../../../src/utils/errors.js';
import { HTTP_TIMEOUTS, CACHE_TTL, USER_AGENT } from '../../../src/utils/constants.js';

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

describe('SecondaryApiClient - Comprehensive Tests', () => {
  let secondaryClient: SecondaryApiClient;
  let mockCacheManager: jest.Mocked<ICacheManager>;
  let mockAxiosInstance: any;
  let consoleErrorSpy: jest.SpyInstance;

  const mockApiGuruAPI = {
    added: '2023-01-01',
    preferred: 'v1',
    versions: {
      v1: {
        info: {
          title: 'Test API',
          description: 'Test description',
          'x-providerName': 'test.com',
          'x-apisguru-categories': ['test']
        },
        swaggerUrl: '/specs/test.com/v1.json',
        updated: '2023-01-01T00:00:00Z',
        added: '2023-01-01T00:00:00Z',
        link: 'https://test.com/docs'
      }
    }
  };

  const mockOpenAPISpec = {
    openapi: '3.0.0',
    info: { title: 'Test API', version: '1.0.0' },
    paths: {
      '/users': {
        get: {
          summary: 'Get users',
          operationId: 'getUsers',
          tags: ['users'],
          parameters: [
            { name: 'limit', in: 'query', schema: { type: 'integer' } }
          ],
          responses: {
            '200': { description: 'Success' }
          }
        },
        post: {
          summary: 'Create user',
          operationId: 'createUser',
          tags: ['users'],
          requestBody: {
            content: {
              'application/json': {
                schema: { type: 'object' }
              }
            }
          },
          responses: {
            '201': { description: 'Created' }
          }
        }
      },
      '/users/{id}': {
        get: {
          summary: 'Get user by ID',
          operationId: 'getUserById',
          tags: ['users'],
          deprecated: true,
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
          ],
          responses: {
            '200': { description: 'Success' },
            '404': { description: 'Not found' }
          }
        }
      },
      '/admin': {
        get: {
          summary: 'Admin endpoint',
          tags: ['admin'],
          responses: {
            '200': { description: 'Success' }
          }
        }
      }
    }
  };

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
      warmCache: jest.fn(),
      performHealthCheck: jest.fn()
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
    mockedAxios.get.mockImplementation(jest.fn());
    
    // Suppress console.error for error logging tests
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    secondaryClient = new SecondaryApiClient('https://secondary.api.com', mockCacheManager);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    test('should initialize with correct configuration', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://secondary.api.com',
        timeout: HTTP_TIMEOUTS.DEFAULT,
        headers: {
          Accept: 'application/json',
          'User-Agent': USER_AGENT.WITH_DUAL_SOURCE
        }
      });
    });
  });

  describe('fetchWithCache', () => {
    test('should return cached data when available', async () => {
      const cachedData = { data: ['cached'] };
      mockCacheManager.get.mockReturnValueOnce(cachedData);

      const result = await secondaryClient.getProviders();

      expect(mockCacheManager.get).toHaveBeenCalledWith('secondary:providers');
      expect(result).toEqual(cachedData);
      expect(mockAxiosInstance.get).not.toHaveBeenCalled();
    });

    test('should fetch and cache data when not cached', async () => {
      const freshData = { data: ['fresh'] };
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockResolvedValueOnce({ data: freshData });

      const result = await secondaryClient.getProviders();

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'secondary:providers',
        freshData,
        CACHE_TTL.PROVIDERS
      );
      expect(result).toEqual(freshData);
    });

    test('should apply rate limiting', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockResolvedValueOnce({ data: { data: [] } });

      await secondaryClient.getProviders();

      expect(rateLimiters.secondary!.execute).toHaveBeenCalledWith(expect.any(Function));
    });

    test('should handle and enhance errors', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      const error = {
        code: 'ECONNREFUSED',
        message: 'Connection refused'
      };
      mockAxiosInstance.get.mockRejectedValueOnce(error);

      await expect(secondaryClient.getProviders()).rejects.toThrow(NetworkError);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('getAPI', () => {
    test('should handle API with version pattern (v1, v2, etc)', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockApiGuruAPI });

      const result = await secondaryClient.getAPI('test.com', 'v1');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/specs/test.com/v1.json');
      expect(result).toEqual(mockApiGuruAPI);
    });

    test('should try with /v1.json suffix for non-version APIs', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockApiGuruAPI });

      const result = await secondaryClient.getAPI('test.com', 'main');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/specs/test.com/main/v1.json');
      expect(result).toEqual(mockApiGuruAPI);
    });

    test('should fallback to without version suffix if v1 fails', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get
        .mockRejectedValueOnce(new Error('Not found'))
        .mockResolvedValueOnce({ data: mockApiGuruAPI });

      const result = await secondaryClient.getAPI('test.com', 'main');

      expect(mockAxiosInstance.get).toHaveBeenNthCalledWith(1, '/specs/test.com/main/v1.json');
      expect(mockAxiosInstance.get).toHaveBeenNthCalledWith(2, '/specs/test.com/main.json');
      expect(result).toEqual(mockApiGuruAPI);
    });
  });

  describe('hasProvider', () => {
    test('should return true when provider exists', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockResolvedValueOnce({ data: { data: ['test.com', 'other.com'] } });

      const result = await secondaryClient.hasProvider('test.com');

      expect(result).toBe(true);
    });

    test('should return false when provider does not exist', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockResolvedValueOnce({ data: { data: ['other.com'] } });

      const result = await secondaryClient.hasProvider('test.com');

      expect(result).toBe(false);
    });

    test('should return false on error', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockRejectedValueOnce(new Error('Network error'));

      const result = await secondaryClient.hasProvider('test.com');

      expect(result).toBe(false);
    });
  });

  describe('hasAPI', () => {
    test('should return true when API exists', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockResolvedValueOnce({ 
        data: { 
          'test.com:v1': mockApiGuruAPI,
          'other.com:v1': mockApiGuruAPI 
        } 
      });

      const result = await secondaryClient.hasAPI('test.com:v1');

      expect(result).toBe(true);
    });

    test('should return false when API does not exist', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockResolvedValueOnce({ 
        data: { 
          'other.com:v1': mockApiGuruAPI 
        } 
      });

      const result = await secondaryClient.hasAPI('test.com:v1');

      expect(result).toBe(false);
    });

    test('should return false on error', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockRejectedValueOnce(new Error('Network error'));

      const result = await secondaryClient.hasAPI('test.com:v1');

      expect(result).toBe(false);
    });
  });

  describe('getProviderStats', () => {
    test('should calculate provider statistics', async () => {
      const provider = 'test.com';
      const mockAPIs = {
        'test.com:api1': mockApiGuruAPI,
        'test.com:api2': mockApiGuruAPI,
        'test.com:api3': mockApiGuruAPI
      };

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
    test('should return API summary by ID', async () => {
      const apiId = 'test.com:v1';
      const mockAPIs = {
        'test.com:v1': mockApiGuruAPI
      };

      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockAPIs });

      const result = await secondaryClient.getAPISummaryById(apiId);

      expect(result).toEqual({
        id: apiId,
        versions: mockApiGuruAPI.versions,
        preferred: mockApiGuruAPI.preferred,
        source: 'secondary'
      });
    });

    test('should handle API ID with version suffix', async () => {
      const apiId = 'test.com:api:v1';
      const mockAPIs = {
        'test.com:api': mockApiGuruAPI
      };

      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockAPIs });

      const result = await secondaryClient.getAPISummaryById(apiId);

      expect(result).toEqual({
        id: apiId,
        versions: mockApiGuruAPI.versions,
        preferred: mockApiGuruAPI.preferred,
        source: 'secondary'
      });
    });

    test('should throw error when API not found', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockResolvedValueOnce({ data: {} });

      await expect(secondaryClient.getAPISummaryById('unknown:api')).rejects.toThrow('API not found: unknown:api');
    });
  });

  describe('searchAPIs', () => {
    test('should search APIs by query', async () => {
      const mockAPIs = {
        'test.com:v1': mockApiGuruAPI,
        'example.com:v1': mockApiGuruAPI,
        'testing.com:v1': mockApiGuruAPI
      };

      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockAPIs });

      const result = await secondaryClient.searchAPIs('test');

      expect(result.results).toHaveLength(2); // test.com and testing.com
      expect(result.query).toBe('test');
      expect(result.source).toBe('secondary');
    });

    test('should handle pagination', async () => {
      const mockAPIs: Record<string, any> = {};
      // Create 30 APIs for pagination testing
      for (let i = 1; i <= 30; i++) {
        mockAPIs[`api${i}.com:v1`] = mockApiGuruAPI;
      }

      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockAPIs });

      const result = await secondaryClient.searchAPIs('api', 10, 2);

      expect(result.results).toHaveLength(10);
      expect(result.total_results).toBe(30);
    });

    test('should be case-insensitive', async () => {
      const mockAPIs = {
        'TEST.com:v1': mockApiGuruAPI,
        'test.com:v1': mockApiGuruAPI
      };

      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockAPIs });

      const result = await secondaryClient.searchAPIs('TeSt');

      expect(result.results).toHaveLength(2);
    });
  });

  describe('getPopularAPIs', () => {
    test('should return popular APIs sorted by preferred version', async () => {
      const mockAPIs = {
        'api1.com:v1': { ...mockApiGuruAPI, preferred: 'v3' },
        'api2.com:v1': { ...mockApiGuruAPI, preferred: 'v2' },
        'api3.com:v1': { ...mockApiGuruAPI, preferred: 'v1' }
      };

      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockAPIs });

      const result = await secondaryClient.getPopularAPIs(2);

      expect(result.results).toHaveLength(2);
      expect(result.results[0].id).toBe('api1.com:v1'); // v3 > v2
      expect(result.source).toBe('secondary');
    });

    test('should use default limit of 20', async () => {
      const mockAPIs: Record<string, any> = {};
      for (let i = 1; i <= 30; i++) {
        mockAPIs[`api${i}.com:v1`] = mockApiGuruAPI;
      }

      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockAPIs });

      const result = await secondaryClient.getPopularAPIs();

      expect(result.results).toHaveLength(20);
    });
  });

  describe('getRecentlyUpdatedAPIs', () => {
    test('should return recently updated APIs sorted by preferred version', async () => {
      const mockAPIs = {
        'api1.com:v1': { ...mockApiGuruAPI, preferred: 'v3' },
        'api2.com:v1': { ...mockApiGuruAPI, preferred: 'v2' },
        'api3.com:v1': { ...mockApiGuruAPI, preferred: 'v1' }
      };

      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockAPIs });

      const result = await secondaryClient.getRecentlyUpdatedAPIs(2);

      expect(result.results).toHaveLength(2);
      expect(result.results[0].id).toBe('api1.com:v1'); // v3 > v2
      expect(result.source).toBe('secondary');
    });

    test('should use default limit of 10', async () => {
      const mockAPIs: Record<string, any> = {};
      for (let i = 1; i <= 20; i++) {
        mockAPIs[`api${i}.com:v1`] = mockApiGuruAPI;
      }

      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockAPIs });

      const result = await secondaryClient.getRecentlyUpdatedAPIs();

      expect(result.results).toHaveLength(10);
    });
  });

  describe('getAPIEndpoints', () => {
    test('should fetch and parse endpoints from OpenAPI spec', async () => {
      const apiId = 'test.com:v1';
      const mockAPIs = {
        'test.com:v1': mockApiGuruAPI
      };

      // Mock listAPIs call
      mockCacheManager.get
        .mockReturnValueOnce(undefined) // For endpoints cache
        .mockReturnValueOnce(undefined); // For listAPIs cache
      
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockAPIs });
      
      // Mock getOpenAPISpec call
      mockedAxios.get.mockResolvedValueOnce({ data: mockOpenAPISpec });

      const result = await secondaryClient.getAPIEndpoints(apiId);

      expect(result.results).toHaveLength(4); // 3 operations + 1 deprecated
      expect(result.available_tags).toEqual(['admin', 'users']);
      expect(result.pagination.total_results).toBe(4);
    });

    test('should filter endpoints by tag', async () => {
      const apiId = 'test.com:v1';
      const mockAPIs = {
        'test.com:v1': mockApiGuruAPI
      };

      mockCacheManager.get
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(undefined);
      
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockAPIs });
      mockedAxios.get.mockResolvedValueOnce({ data: mockOpenAPISpec });

      const result = await secondaryClient.getAPIEndpoints(apiId, 1, 30, 'users');

      expect(result.results).toHaveLength(3); // Only users endpoints
      expect(result.results.every(e => e.tags.includes('users'))).toBe(true);
    });

    test('should handle pagination correctly', async () => {
      const apiId = 'test.com:v1';
      const mockAPIs = {
        'test.com:v1': mockApiGuruAPI
      };

      mockCacheManager.get
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(undefined);
      
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockAPIs });
      mockedAxios.get.mockResolvedValueOnce({ data: mockOpenAPISpec });

      const result = await secondaryClient.getAPIEndpoints(apiId, 2, 2);

      expect(result.results).toHaveLength(2);
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.has_previous).toBe(true);
      expect(result.pagination.has_next).toBe(false);
    });

    test('should handle API ID without version', async () => {
      const apiId = 'test.com:api:v1';
      const mockAPIs = {
        'test.com:api': mockApiGuruAPI
      };

      mockCacheManager.get
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(undefined);
      
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockAPIs });
      mockedAxios.get.mockResolvedValueOnce({ data: mockOpenAPISpec });

      const result = await secondaryClient.getAPIEndpoints(apiId);

      expect(result.results).toBeDefined();
    });

    test('should handle absolute swagger URLs', async () => {
      const apiId = 'test.com:v1';
      const mockAPIsWithAbsoluteUrl = {
        'test.com:v1': {
          ...mockApiGuruAPI,
          versions: {
            v1: {
              ...mockApiGuruAPI.versions.v1,
              swaggerUrl: 'https://example.com/spec.json'
            }
          }
        }
      };

      mockCacheManager.get
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(undefined);
      
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockAPIsWithAbsoluteUrl });
      mockedAxios.get.mockResolvedValueOnce({ data: mockOpenAPISpec });

      await secondaryClient.getAPIEndpoints(apiId);

      expect(mockedAxios.get).toHaveBeenCalledWith('https://example.com/spec.json', expect.any(Object));
    });

    test('should enforce limit bounds', async () => {
      const apiId = 'test.com:v1';
      const mockAPIs = {
        'test.com:v1': mockApiGuruAPI
      };

      mockCacheManager.get
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(undefined);
      
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockAPIs });
      mockedAxios.get.mockResolvedValueOnce({ data: mockOpenAPISpec });

      // Test maximum limit
      const result1 = await secondaryClient.getAPIEndpoints(apiId, 1, 200);
      expect(result1.pagination.limit).toBe(100);

      // Clear mocks for next test
      mockCacheManager.get.mockClear();
      mockAxiosInstance.get.mockClear();
      mockedAxios.get.mockClear();

      mockCacheManager.get
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(undefined);
      
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockAPIs });
      mockedAxios.get.mockResolvedValueOnce({ data: mockOpenAPISpec });

      // Test minimum limit
      const result2 = await secondaryClient.getAPIEndpoints(apiId, 1, 0);
      expect(result2.pagination.limit).toBe(1);
    });

    test('should throw error when API not found', async () => {
      mockCacheManager.get
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(undefined);
      
      mockAxiosInstance.get.mockResolvedValueOnce({ data: {} });

      await expect(secondaryClient.getAPIEndpoints('unknown:api')).rejects.toThrow('API not found: unknown:api');
    });

    test('should throw error when preferred version not found', async () => {
      const apiId = 'test.com:v1';
      const mockAPIsWithoutPreferred = {
        'test.com:v1': {
          ...mockApiGuruAPI,
          preferred: 'v2', // Non-existent version
          versions: mockApiGuruAPI.versions
        }
      };

      mockCacheManager.get
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(undefined);
      
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockAPIsWithoutPreferred });

      await expect(secondaryClient.getAPIEndpoints(apiId)).rejects.toThrow('Preferred version not found for API: test.com:v1');
    });
  });

  describe('getEndpointDetails', () => {
    test('should return endpoint details', async () => {
      const apiId = 'test.com:v1';
      const method = 'GET';
      const path = '/users';
      const mockAPIs = {
        'test.com:v1': mockApiGuruAPI
      };

      // Mock the entire chain of calls
      mockCacheManager.get
        .mockReturnValueOnce(undefined) // endpoint details cache
        .mockReturnValueOnce(undefined) // endpoints cache
        .mockReturnValueOnce(undefined); // listAPIs cache
      
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockAPIs });
      mockedAxios.get.mockResolvedValueOnce({ data: mockOpenAPISpec });

      const result = await secondaryClient.getEndpointDetails(apiId, method, path);

      expect(result).toMatchObject({
        method: 'GET',
        path: '/users',
        summary: 'Get users',
        api_id: apiId,
        source: 'secondary'
      });
    });

    test('should handle case-insensitive method matching', async () => {
      const apiId = 'test.com:v1';
      const mockAPIs = {
        'test.com:v1': mockApiGuruAPI
      };

      mockCacheManager.get
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(undefined);
      
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockAPIs });
      mockedAxios.get.mockResolvedValueOnce({ data: mockOpenAPISpec });

      const result = await secondaryClient.getEndpointDetails(apiId, 'get', '/users');

      expect(result.method).toBe('GET');
    });

    test('should throw error when endpoint not found', async () => {
      const apiId = 'test.com:v1';
      const mockAPIs = {
        'test.com:v1': mockApiGuruAPI
      };

      mockCacheManager.get
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(undefined);
      
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockAPIs });
      mockedAxios.get.mockResolvedValueOnce({ data: mockOpenAPISpec });

      await expect(secondaryClient.getEndpointDetails(apiId, 'DELETE', '/nonexistent'))
        .rejects.toThrow('Endpoint not found: DELETE /nonexistent');
    });
  });

  describe('getEndpointSchema', () => {
    test('should return endpoint schema', async () => {
      const apiId = 'test.com:v1';
      const method = 'POST';
      const path = '/users';
      const mockAPIs = {
        'test.com:v1': mockApiGuruAPI
      };

      mockCacheManager.get
        .mockReturnValueOnce(undefined) // schema cache
        .mockReturnValueOnce(undefined) // listAPIs cache
        .mockReturnValueOnce(undefined); // spec cache
      
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockAPIs });
      mockedAxios.get.mockResolvedValueOnce({ data: mockOpenAPISpec });

      const result = await secondaryClient.getEndpointSchema(apiId, method, path);

      expect(result).toMatchObject({
        api_id: apiId,
        method: 'POST',
        path: '/users',
        parameters: [],
        requestBody: expect.any(Object),
        responses: expect.any(Object),
        source: 'secondary'
      });
    });

    test('should handle paths with parameters', async () => {
      const apiId = 'test.com:v1';
      const method = 'GET';
      const path = '/users/{id}';
      const mockAPIs = {
        'test.com:v1': mockApiGuruAPI
      };

      mockCacheManager.get
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(undefined);
      
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockAPIs });
      mockedAxios.get.mockResolvedValueOnce({ data: mockOpenAPISpec });

      const result = await secondaryClient.getEndpointSchema(apiId, method, path);

      expect(result.parameters).toHaveLength(1);
      expect(result.parameters[0].name).toBe('id');
    });

    test('should handle API ID with three parts', async () => {
      const apiId = 'test.com:api:v1';
      const mockAPIs = {
        'test.com:api': mockApiGuruAPI
      };

      mockCacheManager.get
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(undefined);
      
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockAPIs });
      mockedAxios.get.mockResolvedValueOnce({ data: mockOpenAPISpec });

      const result = await secondaryClient.getEndpointSchema(apiId, 'GET', '/users');

      expect(result).toBeDefined();
    });

    test('should throw error when operation not found', async () => {
      const apiId = 'test.com:v1';
      const mockAPIs = {
        'test.com:v1': mockApiGuruAPI
      };

      mockCacheManager.get
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(undefined);
      
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockAPIs });
      mockedAxios.get.mockResolvedValueOnce({ data: mockOpenAPISpec });

      await expect(secondaryClient.getEndpointSchema(apiId, 'PATCH', '/users'))
        .rejects.toThrow('Endpoint not found: PATCH /users');
    });
  });

  describe('getEndpointExamples', () => {
    test('should return empty examples for secondary source', async () => {
      const apiId = 'test.com:v1';
      const method = 'GET';
      const path = '/users';
      const mockAPIs = {
        'test.com:v1': mockApiGuruAPI
      };

      // Mock getEndpointSchema chain
      mockCacheManager.get
        .mockReturnValueOnce(undefined) // examples cache
        .mockReturnValueOnce(undefined) // schema cache
        .mockReturnValueOnce(undefined) // listAPIs cache
        .mockReturnValueOnce(undefined); // spec cache
      
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockAPIs });
      mockedAxios.get.mockResolvedValueOnce({ data: mockOpenAPISpec });

      const result = await secondaryClient.getEndpointExamples(apiId, method, path);

      expect(result).toEqual({
        api_id: apiId,
        method: 'GET',
        path: '/users',
        request_examples: [],
        response_examples: [],
        source: 'secondary'
      });
    });

    test('should validate endpoint exists before returning examples', async () => {
      const apiId = 'test.com:v1';
      const mockAPIs = {
        'test.com:v1': mockApiGuruAPI
      };

      mockCacheManager.get
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(undefined);
      
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockAPIs });
      mockedAxios.get.mockResolvedValueOnce({ data: mockOpenAPISpec });

      await expect(secondaryClient.getEndpointExamples(apiId, 'DELETE', '/nonexistent'))
        .rejects.toThrow('Endpoint not found: DELETE /nonexistent');
    });
  });

  describe('fetchWithCacheNoRateLimit', () => {
    test('should fetch without rate limiting', async () => {
      const specUrl = 'https://example.com/spec.json';
      const mockSpec = {
        openapi: '3.0.0',
        info: { title: 'Test API' }
      };

      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockedAxios.get.mockResolvedValueOnce({ data: mockSpec });

      const result = await secondaryClient.getOpenAPISpec(specUrl);

      expect(rateLimiters.secondary!.execute).not.toHaveBeenCalled();
      expect(result).toEqual(mockSpec);
    });

    test('should cache results with proper TTL', async () => {
      const specUrl = 'https://example.com/spec.json';
      const mockSpec = { openapi: '3.0.0' };

      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockedAxios.get.mockResolvedValueOnce({ data: mockSpec });

      await secondaryClient.getOpenAPISpec(specUrl);

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        `secondary:spec:${specUrl}`,
        mockSpec,
        CACHE_TTL.SPECS
      );
    });

    test('should handle errors in fetchWithCacheNoRateLimit', async () => {
      const specUrl = 'https://example.com/spec.json';
      
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockedAxios.get.mockRejectedValueOnce({
        response: {
          status: 404,
          statusText: 'Not Found'
        }
      });

      await expect(secondaryClient.getOpenAPISpec(specUrl)).rejects.toThrow(NotFoundError);
      // Console logging happens but with console.info for NOT_FOUND_ERROR
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    test('should handle timeout errors', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockRejectedValueOnce({
        code: 'ECONNABORTED',
        message: 'timeout of 30000ms exceeded'
      });

      await expect(secondaryClient.getProviders()).rejects.toThrow(TimeoutError);
    });

    test('should handle 5xx server errors', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockRejectedValueOnce({
        response: {
          status: 500,
          statusText: 'Internal Server Error'
        }
      });

      await expect(secondaryClient.getProviders()).rejects.toThrow(ServerError);
    });

    test('should handle DNS errors', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockRejectedValueOnce({
        code: 'ENOTFOUND',
        message: 'getaddrinfo ENOTFOUND secondary.api.com'
      });

      await expect(secondaryClient.getProviders()).rejects.toThrow(NetworkError);
    });

    test('should handle connection reset errors', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockRejectedValueOnce({
        code: 'ECONNRESET',
        message: 'socket hang up'
      });

      // ECONNRESET is not specifically handled, so it becomes OpenAPIDirectoryError
      await expect(secondaryClient.getProviders()).rejects.toThrow('socket hang up');
    });
  });

  describe('edge cases', () => {
    test('should handle empty responses gracefully', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockResolvedValueOnce({ data: { data: [] } });

      const result = await secondaryClient.getProviders();

      expect(result.data).toEqual([]);
    });

    test('should handle malformed API data', async () => {
      const apiId = 'test.com:v1';
      const mockMalformedAPIs = {
        'test.com:v1': {
          // Missing required fields
          versions: {}
        }
      };

      mockCacheManager.get
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(undefined);
      
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockMalformedAPIs });

      await expect(secondaryClient.getAPIEndpoints(apiId))
        .rejects.toThrow('Preferred version not found for API: test.com:v1');
    });

    test('should handle specs without paths', async () => {
      const apiId = 'test.com:v1';
      const mockAPIs = {
        'test.com:v1': mockApiGuruAPI
      };
      const emptySpec = {
        openapi: '3.0.0',
        info: { title: 'Test API' }
        // No paths property
      };

      mockCacheManager.get
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(undefined);
      
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockAPIs });
      mockedAxios.get.mockResolvedValueOnce({ data: emptySpec });

      const result = await secondaryClient.getAPIEndpoints(apiId);

      expect(result.results).toEqual([]);
      expect(result.pagination.total_results).toBe(0);
    });

    test('should sort endpoints consistently', async () => {
      const apiId = 'test.com:v1';
      const mockAPIs = {
        'test.com:v1': mockApiGuruAPI
      };
      const unsortedSpec = {
        openapi: '3.0.0',
        paths: {
          '/z': { get: { summary: 'Z endpoint' } },
          '/a': { get: { summary: 'A endpoint' } },
          '/m': { get: { summary: 'M endpoint' } }
        }
      };

      mockCacheManager.get
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(undefined);
      
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockAPIs });
      mockedAxios.get.mockResolvedValueOnce({ data: unsortedSpec });

      const result = await secondaryClient.getAPIEndpoints(apiId);

      expect(result.results[0].path).toBe('/a');
      expect(result.results[1].path).toBe('/m');
      expect(result.results[2].path).toBe('/z');
    });
  });
});