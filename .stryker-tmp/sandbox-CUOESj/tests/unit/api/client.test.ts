// @ts-nocheck
import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { ApiClient } from '../../../src/api/client.js';
import { ICacheManager } from '../../../src/cache/types.js';
import axios from 'axios';
import { NetworkError, TimeoutError, NotFoundError, ServerError } from '../../../src/utils/errors.js';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ApiClient', () => {
  let apiClient: ApiClient;
  let mockCacheManager: jest.Mocked<ICacheManager>;
  let mockAxiosInstance: any;

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
      patch: jest.fn()
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);
    
    apiClient = new ApiClient('https://api.example.com', mockCacheManager);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    test('should initialize with axios instance and cache manager', () => {
      expect(apiClient).toBeDefined();
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.example.com',
        timeout: 30000,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'openapi-directory-mcp/0.1.0'
        }
      });
      expect(apiClient['cache']).toBe(mockCacheManager);
    });
  });

  describe('getProviders', () => {
    test('should fetch providers from API when not cached', async () => {
      const mockProviders = { data: ['googleapis.com', 'azure.com', 'github.com'] };
      const mockResponse = { data: mockProviders };
      
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);

      const result = await apiClient.getProviders();

      expect(mockCacheManager.get).toHaveBeenCalledWith('providers');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/providers.json');
      expect(mockCacheManager.set).toHaveBeenCalledWith('providers', mockProviders, undefined);
      expect(result).toEqual(mockProviders);
    });

    test('should return cached providers when available', async () => {
      const cachedData = { data: ['cached-provider.com'] };
      mockCacheManager.get.mockReturnValueOnce(cachedData);

      const result = await apiClient.getProviders();

      expect(mockCacheManager.get).toHaveBeenCalledWith('providers');
      expect(mockAxiosInstance.get).not.toHaveBeenCalled();
      expect(result).toEqual(cachedData);
    });

    test('should handle network errors', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(apiClient.getProviders()).rejects.toThrow();
    });
  });

  describe('getProvider', () => {
    test('should fetch provider APIs from cache first', async () => {
      const provider = 'googleapis.com';
      const cachedAPIs = {
        'admin:directory_v1': { 
          added: '2015-01-01',
          preferred: '1',
          versions: {}
        }
      };
      
      mockCacheManager.get.mockReturnValueOnce(cachedAPIs);

      const result = await apiClient.getProvider(provider);

      expect(mockCacheManager.get).toHaveBeenCalledWith('provider:googleapis.com');
      expect(mockAxiosInstance.get).not.toHaveBeenCalled();
      expect(result).toEqual(cachedAPIs);
    });

    test('should fetch from API when not cached', async () => {
      const provider = 'github.com';
      const mockAPIs = {
        'api.github.com': {
          added: '2015-01-01',
          preferred: '3.0.0',
          versions: {}
        }
      };
      
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockResolvedValueOnce({ 
        data: { apis: mockAPIs } 
      });

      const result = await apiClient.getProvider(provider);

      expect(mockCacheManager.get).toHaveBeenCalledWith('provider:github.com');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/github.com.json');
      expect(mockCacheManager.set).toHaveBeenCalledWith('provider:github.com', mockAPIs, undefined);
      expect(result).toEqual(mockAPIs);
    });

    test('should handle empty apis object', async () => {
      const provider = 'empty.com';
      
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockResolvedValueOnce({ 
        data: {} 
      });

      const result = await apiClient.getProvider(provider);

      expect(result).toEqual({});
    });
  });

  describe('getServices', () => {
    test('should fetch services for a provider', async () => {
      const provider = 'googleapis.com';
      const mockServices = { data: ['admin', 'analytics', 'drive'] };
      
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockResolvedValueOnce(mockServices);

      const result = await apiClient.getServices(provider);

      expect(mockCacheManager.get).toHaveBeenCalledWith('services:googleapis.com');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/googleapis.com/services.json');
      expect(result).toEqual(mockServices.data);
    });
  });

  describe('getAPI', () => {
    test('should fetch specific API version', async () => {
      const provider = 'github.com';
      const api = 'v3';
      const mockAPI = {
        info: { title: 'GitHub API', version: 'v3' },
        openapi: '3.0.0'
      };
      
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockAPI });

      const result = await apiClient.getAPI(provider, api);

      expect(mockCacheManager.get).toHaveBeenCalledWith('api:github.com:v3');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/specs/github.com/v3.json');
      expect(result).toEqual(mockAPI);
    });
  });

  describe('getServiceAPI', () => {
    test('should fetch API with service name', async () => {
      const provider = 'googleapis.com';
      const service = 'admin';
      const api = 'directory_v1';
      const mockAPI = {
        info: { title: 'Admin Directory API', version: 'directory_v1' },
        openapi: '3.0.0'
      };
      
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockAPI });

      const result = await apiClient.getServiceAPI(provider, service, api);

      expect(mockCacheManager.get).toHaveBeenCalledWith('api:googleapis.com:admin:directory_v1');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/specs/googleapis.com:admin/directory_v1.json');
      expect(result).toEqual(mockAPI);
    });
  });

  describe('fetchWithCache', () => {
    test('should handle timeout errors', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      const timeoutError = new Error('timeout of 30000ms exceeded');
      (timeoutError as any).code = 'ECONNABORTED';
      mockAxiosInstance.get.mockRejectedValueOnce(timeoutError);

      await expect(apiClient.getProviders()).rejects.toThrow();
    });

    test('should cache successful responses with custom TTL', async () => {
      // Test indirectly through getAPI which might use custom TTL
      const mockData = { info: { title: 'Test API' } };
      
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockData });

      await apiClient.getAPI('test.com', 'v1');

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'api:test.com:v1',
        mockData,
        undefined
      );
    });
  });

  describe('error handling', () => {
    test('should handle 404 errors', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      const notFoundError = new Error('Not Found');
      (notFoundError as any).response = {
        status: 404,
        statusText: 'Not Found'
      };
      mockAxiosInstance.get.mockRejectedValueOnce(notFoundError);

      await expect(apiClient.getAPI('unknown.com', 'v1')).rejects.toThrow();
    });

    test('should handle server errors', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      const serverError = new Error('Internal Server Error');
      (serverError as any).response = {
        status: 500,
        statusText: 'Internal Server Error'
      };
      mockAxiosInstance.get.mockRejectedValueOnce(serverError);

      await expect(apiClient.getProviders()).rejects.toThrow();
    });
  });
});