import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { SecondaryApiClient } from '../../../src/api/secondary-client.js';
import { ICacheManager } from '../../../src/cache/types.js';
import axios from 'axios';
import { rateLimiters } from '../../../src/utils/rate-limiter.js';
import { NetworkError, TimeoutError, NotFoundError } from '../../../src/utils/errors.js';

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

describe('SecondaryApiClient', () => {
  let secondaryClient: SecondaryApiClient;
  let mockCacheManager: jest.Mocked<ICacheManager>;
  let mockAxiosInstance: any;
  let consoleErrorSpy: jest.SpyInstance;

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
    
    // Suppress console.error for error logging tests
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    secondaryClient = new SecondaryApiClient('https://secondary.api.com', mockCacheManager);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    test('should initialize with axios instance and cache manager', () => {
      expect(secondaryClient).toBeDefined();
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://secondary.api.com',
        timeout: 30000,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'openapi-directory-mcp/1.3.5-dual-source'
        }
      });
      expect(secondaryClient['cache']).toBe(mockCacheManager);
    });
  });

  describe('getProviders', () => {
    test('should fetch providers with secondary cache prefix', async () => {
      const mockProviders = { data: ['custom1.com', 'custom2.com'] };
      
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockProviders });

      const result = await secondaryClient.getProviders();

      expect(mockCacheManager.get).toHaveBeenCalledWith('secondary:providers');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/providers.json');
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'secondary:providers', 
        mockProviders,
        expect.any(Number) // CACHE_TTL.PROVIDERS
      );
      expect(result).toEqual(mockProviders);
    });

    test('should return cached providers when available', async () => {
      const cachedData = { data: ['cached-custom.com'] };
      mockCacheManager.get.mockReturnValueOnce(cachedData);

      const result = await secondaryClient.getProviders();

      expect(mockCacheManager.get).toHaveBeenCalledWith('secondary:providers');
      expect(mockAxiosInstance.get).not.toHaveBeenCalled();
      expect(result).toEqual(cachedData);
    });

    test('should apply rate limiting', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockResolvedValueOnce({ data: [] });

      await secondaryClient.getProviders();

      expect(rateLimiters.secondary.execute).toHaveBeenCalledWith(expect.any(Function));
    });

    test('should handle and log errors', async () => {
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

  describe('getProvider', () => {
    test('should fetch provider APIs with cache prefix', async () => {
      const provider = 'custom.com';
      const mockAPIs = {
        'api1': { 
          added: '2023-01-01',
          preferred: '1.0.0',
          versions: {}
        }
      };
      
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockAPIs });

      const result = await secondaryClient.getProvider(provider);

      expect(mockCacheManager.get).toHaveBeenCalledWith('secondary:provider:custom.com');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/custom.com.json');
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'secondary:provider:custom.com',
        mockAPIs,
        expect.any(Number)
      );
      expect(result).toEqual(mockAPIs);
    });
  });

  describe('getServices', () => {
    test('should fetch services with secondary prefix', async () => {
      const provider = 'custom.com';
      const mockServices = { data: ['service1', 'service2'] };
      
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockServices });

      const result = await secondaryClient.getServices(provider);

      expect(mockCacheManager.get).toHaveBeenCalledWith('secondary:services:custom.com');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/custom.com/services.json');
      expect(result).toEqual(mockServices);
    });
  });

  describe('getAPI', () => {
    test('should fetch specific API version', async () => {
      const provider = 'custom.com';
      const api = 'v1';
      const mockAPI = {
        info: { title: 'Custom API', version: 'v1' },
        openapi: '3.0.0'
      };
      
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockAPI });

      const result = await secondaryClient.getAPI(provider, api);

      expect(mockCacheManager.get).toHaveBeenCalledWith('secondary:api:custom.com:v1');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/specs/custom.com/v1.json');
      expect(result).toEqual(mockAPI);
    });
  });

  describe('getServiceAPI', () => {
    test('should fetch API with service name', async () => {
      const provider = 'custom.com';
      const service = 'auth';
      const api = 'v2';
      const mockAPI = {
        info: { title: 'Auth API', version: 'v2' },
        openapi: '3.0.0'
      };
      
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockAPI });

      const result = await secondaryClient.getServiceAPI(provider, service, api);

      expect(mockCacheManager.get).toHaveBeenCalledWith('secondary:api:custom.com:auth:v2');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/specs/custom.com/auth/v2.json');
      expect(result).toEqual(mockAPI);
    });
  });

  describe('listAPIs', () => {
    test('should fetch all APIs', async () => {
      const mockAllAPIs = {
        'custom.com': {
          'api1': { added: '2023-01-01', preferred: '1.0.0', versions: {} }
        }
      };
      
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockAllAPIs });

      const result = await secondaryClient.listAPIs();

      expect(mockCacheManager.get).toHaveBeenCalledWith('secondary:all_apis');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/list.json');
      expect(result).toEqual(mockAllAPIs);
    });
  });

  describe('getMetrics', () => {
    test('should fetch metrics data', async () => {
      const mockMetrics = {
        providerCount: 10,
        apiCount: 100,
        addedThisMonth: 5
      };
      
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockMetrics });

      const result = await secondaryClient.getMetrics();

      expect(mockCacheManager.get).toHaveBeenCalledWith('secondary:metrics');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/metrics.json');
      expect(result).toEqual(mockMetrics);
    });
  });

  describe('getOpenAPISpec', () => {
    test('should fetch OpenAPI spec from URL', async () => {
      const specUrl = 'https://example.com/spec.json';
      const mockSpec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' }
      };
      
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockedAxios.get.mockResolvedValueOnce({ data: mockSpec });

      const result = await secondaryClient.getOpenAPISpec(specUrl);

      expect(mockCacheManager.get).toHaveBeenCalledWith(`secondary:spec:${specUrl}`);
      // axios.get should be called directly, not through mockAxiosInstance
      expect(mockedAxios.get).toHaveBeenCalledWith(specUrl, {
        timeout: expect.any(Number)
      });
      expect(result).toEqual(mockSpec);
    });
  });

  describe('error handling', () => {
    test('should handle 404 errors', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockRejectedValueOnce({
        response: {
          status: 404,
          statusText: 'Not Found'
        }
      });

      await expect(secondaryClient.getAPI('unknown.com', 'v1')).rejects.toThrow(NotFoundError);
    });

    test('should handle timeout errors', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockRejectedValueOnce({
        code: 'ECONNABORTED',
        message: 'timeout of 30000ms exceeded'
      });

      await expect(secondaryClient.getProviders()).rejects.toThrow(TimeoutError);
    });

    test('should handle network errors', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockRejectedValueOnce({
        code: 'ENOTFOUND',
        message: 'getaddrinfo ENOTFOUND'
      });

      await expect(secondaryClient.getProviders()).rejects.toThrow(NetworkError);
    });
  });
});