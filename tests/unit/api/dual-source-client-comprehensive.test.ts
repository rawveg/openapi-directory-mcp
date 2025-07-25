import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { DualSourceApiClient } from '../../../src/api/dual-source-client.js';
import { ApiClient } from '../../../src/api/client.js';
import { SecondaryApiClient } from '../../../src/api/secondary-client.js';
import { CustomSpecClient } from '../../../src/custom-specs/custom-spec-client.js';
import { ICacheManager } from '../../../src/cache/types.js';
import { MergeUtilities } from '../../../src/utils/merge.js';
import { PaginationHelper } from '../../../src/utils/pagination.js';

// Mock all dependencies
jest.mock('../../../src/api/client.js');
jest.mock('../../../src/api/secondary-client.js');
jest.mock('../../../src/custom-specs/custom-spec-client.js');
jest.mock('../../../src/utils/merge.js');
jest.mock('../../../src/utils/pagination.js');

const MockedApiClient = ApiClient as jest.MockedClass<typeof ApiClient>;
const MockedSecondaryApiClient = SecondaryApiClient as jest.MockedClass<typeof SecondaryApiClient>;
const MockedCustomSpecClient = CustomSpecClient as jest.MockedClass<typeof CustomSpecClient>;

describe('DualSourceApiClient - Comprehensive Tests', () => {
  let dualClient: DualSourceApiClient;
  let mockPrimaryClient: jest.Mocked<ApiClient>;
  let mockSecondaryClient: jest.Mocked<SecondaryApiClient>;
  let mockCustomClient: jest.Mocked<CustomSpecClient>;
  let mockCacheManager: jest.Mocked<ICacheManager>;

  const mockApiGuruAPI = {
    added: '2023-01-01',
    preferred: 'v1',
    versions: {
      v1: {
        info: {
          title: 'Test API',
          description: 'Test description',
          'x-providerName': 'test.com',
          'x-apisguru-categories': ['test'],
          'x-apisguru-popularity': 50
        },
        swaggerUrl: 'https://test.com/swagger.json',
        updated: '2023-01-01T00:00:00Z',
        added: '2023-01-01T00:00:00Z',
        link: 'https://test.com/docs'
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

    // Mock primary client
    mockPrimaryClient = {
      getProviders: jest.fn(),
      getProvider: jest.fn(),
      getServices: jest.fn(),
      getAPI: jest.fn(),
      getServiceAPI: jest.fn(),
      listAPIs: jest.fn(),
      getPaginatedAPIs: jest.fn(),
      getAPISummary: jest.fn(),
      getMetrics: jest.fn(),
      searchAPIs: jest.fn(),
      getAPISummaryById: jest.fn(),
      getAPIEndpoints: jest.fn(),
      getEndpointDetails: jest.fn(),
      getEndpointSchema: jest.fn(),
      getEndpointExamples: jest.fn(),
      getPopularAPIs: jest.fn(),
      getRecentlyUpdatedAPIs: jest.fn(),
      getProviderStats: jest.fn(),
      getOpenAPISpec: jest.fn(),
      hasProvider: jest.fn(),
      hasAPI: jest.fn()
    } as any;

    // Mock secondary client
    mockSecondaryClient = {
      getProviders: jest.fn(),
      getProvider: jest.fn(),
      getServices: jest.fn(),
      getAPI: jest.fn(),
      getServiceAPI: jest.fn(),
      listAPIs: jest.fn(),
      getMetrics: jest.fn(),
      hasProvider: jest.fn(),
      hasAPI: jest.fn(),
      getAPIEndpoints: jest.fn()
    } as any;

    // Mock custom client
    mockCustomClient = {
      getProviders: jest.fn(),
      getProvider: jest.fn(),
      getServices: jest.fn(),
      getAPI: jest.fn(),
      getServiceAPI: jest.fn(),
      listAPIs: jest.fn(),
      getMetrics: jest.fn(),
      hasProvider: jest.fn(),
      hasAPI: jest.fn(),
      getAPIEndpoints: jest.fn(),
      getEndpointDetails: jest.fn(),
      invalidateCache: jest.fn(),
      getManifestManager: jest.fn()
    } as any;

    // Set up mocked constructors
    MockedApiClient.mockImplementation(() => mockPrimaryClient);
    MockedSecondaryApiClient.mockImplementation(() => mockSecondaryClient);
    MockedCustomSpecClient.mockImplementation(() => mockCustomClient);

    dualClient = new DualSourceApiClient('primary-url', 'secondary-url', mockCacheManager);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    test('should initialize all three clients correctly', () => {
      expect(MockedApiClient).toHaveBeenCalledWith('primary-url', mockCacheManager);
      expect(MockedSecondaryApiClient).toHaveBeenCalledWith('secondary-url', mockCacheManager);
      expect(MockedCustomSpecClient).toHaveBeenCalledWith(mockCacheManager);
    });
  });

  describe('fetchWithCache', () => {
    test('should return cached result when available', async () => {
      const cachedData = { data: ['cached'] };
      mockCacheManager.get.mockReturnValueOnce(cachedData);

      const result = await dualClient.getProviders();

      expect(mockCacheManager.get).toHaveBeenCalledWith('triple:providers');
      expect(result).toEqual(cachedData);
      expect(mockPrimaryClient.getProviders).not.toHaveBeenCalled();
    });

    test('should fetch and cache result when not cached', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      const mergedData = { data: ['provider1', 'provider2'] };

      // Mock MergeUtilities.mergeProviders
      (MergeUtilities.mergeProviders as jest.Mock)
        .mockReturnValueOnce({ data: ['provider1'] })
        .mockReturnValueOnce(mergedData);

      mockPrimaryClient.getProviders.mockResolvedValueOnce({ data: ['provider1'] });
      mockSecondaryClient.getProviders.mockResolvedValueOnce({ data: ['provider2'] });
      mockCustomClient.getProviders.mockResolvedValueOnce({ data: [] });

      const result = await dualClient.getProviders();

      expect(mockCacheManager.set).toHaveBeenCalledWith('triple:providers', mergedData, undefined);
      expect(result).toEqual(mergedData);
    });
  });

  describe('getServices', () => {
    test('should return custom services when available', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      const mockServices = { data: ['service1', 'service2'] };
      
      mockCustomClient.hasProvider.mockResolvedValueOnce(true);
      mockCustomClient.getServices.mockResolvedValueOnce(mockServices);

      const result = await dualClient.getServices('custom-provider');

      expect(mockCustomClient.hasProvider).toHaveBeenCalledWith('custom-provider');
      expect(mockCustomClient.getServices).toHaveBeenCalledWith('custom-provider');
      expect(result).toEqual(mockServices);
      expect(mockSecondaryClient.hasProvider).not.toHaveBeenCalled();
    });

    test('should fallback to secondary when custom fails', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      const mockServices = { data: ['service1'] };
      
      mockCustomClient.hasProvider.mockResolvedValueOnce(true);
      mockCustomClient.getServices.mockRejectedValueOnce(new Error('Custom failed'));
      mockSecondaryClient.hasProvider.mockResolvedValueOnce(true);
      mockSecondaryClient.getServices.mockResolvedValueOnce(mockServices);

      const result = await dualClient.getServices('test-provider');

      expect(mockSecondaryClient.getServices).toHaveBeenCalledWith('test-provider');
      expect(result).toEqual(mockServices);
    });

    test('should fallback to primary when secondary fails', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      const mockServices = { data: ['service1'] };
      
      mockCustomClient.hasProvider.mockResolvedValueOnce(false);
      mockSecondaryClient.hasProvider.mockResolvedValueOnce(true);
      mockSecondaryClient.getServices.mockRejectedValueOnce(new Error('Secondary failed'));
      mockPrimaryClient.getServices.mockResolvedValueOnce(mockServices);

      const result = await dualClient.getServices('test-provider');

      expect(mockPrimaryClient.getServices).toHaveBeenCalledWith('test-provider');
      expect(result).toEqual(mockServices);
    });

    test('should use primary when neither custom nor secondary has provider', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      const mockServices = { data: ['service1'] };
      
      mockCustomClient.hasProvider.mockResolvedValueOnce(false);
      mockSecondaryClient.hasProvider.mockResolvedValueOnce(false);
      mockPrimaryClient.getServices.mockResolvedValueOnce(mockServices);

      const result = await dualClient.getServices('test-provider');

      expect(mockPrimaryClient.getServices).toHaveBeenCalledWith('test-provider');
      expect(result).toEqual(mockServices);
    });
  });

  describe('getAPI', () => {
    test('should return custom API when available', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      
      mockCustomClient.hasAPI.mockResolvedValueOnce(true);
      mockCustomClient.getAPI.mockResolvedValueOnce(mockApiGuruAPI);

      const result = await dualClient.getAPI('test-provider', 'v1');

      expect(mockCustomClient.hasAPI).toHaveBeenCalledWith('test-provider:v1');
      expect(mockCustomClient.getAPI).toHaveBeenCalledWith('test-provider', 'v1');
      expect(result).toEqual(mockApiGuruAPI);
      expect(mockSecondaryClient.hasAPI).not.toHaveBeenCalled();
    });

    test('should fallback to secondary when custom fails', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      
      mockCustomClient.hasAPI.mockResolvedValueOnce(true);
      mockCustomClient.getAPI.mockRejectedValueOnce(new Error('Custom failed'));
      mockSecondaryClient.hasAPI.mockResolvedValueOnce(true);
      mockSecondaryClient.getAPI.mockResolvedValueOnce(mockApiGuruAPI);

      const result = await dualClient.getAPI('test-provider', 'v1');

      expect(mockSecondaryClient.getAPI).toHaveBeenCalledWith('test-provider', 'v1');
      expect(result).toEqual(mockApiGuruAPI);
    });

    test('should fallback to primary when secondary fails', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      
      mockCustomClient.hasAPI.mockResolvedValueOnce(false);
      mockSecondaryClient.hasAPI.mockResolvedValueOnce(true);
      mockSecondaryClient.getAPI.mockRejectedValueOnce(new Error('Secondary failed'));
      mockPrimaryClient.getAPI.mockResolvedValueOnce(mockApiGuruAPI);

      const result = await dualClient.getAPI('test-provider', 'v1');

      expect(mockPrimaryClient.getAPI).toHaveBeenCalledWith('test-provider', 'v1');
      expect(result).toEqual(mockApiGuruAPI);
    });
  });

  describe('getServiceAPI', () => {
    test('should handle custom provider with special logic', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      
      mockCustomClient.hasAPI.mockResolvedValueOnce(true);
      mockCustomClient.getAPI.mockResolvedValueOnce(mockApiGuruAPI);

      const result = await dualClient.getServiceAPI('custom', 'test-service', 'v1');

      expect(mockCustomClient.hasAPI).toHaveBeenCalledWith('custom:test-service:v1');
      expect(mockCustomClient.getAPI).toHaveBeenCalledWith('custom', 'test-service');
      expect(result).toEqual(mockApiGuruAPI);
    });

    test('should use regular service API flow for non-custom providers', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      
      mockCustomClient.hasAPI.mockResolvedValueOnce(true);
      mockCustomClient.getServiceAPI.mockResolvedValueOnce(mockApiGuruAPI);

      const result = await dualClient.getServiceAPI('test-provider', 'test-service', 'v1');

      expect(mockCustomClient.hasAPI).toHaveBeenCalledWith('test-provider:test-service:v1');
      expect(mockCustomClient.getServiceAPI).toHaveBeenCalledWith('test-provider', 'test-service', 'v1');
      expect(result).toEqual(mockApiGuruAPI);
    });

    test('should fallback through all sources when custom fails', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      
      mockCustomClient.hasAPI
        .mockResolvedValueOnce(false) // First check for custom:service:v1
        .mockResolvedValueOnce(true); // Second check for provider:service:v1
      mockCustomClient.getServiceAPI.mockRejectedValueOnce(new Error('Custom failed'));
      mockSecondaryClient.hasAPI.mockResolvedValueOnce(true);
      mockSecondaryClient.getServiceAPI.mockResolvedValueOnce(mockApiGuruAPI);

      const result = await dualClient.getServiceAPI('test-provider', 'test-service', 'v1');

      expect(mockSecondaryClient.getServiceAPI).toHaveBeenCalledWith('test-provider', 'test-service', 'v1');
      expect(result).toEqual(mockApiGuruAPI);
    });
  });

  describe('getPaginatedAPIs', () => {
    test('should merge paginated results from all sources', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      
      const primaryResults = {
        data: [{ id: 'p1:api1', title: 'Primary API', description: 'Primary API desc', provider: 'p1', preferred: 'v1', categories: [] }],
        totalFetched: 1,
        hasMore: false
      };
      
      const secondaryAPIs = {
        'p2:api1': mockApiGuruAPI
      };
      
      const customAPIs = {
        'p3:api1': mockApiGuruAPI
      };

      // Mock PaginationHelper.smartFetch
      (PaginationHelper.smartFetch as jest.Mock).mockResolvedValueOnce(primaryResults);
      
      mockSecondaryClient.listAPIs.mockResolvedValueOnce(secondaryAPIs);
      mockCustomClient.listAPIs.mockResolvedValueOnce(customAPIs);

      const expectedMerged = {
        results: [
          { id: 'p1:api1', title: 'Primary API', description: 'Primary API desc', provider: 'p1', preferred: 'v1', categories: [] },
          { id: 'p2:api1', title: 'Test API', description: 'Test description', provider: 'test.com', preferred: 'v1', categories: ['test'] },
          { id: 'p3:api1', title: 'Test API', description: 'Test description', provider: 'test.com', preferred: 'v1', categories: ['test'] }
        ],
        pagination: {
          page: 1,
          limit: 50,
          total_results: 3,
          total_pages: 1,
          has_next: false,
          has_previous: false
        }
      };

      // Mock MergeUtilities.mergePaginatedAPIs
      (MergeUtilities.mergePaginatedAPIs as jest.Mock)
        .mockReturnValueOnce(expectedMerged)
        .mockReturnValueOnce(expectedMerged);

      const result = await dualClient.getPaginatedAPIs(1, 50);

      expect(PaginationHelper.smartFetch).toHaveBeenCalled();
      expect(mockSecondaryClient.listAPIs).toHaveBeenCalled();
      expect(mockCustomClient.listAPIs).toHaveBeenCalled();
      expect(MergeUtilities.mergePaginatedAPIs).toHaveBeenCalledTimes(2);
      expect(result).toEqual(expectedMerged);
    });

    test('should handle source failures gracefully', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      
      // Mock PaginationHelper to reject
      (PaginationHelper.smartFetch as jest.Mock).mockRejectedValueOnce(new Error('Primary failed'));
      
      mockSecondaryClient.listAPIs.mockRejectedValueOnce(new Error('Secondary failed'));
      mockCustomClient.listAPIs.mockResolvedValueOnce({
        'custom:api1': mockApiGuruAPI
      });

      const expectedResult = {
        results: [{ id: 'custom:api1', title: 'Test API', description: 'Test description', provider: 'test.com', preferred: 'v1', categories: ['test'] }],
        pagination: { page: 1, limit: 50, total_results: 1, total_pages: 1, has_next: false, has_previous: false }
      };

      (MergeUtilities.mergePaginatedAPIs as jest.Mock)
        .mockReturnValueOnce(expectedResult)
        .mockReturnValueOnce(expectedResult);

      const result = await dualClient.getPaginatedAPIs(1, 50);

      expect(result).toEqual(expectedResult);
    });
  });

  describe('getAPISummary', () => {
    test('should calculate summary from merged API list', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      
      const allAPIs = {
        'p1:api1': {
          ...mockApiGuruAPI,
          versions: {
            v1: {
              ...mockApiGuruAPI.versions.v1,
              info: {
                ...mockApiGuruAPI.versions.v1.info,
                'x-apisguru-popularity': 95
              },
              updated: '2023-06-01T00:00:00Z'
            }
          }
        },
        'p2:api1': {
          ...mockApiGuruAPI,
          versions: {
            v1: {
              ...mockApiGuruAPI.versions.v1,
              info: {
                ...mockApiGuruAPI.versions.v1.info
              },
              updated: '2023-01-01T00:00:00Z'
            }
          }
        }
      };

      // Mock MergeUtilities.mergeAPILists to return merged APIs
      (MergeUtilities.mergeAPILists as jest.Mock)
        .mockReturnValueOnce(allAPIs)
        .mockReturnValueOnce(allAPIs);

      mockPrimaryClient.listAPIs.mockResolvedValueOnce(allAPIs);
      mockSecondaryClient.listAPIs.mockResolvedValueOnce({});
      mockCustomClient.listAPIs.mockResolvedValueOnce({});

      const result = await dualClient.getAPISummary();

      expect(result).toMatchObject({
        total_apis: 2,
        total_providers: 1,
        categories: expect.arrayContaining(['test']),
        popular_apis: expect.any(Array),
        recent_updates: expect.any(Array)
      });
      expect(result.popular_apis).toHaveLength(2);
      expect(result.recent_updates).toHaveLength(2);
    });
  });

  describe('getMetrics', () => {
    test('should aggregate metrics from all sources', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      
      const primaryMetrics = { numSpecs: 2, numAPIs: 2, numEndpoints: 10 };
      const secondaryMetrics = { numSpecs: 1, numAPIs: 1, numEndpoints: 5 };
      const customMetrics = { numSpecs: 1, numAPIs: 1, numEndpoints: 3 };
      
      const primaryAPIs = { 'p1:api1': mockApiGuruAPI };
      const secondaryAPIs = { 'p2:api1': mockApiGuruAPI };
      const customAPIs = { 'p3:api1': mockApiGuruAPI };

      mockPrimaryClient.getMetrics.mockResolvedValueOnce(primaryMetrics);
      mockSecondaryClient.getMetrics.mockResolvedValueOnce(secondaryMetrics);
      mockCustomClient.getMetrics.mockResolvedValueOnce(customMetrics);
      
      mockPrimaryClient.listAPIs.mockResolvedValueOnce(primaryAPIs);
      mockSecondaryClient.listAPIs.mockResolvedValueOnce(secondaryAPIs);
      mockCustomClient.listAPIs.mockResolvedValueOnce(customAPIs);

      const expectedMerged = { numSpecs: 4, numAPIs: 4, numEndpoints: 18 };
      
      (MergeUtilities.aggregateMetrics as jest.Mock)
        .mockResolvedValueOnce({ numSpecs: 3, numAPIs: 3, numEndpoints: 15 })
        .mockResolvedValueOnce(expectedMerged);

      const result = await dualClient.getMetrics();

      expect(MergeUtilities.aggregateMetrics).toHaveBeenCalledTimes(2);
      expect(result).toEqual(expectedMerged);
    });

    test('should handle metrics failure from sources', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      
      mockPrimaryClient.getMetrics.mockRejectedValueOnce(new Error('Primary metrics failed'));
      mockSecondaryClient.getMetrics.mockRejectedValueOnce(new Error('Secondary metrics failed'));
      mockCustomClient.getMetrics.mockResolvedValueOnce({ numSpecs: 1, numAPIs: 1, numEndpoints: 5 });
      
      mockPrimaryClient.listAPIs.mockResolvedValueOnce({});
      mockSecondaryClient.listAPIs.mockResolvedValueOnce({});
      mockCustomClient.listAPIs.mockResolvedValueOnce({ 'custom:api1': mockApiGuruAPI });

      const expectedMerged = { numSpecs: 1, numAPIs: 1, numEndpoints: 5 };
      
      (MergeUtilities.aggregateMetrics as jest.Mock)
        .mockResolvedValueOnce({ numSpecs: 0, numAPIs: 0, numEndpoints: 0 })
        .mockResolvedValueOnce(expectedMerged);

      const result = await dualClient.getMetrics();

      expect(result).toEqual(expectedMerged);
    });
  });

  describe('searchAPIs', () => {
    test('should search across all sources and merge results', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      
      const primaryResults = {
        results: [{ id: 'p1:api1', title: 'Primary API', description: 'Test API', provider: 'p1', preferred: 'v1', categories: [] }],
        pagination: { page: 1, limit: 20, total_results: 1, total_pages: 1, has_next: false, has_previous: false }
      };
      
      const secondaryAPIs = {
        'p2:search': {
          ...mockApiGuruAPI,
          versions: {
            v1: {
              ...mockApiGuruAPI.versions.v1,
              info: {
                ...mockApiGuruAPI.versions.v1.info,
                title: 'Search API',
                description: 'API for searching'
              }
            }
          }
        }
      };
      
      const customAPIs = {
        'p3:search': {
          ...mockApiGuruAPI,
          versions: {
            v1: {
              ...mockApiGuruAPI.versions.v1,
              info: {
                ...mockApiGuruAPI.versions.v1.info,
                title: 'Custom Search',
                description: 'Custom search API'
              }
            }
          }
        }
      };

      mockPrimaryClient.searchAPIs.mockResolvedValueOnce(primaryResults);
      mockSecondaryClient.listAPIs.mockResolvedValueOnce(secondaryAPIs);
      mockCustomClient.listAPIs.mockResolvedValueOnce(customAPIs);

      const expectedMerged = {
        results: [
          { id: 'p1:api1', title: 'Primary API', description: 'Test API', provider: 'p1', preferred: 'v1', categories: [] },
          { id: 'p2:search', title: 'Search API', description: 'API for searching', provider: 'test.com', preferred: 'v1', categories: ['test'] },
          { id: 'p3:search', title: 'Custom Search', description: 'Custom search API', provider: 'test.com', preferred: 'v1', categories: ['test'] }
        ],
        pagination: { page: 1, limit: 20, total_results: 3, total_pages: 1, has_next: false, has_previous: false }
      };

      (MergeUtilities.mergeSearchResults as jest.Mock)
        .mockReturnValueOnce(expectedMerged)
        .mockReturnValueOnce(expectedMerged);

      const result = await dualClient.searchAPIs('search');

      expect(mockPrimaryClient.searchAPIs).toHaveBeenCalledWith('search', undefined, 1, 1000);
      expect(mockSecondaryClient.listAPIs).toHaveBeenCalled();
      expect(mockCustomClient.listAPIs).toHaveBeenCalled();
      expect(MergeUtilities.mergeSearchResults).toHaveBeenCalledTimes(2);
      expect(result).toEqual(expectedMerged);
    });

    test('should filter by provider when specified', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      
      const primaryResults = {
        results: [],
        pagination: { page: 1, limit: 20, total_results: 0, total_pages: 0, has_next: false, has_previous: false }
      };
      
      const secondaryAPIs = {
        'test-provider:api1': {
          ...mockApiGuruAPI,
          versions: {
            v1: {
              ...mockApiGuruAPI.versions.v1,
              info: {
                ...mockApiGuruAPI.versions.v1.info,
                title: 'Filtered API',
                'x-providerName': 'test-provider'
              }
            }
          }
        },
        'other-provider:api1': mockApiGuruAPI
      };

      mockPrimaryClient.searchAPIs.mockResolvedValueOnce(primaryResults);
      mockSecondaryClient.listAPIs.mockResolvedValueOnce(secondaryAPIs);
      mockCustomClient.listAPIs.mockResolvedValueOnce({});

      const expectedMerged = {
        results: [
          { id: 'test-provider:api1', title: 'Filtered API', description: 'Test description', provider: 'test-provider', preferred: 'v1', categories: ['test'] }
        ],
        pagination: { page: 1, limit: 20, total_results: 1, total_pages: 1, has_next: false, has_previous: false }
      };

      (MergeUtilities.mergeSearchResults as jest.Mock)
        .mockReturnValueOnce(expectedMerged)
        .mockReturnValueOnce(expectedMerged);

      const result = await dualClient.searchAPIs('api', 'test-provider');

      expect(result).toEqual(expectedMerged);
    });

    test('should enforce limit bounds', async () => {
      // Test minimum limit (should be enforced to 1)
      mockCacheManager.get.mockReturnValueOnce(undefined);
      
      mockPrimaryClient.searchAPIs.mockResolvedValueOnce({
        results: [],
        pagination: { page: 1, limit: 20, total_results: 0, total_pages: 0, has_next: false, has_previous: false }
      });
      mockSecondaryClient.listAPIs.mockResolvedValueOnce({});
      mockCustomClient.listAPIs.mockResolvedValueOnce({});

      (MergeUtilities.mergeSearchResults as jest.Mock)
        .mockReturnValueOnce({ results: [], pagination: { page: 1, limit: 1, total_results: 0, total_pages: 0, has_next: false, has_previous: false } })
        .mockReturnValueOnce({ results: [], pagination: { page: 1, limit: 1, total_results: 0, total_pages: 0, has_next: false, has_previous: false } });

      await dualClient.searchAPIs('test', undefined, 1, 0);

      // The limit should be enforced to 1 (minimum)
      expect(MergeUtilities.mergeSearchResults).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        'test',
        1,
        1 // minimum enforced
      );
    });
  });

  describe('getAPISummaryById', () => {
    test('should return custom API summary when available', async () => {
      const customAPIs = {
        'custom:api1': {
          ...mockApiGuruAPI,
          versions: {
            v1: {
              ...mockApiGuruAPI.versions.v1,
              info: {
                ...mockApiGuruAPI.versions.v1.info,
                contact: { name: 'Support', url: 'https://custom.com/contact' },
                license: { name: 'MIT', url: 'https://opensource.org/licenses/MIT' }
              }
            }
          }
        }
      };

      mockCustomClient.hasAPI.mockResolvedValueOnce(true);
      mockCustomClient.listAPIs.mockResolvedValueOnce(customAPIs);

      const result = await dualClient.getAPISummaryById('custom:api1');

      expect(result).toMatchObject({
        id: 'custom:api1',
        title: 'Test API',
        description: 'Test description',
        provider: 'test.com',
        versions: ['v1'],
        preferred_version: 'v1',
        categories: ['test'],
        contact: { name: 'Support', url: 'https://custom.com/contact' },
        license: { name: 'MIT', url: 'https://opensource.org/licenses/MIT' },
        documentation_url: 'https://test.com/docs'
      });
    });

    test('should fallback to secondary when custom fails', async () => {
      const secondaryAPIs = {
        'secondary:api1': mockApiGuruAPI
      };

      mockCustomClient.hasAPI.mockResolvedValueOnce(true);
      mockCustomClient.listAPIs.mockRejectedValueOnce(new Error('Custom failed'));
      mockSecondaryClient.hasAPI.mockResolvedValueOnce(true);
      mockSecondaryClient.listAPIs.mockResolvedValueOnce(secondaryAPIs);

      const result = await dualClient.getAPISummaryById('secondary:api1');

      expect(mockSecondaryClient.listAPIs).toHaveBeenCalled();
      expect(result.id).toBe('secondary:api1');
    });

    test('should fallback to primary when secondary fails', async () => {
      const expectedSummary = {
        id: 'primary:api1',
        title: 'Primary API',
        description: 'Primary API description'
      };

      mockCustomClient.hasAPI.mockResolvedValueOnce(false);
      mockSecondaryClient.hasAPI.mockResolvedValueOnce(true);
      mockSecondaryClient.listAPIs.mockRejectedValueOnce(new Error('Secondary failed'));
      mockPrimaryClient.getAPISummaryById.mockResolvedValueOnce(expectedSummary);

      const result = await dualClient.getAPISummaryById('primary:api1');

      expect(mockPrimaryClient.getAPISummaryById).toHaveBeenCalledWith('primary:api1');
      expect(result).toEqual(expectedSummary);
    });
  });

  describe('getAPIEndpoints', () => {
    test('should return custom endpoints when available', async () => {
      const mockEndpoints = {
        results: [{ path: '/test', method: 'GET', summary: 'Test endpoint' }],
        pagination: { page: 1, limit: 30, total_results: 1, total_pages: 1, has_next: false, has_previous: false }
      };

      mockCustomClient.hasAPI.mockResolvedValueOnce(true);
      mockCustomClient.getAPIEndpoints.mockResolvedValueOnce(mockEndpoints);

      const result = await dualClient.getAPIEndpoints('custom:api1');

      expect(mockCustomClient.getAPIEndpoints).toHaveBeenCalledWith('custom:api1', 1, 30, undefined);
      expect(result).toEqual(mockEndpoints);
    });

    test('should fallback to secondary when custom fails', async () => {
      const mockEndpoints = {
        results: [{ path: '/test', method: 'GET', summary: 'Test endpoint' }],
        pagination: { page: 1, limit: 30, total_results: 1, total_pages: 1, has_next: false, has_previous: false }
      };

      mockCustomClient.hasAPI.mockResolvedValueOnce(true);
      mockCustomClient.getAPIEndpoints.mockRejectedValueOnce(new Error('Custom failed'));
      mockSecondaryClient.hasAPI.mockResolvedValueOnce(true);
      mockSecondaryClient.getAPIEndpoints = jest.fn().mockResolvedValueOnce(mockEndpoints);

      const result = await dualClient.getAPIEndpoints('secondary:api1');

      expect(mockSecondaryClient.getAPIEndpoints).toHaveBeenCalledWith('secondary:api1', 1, 30, undefined);
      expect(result).toEqual(mockEndpoints);
    });

    test('should fallback to primary when secondary does not have getAPIEndpoints method', async () => {
      const mockEndpoints = {
        results: [{ path: '/test', method: 'GET', summary: 'Test endpoint' }],
        pagination: { page: 1, limit: 30, total_results: 1, total_pages: 1, has_next: false, has_previous: false }
      };

      mockCustomClient.hasAPI.mockResolvedValueOnce(false);
      mockSecondaryClient.hasAPI.mockResolvedValueOnce(true);
      // Remove getAPIEndpoints method from secondary client to simulate it not existing
      delete (mockSecondaryClient as any).getAPIEndpoints;
      mockPrimaryClient.getAPIEndpoints.mockResolvedValueOnce(mockEndpoints);

      const result = await dualClient.getAPIEndpoints('secondary:api1');

      expect(mockPrimaryClient.getAPIEndpoints).toHaveBeenCalledWith('secondary:api1', 1, 30, undefined);
      expect(result).toEqual(mockEndpoints);
    });
  });

  describe('getEndpointDetails', () => {
    test('should return custom endpoint details when available', async () => {
      const mockDetails = {
        path: '/test/{id}',
        method: 'GET', 
        summary: 'Get test by ID',
        parameters: [{ name: 'id', in: 'path', required: true }]
      };

      mockCustomClient.hasAPI.mockResolvedValueOnce(true);
      mockCustomClient.getEndpointDetails.mockResolvedValueOnce(mockDetails);

      const result = await dualClient.getEndpointDetails('custom:api1', 'GET', '/test/{id}');

      expect(mockCustomClient.getEndpointDetails).toHaveBeenCalledWith('custom:api1', 'GET', '/test/{id}');
      expect(result).toEqual(mockDetails);
    });

    test('should fallback to primary when custom fails', async () => {
      const mockDetails = {
        path: '/test/{id}',
        method: 'GET',
        summary: 'Get test by ID'
      };

      mockCustomClient.hasAPI.mockResolvedValueOnce(true);
      mockCustomClient.getEndpointDetails.mockRejectedValueOnce(new Error('Custom failed'));
      mockSecondaryClient.hasAPI.mockResolvedValueOnce(true);
      mockPrimaryClient.getEndpointDetails.mockResolvedValueOnce(mockDetails);

      const result = await dualClient.getEndpointDetails('test:api1', 'GET', '/test/{id}');

      expect(mockPrimaryClient.getEndpointDetails).toHaveBeenCalledWith('test:api1', 'GET', '/test/{id}');
      expect(result).toEqual(mockDetails);
    });
  });

  describe('getEndpointSchema', () => {
    test('should return schema from primary for custom API', async () => {
      const mockSchema = {
        path: '/test',
        method: 'POST',
        request_body: { type: 'object', properties: { name: { type: 'string' } } },
        responses: [{ code: '200', schema: { type: 'object' } }]
      };

      mockCustomClient.hasAPI.mockResolvedValueOnce(true);
      mockPrimaryClient.getEndpointSchema.mockResolvedValueOnce(mockSchema);

      const result = await dualClient.getEndpointSchema('custom:api1', 'POST', '/test');

      expect(mockPrimaryClient.getEndpointSchema).toHaveBeenCalledWith('custom:api1', 'POST', '/test');
      expect(result).toEqual(mockSchema);
    });

    test('should fallback properly when secondary does not support method', async () => {
      const mockSchema = {
        path: '/test',
        method: 'POST',
        request_body: { type: 'object' }
      };

      mockCustomClient.hasAPI.mockResolvedValueOnce(false);
      mockSecondaryClient.hasAPI.mockResolvedValueOnce(true);
      mockPrimaryClient.getEndpointSchema.mockResolvedValueOnce(mockSchema);

      const result = await dualClient.getEndpointSchema('secondary:api1', 'POST', '/test');

      expect(mockPrimaryClient.getEndpointSchema).toHaveBeenCalledWith('secondary:api1', 'POST', '/test');
      expect(result).toEqual(mockSchema);
    });
  });

  describe('getEndpointExamples', () => {
    test('should return examples from primary for custom API', async () => {
      const mockExamples = {
        path: '/test',
        method: 'POST',
        request_examples: [{ description: 'Example request', content_type: 'application/json', example: { name: 'test' } }],
        response_examples: [{ code: '200', description: 'Success', example: { id: '123', name: 'test' } }]
      };

      mockCustomClient.hasAPI.mockResolvedValueOnce(true);
      mockPrimaryClient.getEndpointExamples.mockResolvedValueOnce(mockExamples);

      const result = await dualClient.getEndpointExamples('custom:api1', 'POST', '/test');

      expect(mockPrimaryClient.getEndpointExamples).toHaveBeenCalledWith('custom:api1', 'POST', '/test');
      expect(result).toEqual(mockExamples);
    });

    test('should fallback properly when custom and secondary fail', async () => {
      const mockExamples = {
        path: '/test',
        method: 'GET',
        request_examples: [],
        response_examples: []
      };

      mockCustomClient.hasAPI.mockResolvedValueOnce(true);
      mockPrimaryClient.getEndpointExamples
        .mockRejectedValueOnce(new Error('Custom implementation failed'))
        .mockResolvedValueOnce(mockExamples);
      mockSecondaryClient.hasAPI.mockResolvedValueOnce(true);

      const result = await dualClient.getEndpointExamples('test:api1', 'GET', '/test');

      // Should be called twice - once for custom path, once for final fallback
      expect(mockPrimaryClient.getEndpointExamples).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockExamples);
    });
  });

  describe('getOpenAPISpec', () => {
    test('should handle custom API spec loading', async () => {
      const mockSpec = {
        openapi: '3.0.0',
        info: { title: 'Custom API', version: '1.0.0' },
        paths: { '/test': { get: { summary: 'Test endpoint' } } }
      };

      const mockManifestManager = {
        readSpecFile: jest.fn().mockReturnValueOnce(JSON.stringify({
          preferred: 'v1',
          versions: {
            v1: {
              spec: mockSpec
            }
          }
        }))
      };

      mockCustomClient.hasAPI.mockResolvedValueOnce(true);
      mockCustomClient.getManifestManager.mockReturnValueOnce(mockManifestManager);

      const result = await dualClient.getOpenAPISpec('custom:test-api:v1');

      expect(mockCustomClient.hasAPI).toHaveBeenCalledWith('custom:test-api:v1');
      expect(mockManifestManager.readSpecFile).toHaveBeenCalledWith('test-api', 'v1');
      expect(result).toEqual(mockSpec);
    });

    test('should throw error for invalid custom API ID format', async () => {
      mockCustomClient.hasAPI.mockResolvedValueOnce(true);

      await expect(dualClient.getOpenAPISpec('custom:invalid')).rejects.toThrow(
        'Invalid custom API ID format: custom:invalid. Expected format: custom:name:version'
      );
    });

    test('should throw error when custom API not found', async () => {
      mockCustomClient.hasAPI.mockResolvedValueOnce(false);

      await expect(dualClient.getOpenAPISpec('custom:not-found:v1')).rejects.toThrow(
        'Custom API not found: custom:not-found:v1'
      );
    });

    test('should handle custom spec loading errors', async () => {
      const mockManifestManager = {
        readSpecFile: jest.fn().mockImplementation(() => {
          throw new Error('File not found');
        })
      };

      mockCustomClient.hasAPI.mockResolvedValueOnce(true);
      mockCustomClient.getManifestManager.mockReturnValueOnce(mockManifestManager);

      await expect(dualClient.getOpenAPISpec('custom:error-api:v1')).rejects.toThrow(
        'Failed to load custom API spec: File not found'
      );
    });

    test('should fallback to primary client for regular URLs', async () => {
      const mockSpec = {
        openapi: '3.0.0',
        info: { title: 'Regular API', version: '1.0.0' }
      };

      mockPrimaryClient.getOpenAPISpec.mockResolvedValueOnce(mockSpec);

      const result = await dualClient.getOpenAPISpec('https://api.example.com/openapi.json');

      expect(mockPrimaryClient.getOpenAPISpec).toHaveBeenCalledWith('https://api.example.com/openapi.json');
      expect(result).toEqual(mockSpec);
    });
  });

  describe('getPopularAPIs', () => {
    test('should calculate popularity from merged API list', async () => {
      const allAPIs = {
        'popular1:api1': {
          ...mockApiGuruAPI,
          versions: {
            v1: { ...mockApiGuruAPI.versions.v1, updated: '2023-06-01T00:00:00Z' },
            v2: { ...mockApiGuruAPI.versions.v1, updated: '2023-07-01T00:00:00Z' }
          }
        },
        'popular2:api1': {
          ...mockApiGuruAPI,
          versions: {
            v1: { ...mockApiGuruAPI.versions.v1, updated: '2023-05-01T00:00:00Z' }
          }
        }
      };

      // Mock MergeUtilities.mergeAPILists
      (MergeUtilities.mergeAPILists as jest.Mock)
        .mockReturnValueOnce(allAPIs)
        .mockReturnValueOnce(allAPIs);

      mockPrimaryClient.listAPIs.mockResolvedValueOnce(allAPIs);
      mockSecondaryClient.listAPIs.mockResolvedValueOnce({});
      mockCustomClient.listAPIs.mockResolvedValueOnce({});

      const result = await dualClient.getPopularAPIs();

      expect(Object.keys(result)).toHaveLength(2);
      expect(result).toHaveProperty('popular1:api1');
      expect(result).toHaveProperty('popular2:api1');
      
      // Should prioritize API with more versions
      const popularKeys = Object.keys(result);
      expect(popularKeys[0]).toBe('popular1:api1'); // Should be first due to higher score
    });
  });

  describe('getRecentlyUpdatedAPIs', () => {
    test('should return recently updated APIs from merged list', async () => {
      const allAPIs = {
        'recent1:api1': {
          ...mockApiGuruAPI,
          versions: {
            v1: { ...mockApiGuruAPI.versions.v1, updated: '2023-07-01T00:00:00Z' }
          }
        },
        'recent2:api1': {
          ...mockApiGuruAPI,
          versions: {
            v1: { ...mockApiGuruAPI.versions.v1, updated: '2023-06-01T00:00:00Z' }
          }
        }
      };

      // Mock MergeUtilities.mergeAPILists
      (MergeUtilities.mergeAPILists as jest.Mock)
        .mockReturnValueOnce(allAPIs)
        .mockReturnValueOnce(allAPIs);

      mockPrimaryClient.listAPIs.mockResolvedValueOnce(allAPIs);
      mockSecondaryClient.listAPIs.mockResolvedValueOnce({});
      mockCustomClient.listAPIs.mockResolvedValueOnce({});

      const result = await dualClient.getRecentlyUpdatedAPIs(5);

      expect(Object.keys(result)).toHaveLength(2);
      expect(result).toHaveProperty('recent1:api1');
      expect(result).toHaveProperty('recent2:api1');
      
      // Should be sorted by most recent first
      const recentKeys = Object.keys(result);
      expect(recentKeys[0]).toBe('recent1:api1'); // More recent update
    });
  });

  describe('getProviderStats', () => {
    test('should calculate stats from provider APIs', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      
      const providerAPIs = {
        'test-provider:api1': mockApiGuruAPI,
        'test-provider:api2': {
          ...mockApiGuruAPI,
          versions: {
            v1: { ...mockApiGuruAPI.versions.v1, added: '2023-02-01T00:00:00Z' }
          }
        }
      };

      // Mock the getProvider method
      dualClient.getProvider = jest.fn().mockResolvedValueOnce(providerAPIs);

      const result = await dualClient.getProviderStats('test-provider');

      expect(dualClient.getProvider).toHaveBeenCalledWith('test-provider');
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'triple:stats:test-provider', 
        expect.objectContaining({
          totalAPIs: 2,
          totalVersions: 2,
          oldestAPI: expect.any(String),
          newestAPI: expect.any(String),
          latestUpdate: expect.any(String)
        }), 
        1800000
      );
    });
  });

  describe('cache invalidation and warming', () => {
    test('should invalidate custom spec caches', () => {
      dualClient.invalidateCustomSpecCaches();

      expect(mockCustomClient.invalidateCache).toHaveBeenCalled();
      expect(mockCacheManager.invalidateKeys).toHaveBeenCalledWith([
        'triple:providers',
        'triple:all_apis',
        'triple:metrics',
        'triple:api_summary'
      ]);
      expect(mockCacheManager.invalidatePattern).toHaveBeenCalledWith('triple:paginated_apis:*');
      expect(mockCacheManager.invalidatePattern).toHaveBeenCalledWith('triple:search:*');
    });

    test('should warm critical caches successfully', async () => {
      mockCacheManager.warmCache.mockResolvedValue(undefined);

      await dualClient.warmCriticalCaches();

      expect(mockCacheManager.warmCache).toHaveBeenCalledTimes(3);
      expect(mockCacheManager.warmCache).toHaveBeenCalledWith('triple:providers', expect.any(Function));
      expect(mockCacheManager.warmCache).toHaveBeenCalledWith('triple:metrics', expect.any(Function), 300000);
      expect(mockCacheManager.warmCache).toHaveBeenCalledWith('triple:all_apis', expect.any(Function));
    });

    test('should handle cache warming errors gracefully', async () => {
      mockCacheManager.warmCache.mockRejectedValue(new Error('Cache warming failed'));

      // Should not throw
      await expect(dualClient.warmCriticalCaches()).resolves.toBeUndefined();

      expect(mockCacheManager.warmCache).toHaveBeenCalledTimes(3);
    });
  });

  describe('error handling and edge cases', () => {
    test('should handle all sources failing gracefully', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      
      mockPrimaryClient.getProviders.mockRejectedValueOnce(new Error('Primary failed'));
      mockSecondaryClient.getProviders.mockRejectedValueOnce(new Error('Secondary failed'));
      mockCustomClient.getProviders.mockRejectedValueOnce(new Error('Custom failed'));

      // Mock MergeUtilities to handle empty results
      (MergeUtilities.mergeProviders as jest.Mock)
        .mockReturnValueOnce({ data: [] })
        .mockReturnValueOnce({ data: [] });

      const result = await dualClient.getProviders();

      expect(result).toEqual({ data: [] });
    });

    test('should handle malformed API data gracefully', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      
      const malformedAPIs = {
        'malformed:api1': null,
        'malformed:api2': 'not-an-object',
        'good:api1': mockApiGuruAPI
      };

      // Mock MergeUtilities.mergeAPILists
      (MergeUtilities.mergeAPILists as jest.Mock)
        .mockReturnValueOnce(malformedAPIs)
        .mockReturnValueOnce(malformedAPIs);

      mockPrimaryClient.listAPIs.mockResolvedValueOnce(malformedAPIs);
      mockSecondaryClient.listAPIs.mockResolvedValueOnce({});
      mockCustomClient.listAPIs.mockResolvedValueOnce({});

      const result = await dualClient.listAPIs();

      expect(result).toEqual(malformedAPIs);
    });

    test('should handle empty search query gracefully', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      
      const emptyResults = {
        results: [],
        pagination: { page: 1, limit: 20, total_results: 0, total_pages: 0, has_next: false, has_previous: false }
      };
      
      mockPrimaryClient.searchAPIs.mockResolvedValueOnce(emptyResults);
      mockSecondaryClient.listAPIs.mockResolvedValueOnce({});
      mockCustomClient.listAPIs.mockResolvedValueOnce({});

      (MergeUtilities.mergeSearchResults as jest.Mock)
        .mockReturnValueOnce(emptyResults)
        .mockReturnValueOnce(emptyResults);

      const result = await dualClient.searchAPIs('');

      expect(result).toEqual(emptyResults);
    });
  });
});