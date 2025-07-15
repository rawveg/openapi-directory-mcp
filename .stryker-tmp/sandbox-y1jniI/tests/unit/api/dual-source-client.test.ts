// @ts-nocheck
import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { DualSourceApiClient } from '../../../src/api/dual-source-client.js';
import { ApiClient } from '../../../src/api/client.js';
import { SecondaryApiClient } from '../../../src/api/secondary-client.js';
import { CustomSpecClient } from '../../../src/custom-specs/custom-spec-client.js';
import { CacheManager } from '../../../src/cache/manager.js';

// Mock dependencies
jest.mock('../../../src/api/client.js');
jest.mock('../../../src/api/secondary-client.js');
jest.mock('../../../src/custom-specs/custom-spec-client.js');
jest.mock('../../../src/cache/manager.js');

const MockedApiClient = ApiClient as jest.MockedClass<typeof ApiClient>;
const MockedSecondaryApiClient = SecondaryApiClient as jest.MockedClass<typeof SecondaryApiClient>;
const MockedCustomSpecClient = CustomSpecClient as jest.MockedClass<typeof CustomSpecClient>;
const MockedCacheManager = CacheManager as jest.MockedClass<typeof CacheManager>;

describe('DualSourceApiClient', () => {
  let dualClient: DualSourceApiClient;
  let primaryClient: jest.Mocked<ApiClient>;
  let secondaryClient: jest.Mocked<SecondaryApiClient>;
  let customClient: jest.Mocked<CustomSpecClient>;
  let cacheManager: jest.Mocked<CacheManager>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock instances
    cacheManager = {
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

    primaryClient = {
      getProviders: jest.fn(),
      getProvider: jest.fn(),
      getServices: jest.fn(),
      getAPI: jest.fn(),
      getServiceAPI: jest.fn(),
      listAPIs: jest.fn(),
      getMetrics: jest.fn(),
      getOpenAPISpec: jest.fn(),
      hasProvider: jest.fn(),
      hasAPI: jest.fn(),
      getProviderStats: jest.fn(),
      getAPISummaryById: jest.fn(),
      searchAPIs: jest.fn(),
      getPopularAPIs: jest.fn(),
      getRecentlyUpdatedAPIs: jest.fn(),
      getEndpointDetails: jest.fn(),
      getEndpointSchema: jest.fn(),
      getEndpointExamples: jest.fn(),
      getAPIEndpoints: jest.fn()
    } as any;

    secondaryClient = {
      getProviders: jest.fn(),
      getProvider: jest.fn(),
      getServices: jest.fn(),
      getAPI: jest.fn(),
      getServiceAPI: jest.fn(),
      listAPIs: jest.fn(),
      getMetrics: jest.fn(),
      getOpenAPISpec: jest.fn(),
      hasProvider: jest.fn(),
      hasAPI: jest.fn(),
      getProviderStats: jest.fn(),
      getAPISummaryById: jest.fn(),
      searchAPIs: jest.fn(),
      getPopularAPIs: jest.fn(),
      getRecentlyUpdatedAPIs: jest.fn(),
      getEndpointDetails: jest.fn(),
      getEndpointSchema: jest.fn(),
      getEndpointExamples: jest.fn(),
      getAPIEndpoints: jest.fn()
    } as any;

    customClient = {
      getProviders: jest.fn(),
      getProvider: jest.fn(),
      getServices: jest.fn(),
      getAPI: jest.fn(),
      getServiceAPI: jest.fn(),
      listAPIs: jest.fn(),
      getMetrics: jest.fn(),
      getOpenAPISpec: jest.fn(),
      hasProvider: jest.fn(),
      hasAPI: jest.fn(),
      getProviderStats: jest.fn(),
      getAPISummaryById: jest.fn(),
      searchAPIs: jest.fn(),
      getPopularAPIs: jest.fn(),
      getRecentlyUpdatedAPIs: jest.fn(),
      getEndpointDetails: jest.fn(),
      getEndpointSchema: jest.fn(),
      getEndpointExamples: jest.fn(),
      getAPIEndpoints: jest.fn()
    } as any;
    
    // Set up the mocked constructors
    MockedApiClient.mockImplementation(() => primaryClient);
    MockedSecondaryApiClient.mockImplementation(() => secondaryClient);
    MockedCustomSpecClient.mockImplementation(() => customClient);
    MockedCacheManager.mockImplementation(() => cacheManager);
    
    dualClient = new DualSourceApiClient('primary-url', 'secondary-url', cacheManager);
  });

  describe('constructor', () => {
    test('should initialize all three clients', () => {
      expect(MockedApiClient).toHaveBeenCalledWith('primary-url', cacheManager);
      expect(MockedSecondaryApiClient).toHaveBeenCalledWith('secondary-url', cacheManager);
      expect(MockedCustomSpecClient).toHaveBeenCalledWith(cacheManager);
    });
  });

  describe('getProviders', () => {
    test('should merge providers from all three sources', async () => {
      cacheManager.get.mockReturnValueOnce(undefined);
      primaryClient.getProviders.mockResolvedValueOnce({ data: ['provider1', 'provider2'] });
      secondaryClient.getProviders.mockResolvedValueOnce({ data: ['provider2', 'provider3'] });
      customClient.getProviders.mockResolvedValueOnce({ data: ['provider4'] });

      const result = await dualClient.getProviders();

      expect(result).toEqual({ data: ['provider1', 'provider2', 'provider3', 'provider4'] });
      expect(primaryClient.getProviders).toHaveBeenCalled();
      expect(secondaryClient.getProviders).toHaveBeenCalled();
      expect(customClient.getProviders).toHaveBeenCalled();
    });

    test('should handle primary source failure gracefully', async () => {
      cacheManager.get.mockReturnValueOnce(undefined);
      primaryClient.getProviders.mockRejectedValueOnce(new Error('Primary failed'));
      secondaryClient.getProviders.mockResolvedValueOnce({ data: ['provider1'] });
      customClient.getProviders.mockResolvedValueOnce({ data: [] });

      const result = await dualClient.getProviders();

      expect(result).toEqual({ data: ['provider1'] });
      expect(secondaryClient.getProviders).toHaveBeenCalled();
    });

    test('should handle secondary source failure gracefully', async () => {
      cacheManager.get.mockReturnValueOnce(undefined);
      primaryClient.getProviders.mockResolvedValueOnce({ data: ['provider1'] });
      secondaryClient.getProviders.mockRejectedValueOnce(new Error('Secondary failed'));
      customClient.getProviders.mockResolvedValueOnce({ data: [] });

      const result = await dualClient.getProviders();

      expect(result).toEqual({ data: ['provider1'] });
      expect(primaryClient.getProviders).toHaveBeenCalled();
    });

    test('should return custom providers even if both sources fail', async () => {
      cacheManager.get.mockReturnValueOnce(undefined);
      primaryClient.getProviders.mockRejectedValueOnce(new Error('Primary failed'));
      secondaryClient.getProviders.mockRejectedValueOnce(new Error('Secondary failed'));
      customClient.getProviders.mockResolvedValueOnce({ data: ['custom'] });

      const result = await dualClient.getProviders();

      expect(result).toEqual({ data: ['custom'] });
    });
  });

  describe('getProvider', () => {
    test('should merge APIs from all three sources', async () => {
      cacheManager.get.mockReturnValueOnce(undefined);
      const mockPrimaryAPIs = { 
        'service1:v1': { added: '2023-01-01', preferred: 'v1', versions: {} }
      };
      const mockSecondaryAPIs = { 
        'service2:v1': { added: '2023-01-02', preferred: 'v1', versions: {} }
      };
      const mockCustomAPIs = { 
        'service3:v1': { added: '2023-01-03', preferred: 'v1', versions: {} }
      };
      
      primaryClient.getProvider.mockResolvedValueOnce(mockPrimaryAPIs);
      secondaryClient.getProvider.mockResolvedValueOnce(mockSecondaryAPIs);
      customClient.getProvider.mockResolvedValueOnce(mockCustomAPIs);

      const result = await dualClient.getProvider('test-provider');

      // Result should contain all APIs merged together
      expect(Object.keys(result)).toContain('service1:v1');
      expect(Object.keys(result)).toContain('service2:v1');
      expect(Object.keys(result)).toContain('service3:v1');
      expect(primaryClient.getProvider).toHaveBeenCalledWith('test-provider');
      expect(secondaryClient.getProvider).toHaveBeenCalledWith('test-provider');
      expect(customClient.getProvider).toHaveBeenCalledWith('test-provider');
    });

    test('should prioritize custom over secondary/primary for same API', async () => {
      cacheManager.get.mockReturnValueOnce(undefined);
      const mockPrimaryAPIs = { 
        'service:v1': { added: '2023-01-01', preferred: 'v1', versions: { v1: { info: { title: 'Primary' } } } }
      };
      const mockSecondaryAPIs = { 
        'service:v1': { added: '2023-01-02', preferred: 'v1', versions: { v1: { info: { title: 'Secondary' } } } }
      };
      const mockCustomAPIs = { 
        'service:v1': { added: '2023-01-03', preferred: 'v1', versions: { v1: { info: { title: 'Custom' } } } }
      };
      
      primaryClient.getProvider.mockResolvedValueOnce(mockPrimaryAPIs);
      secondaryClient.getProvider.mockResolvedValueOnce(mockSecondaryAPIs);
      customClient.getProvider.mockResolvedValueOnce(mockCustomAPIs);

      const result = await dualClient.getProvider('test-provider');

      // Custom should win
      expect(result['service:v1'].versions.v1.info.title).toBe('Custom');
    });
  });

  describe('getAPI', () => {
    test('should check custom first, then secondary, then primary', async () => {
      cacheManager.get.mockReturnValueOnce(undefined);
      const mockAPI = { 
        added: '2023-01-01', 
        preferred: 'v1', 
        versions: { v1: { info: { title: 'Test API' } } } 
      };
      
      customClient.hasAPI.mockResolvedValueOnce(false);
      secondaryClient.hasAPI.mockResolvedValueOnce(false);
      primaryClient.getAPI.mockResolvedValueOnce(mockAPI);

      const result = await dualClient.getAPI('test-provider', 'v1');

      expect(customClient.hasAPI).toHaveBeenCalledWith('test-provider:v1');
      expect(secondaryClient.hasAPI).toHaveBeenCalledWith('test-provider:v1');
      expect(primaryClient.getAPI).toHaveBeenCalledWith('test-provider', 'v1');
      expect(result).toEqual(mockAPI);
    });

    test('should return custom API if available', async () => {
      cacheManager.get.mockReturnValueOnce(undefined);
      const mockAPI = { 
        added: '2023-01-01', 
        preferred: 'v1', 
        versions: { v1: { info: { title: 'Custom API' } } } 
      };
      
      customClient.hasAPI.mockResolvedValueOnce(true);
      customClient.getAPI.mockResolvedValueOnce(mockAPI);

      const result = await dualClient.getAPI('test-provider', 'v1');

      expect(customClient.hasAPI).toHaveBeenCalledWith('test-provider:v1');
      expect(customClient.getAPI).toHaveBeenCalledWith('test-provider', 'v1');
      expect(secondaryClient.hasAPI).not.toHaveBeenCalled();
      expect(primaryClient.getAPI).not.toHaveBeenCalled();
      expect(result).toEqual(mockAPI);
    });
  });

  describe('listAPIs', () => {
    test('should merge APIs from all three sources', async () => {
      cacheManager.get.mockReturnValueOnce(undefined);
      const primaryAPIs = {
        'provider1:api1': { added: '2023-01-01', preferred: 'v1', versions: {} }
      };
      const secondaryAPIs = {
        'provider2:api1': { added: '2023-01-02', preferred: 'v1', versions: {} }
      };
      const customAPIs = {
        'provider3:api1': { added: '2023-01-03', preferred: 'v1', versions: {} }
      };

      primaryClient.listAPIs.mockResolvedValueOnce(primaryAPIs);
      secondaryClient.listAPIs.mockResolvedValueOnce(secondaryAPIs);
      customClient.listAPIs.mockResolvedValueOnce(customAPIs);

      const result = await dualClient.listAPIs();

      expect(Object.keys(result)).toHaveLength(3);
      expect(result).toHaveProperty('provider1:api1');
      expect(result).toHaveProperty('provider2:api1');
      expect(result).toHaveProperty('provider3:api1');
    });

    test('should handle empty results from one source', async () => {
      cacheManager.get.mockReturnValueOnce(undefined);
      primaryClient.listAPIs.mockResolvedValueOnce({});
      secondaryClient.listAPIs.mockResolvedValueOnce({
        'provider1:api1': { added: '2023-01-01', preferred: 'v1', versions: {} }
      });
      customClient.listAPIs.mockResolvedValueOnce({});

      const result = await dualClient.listAPIs();

      expect(Object.keys(result)).toHaveLength(1);
      expect(result).toHaveProperty('provider1:api1');
    });
  });

  describe('searchAPIs', () => {
    test('should search all sources and merge results', async () => {
      cacheManager.get.mockReturnValueOnce(undefined);
      const primaryResults = {
        results: [{ id: 'p1:api1', title: 'API 1', description: 'Test API 1', provider: 'p1', preferred: 'v1', categories: [] }],
        pagination: { page: 1, limit: 20, total_results: 1, total_pages: 1, has_next: false, has_previous: false }
      };
      const secondaryAPIs = {
        'p2:api1': {
          added: '2023-01-01',
          preferred: 'v1',
          versions: {
            v1: {
              info: {
                title: 'API 2',
                description: 'Test API 2',
                'x-providerName': 'p2'
              }
            }
          }
        }
      };
      const customAPIs = {
        'p3:api1': {
          added: '2023-01-01',
          preferred: 'v1',
          versions: {
            v1: {
              info: {
                title: 'API 3',
                description: 'Test API 3',
                'x-providerName': 'p3'
              }
            }
          }
        }
      };

      primaryClient.searchAPIs.mockResolvedValueOnce(primaryResults);
      secondaryClient.listAPIs.mockResolvedValueOnce(secondaryAPIs);
      customClient.listAPIs.mockResolvedValueOnce(customAPIs);

      const result = await dualClient.searchAPIs('api');

      expect(result.results).toHaveLength(3);
      expect(result.pagination.total_results).toBe(3);
    });

    test('should deduplicate search results with custom taking precedence', async () => {
      cacheManager.get.mockReturnValueOnce(undefined);
      const primaryResults = {
        results: [{ id: 'p1:api1', title: 'Primary API', description: 'Test API', provider: 'p1', preferred: 'v1', categories: [] }],
        pagination: { page: 1, limit: 20, total_results: 1, total_pages: 1, has_next: false, has_previous: false }
      };
      const secondaryAPIs = {
        'p1:api1': {
          added: '2023-01-01',
          preferred: 'v1',
          versions: {
            v1: {
              info: {
                title: 'Secondary API',
                description: 'Test API',
                'x-providerName': 'p1'
              }
            }
          }
        }
      };
      const customAPIs = {
        'p1:api1': {
          added: '2023-01-01',
          preferred: 'v1',
          versions: {
            v1: {
              info: {
                title: 'Custom API',
                description: 'Test API',
                'x-providerName': 'p1'
              }
            }
          }
        }
      };

      primaryClient.searchAPIs.mockResolvedValueOnce(primaryResults);
      secondaryClient.listAPIs.mockResolvedValueOnce(secondaryAPIs);
      customClient.listAPIs.mockResolvedValueOnce(customAPIs);

      const result = await dualClient.searchAPIs('api');

      expect(result.results).toHaveLength(1);
      expect(result.results[0].title).toBe('Custom API');
      expect(result.pagination.total_results).toBe(1);
    });
  });

  describe('getMetrics', () => {
    test('should aggregate metrics from all sources', async () => {
      cacheManager.get.mockReturnValueOnce(undefined);
      primaryClient.listAPIs.mockResolvedValueOnce({
        'p1:api1': { added: '2023-01-01', preferred: 'v1', versions: {} },
        'p1:api2': { added: '2023-01-02', preferred: 'v1', versions: {} }
      });
      secondaryClient.listAPIs.mockResolvedValueOnce({
        'p2:api1': { added: '2023-01-03', preferred: 'v1', versions: {} }
      });
      customClient.listAPIs.mockResolvedValueOnce({
        'p3:api1': { added: '2023-01-04', preferred: 'v1', versions: {} }
      });
      
      primaryClient.getMetrics.mockResolvedValueOnce({
        numSpecs: 2,
        numAPIs: 2,
        numEndpoints: 10,
        unreachable: 0,
        invalid: 0,
        unofficial: 0,
        fixes: 0,
        fixedPct: 0,
        datasets: []
      });
      secondaryClient.getMetrics.mockResolvedValueOnce({
        numSpecs: 1,
        numAPIs: 1,
        numEndpoints: 5,
        unreachable: 0,
        invalid: 0,
        unofficial: 0,
        fixes: 0,
        fixedPct: 0,
        datasets: []
      });
      
      customClient.getMetrics = jest.fn().mockResolvedValueOnce({
        numSpecs: 1,
        numAPIs: 1,
        numEndpoints: 0,
        unreachable: 0,
        invalid: 0,
        unofficial: 0,
        fixes: 0,
        fixedPct: 0,
        datasets: []
      });

      const result = await dualClient.getMetrics();

      expect(result.numSpecs).toBe(4); // 2 primary + 1 secondary + 1 custom
      expect(result.numAPIs).toBe(4); // 2 primary + 1 secondary + 1 custom
      expect(result.numEndpoints).toBe(15); // 10 + 5
    });

    test('should handle metrics failure from one source', async () => {
      cacheManager.get.mockReturnValueOnce(undefined);
      primaryClient.listAPIs.mockResolvedValueOnce({
        'p1:api1': { added: '2023-01-01', preferred: 'v1', versions: {} }
      });
      secondaryClient.listAPIs.mockResolvedValueOnce({});
      customClient.listAPIs.mockResolvedValueOnce({});
      
      primaryClient.getMetrics.mockRejectedValueOnce(new Error('Metrics failed'));
      secondaryClient.getMetrics.mockRejectedValueOnce(new Error('Metrics failed'));
      customClient.getMetrics = jest.fn().mockResolvedValueOnce({
        numSpecs: 0,
        numAPIs: 0,
        numEndpoints: 0,
        unreachable: 0,
        invalid: 0,
        unofficial: 0,
        fixes: 0,
        fixedPct: 0,
        datasets: []
      });

      const result = await dualClient.getMetrics();

      expect(result.numSpecs).toBe(1); // Only from the primary API list count
      expect(result.numAPIs).toBe(1); // Only from the primary API list count
    });
  });

  describe('source preference', () => {
    test('should cache results from triple source', async () => {
      const cachedData = { data: ['cached-provider'] };
      cacheManager.get.mockReturnValueOnce(cachedData);

      const result = await dualClient.getProviders();

      expect(result).toEqual(cachedData);
      expect(primaryClient.getProviders).not.toHaveBeenCalled();
      expect(secondaryClient.getProviders).not.toHaveBeenCalled();
      expect(customClient.getProviders).not.toHaveBeenCalled();
    });
  });
});