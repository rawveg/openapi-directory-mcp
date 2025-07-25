import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { DualSourceApiClient } from '../../../src/api/dual-source-client.js';
import { ApiClient } from '../../../src/api/client.js';
import { SecondaryApiClient } from '../../../src/api/secondary-client.js';
import { CustomSpecClient } from '../../../src/custom-specs/custom-spec-client.js';
import { ICacheManager } from '../../../src/cache/types.js';
import { PaginationHelper } from '../../../src/utils/pagination.js';

// Mock dependencies
jest.mock('../../../src/api/client.js');
jest.mock('../../../src/api/secondary-client.js');
jest.mock('../../../src/custom-specs/custom-spec-client.js');
jest.mock('../../../src/utils/pagination.js');

const MockApiClient = ApiClient as jest.MockedClass<typeof ApiClient>;
const MockSecondaryApiClient = SecondaryApiClient as jest.MockedClass<typeof SecondaryApiClient>;
const MockCustomSpecClient = CustomSpecClient as jest.MockedClass<typeof CustomSpecClient>;

describe('DualSourceApiClient - Additional Branch Coverage', () => {
  let client: DualSourceApiClient;
  let mockCacheManager: jest.Mocked<ICacheManager>;
  let mockPrimaryClient: jest.Mocked<ApiClient>;
  let mockSecondaryClient: jest.Mocked<SecondaryApiClient>;
  let mockCustomClient: jest.Mocked<CustomSpecClient>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
      has: jest.fn(),
      keys: jest.fn(),
      values: jest.fn(),
      entries: jest.fn(),
      size: jest.fn(),
      invalidatePattern: jest.fn(),
      getStats: jest.fn(),
      cleanExpired: jest.fn(),
      destroy: jest.fn(),
      isDestroyed: jest.fn().mockReturnValue(false),
      stats: jest.fn(),
    };

    mockPrimaryClient = {
      getPaginatedAPIs: jest.fn(),
      searchAPIs: jest.fn(),
      listAPIs: jest.fn(),
      getProviders: jest.fn(),
      getProvider: jest.fn(),
      getServices: jest.fn(),
      getAPI: jest.fn(),
      getMetrics: jest.fn(),
      getOpenAPISpec: jest.fn(),
      getProviderStats: jest.fn(),
      getServiceAPI: jest.fn(),
      getPopularAPIs: jest.fn(),
      getRecentlyUpdatedAPIs: jest.fn(),
      fetchWithCache: jest.fn(),
      getAPISummary: jest.fn(),
      getAPIEndpoints: jest.fn(),
      getEndpointDetails: jest.fn(),
      getEndpointExamples: jest.fn(),
      getEndpointSchema: jest.fn(),
    } as any;

    mockSecondaryClient = {
      searchAPIs: jest.fn(),
      listAPIs: jest.fn(),
      getProviders: jest.fn(),
      getProvider: jest.fn(),
      getServices: jest.fn(),
      getAPI: jest.fn(),
      getMetrics: jest.fn(),
      getOpenAPISpec: jest.fn(),
      getProviderStats: jest.fn(),
      getServiceAPI: jest.fn(),
      getPopularAPIs: jest.fn(),
      getRecentlyUpdatedAPIs: jest.fn(),
      hasAPI: jest.fn(),
      fetchWithCache: jest.fn(),
    } as any;

    mockCustomClient = {
      searchAPIs: jest.fn(),
      listAPIs: jest.fn(),
      getProviders: jest.fn(),
      getProvider: jest.fn(),
      getServices: jest.fn(),
      getAPI: jest.fn(),
      getMetrics: jest.fn(),
      getOpenAPISpec: jest.fn(),
      getProviderStats: jest.fn(),
      getServiceAPI: jest.fn(),
      getPopularAPIs: jest.fn(),
      getRecentlyUpdatedAPIs: jest.fn(),
      hasAPI: jest.fn(),
      hasProvider: jest.fn(),
      getPaginatedAPIs: jest.fn(),
    } as any;

    MockApiClient.mockImplementation(() => mockPrimaryClient);
    MockSecondaryApiClient.mockImplementation(() => mockSecondaryClient);
    MockCustomSpecClient.mockImplementation(() => mockCustomClient);

    client = new DualSourceApiClient('http://primary.test', 'http://secondary.test', mockCacheManager);
  });

  describe('getPaginatedAPIs - PaginationHelper error handling', () => {
    test('should handle PaginationHelper.smartFetch errors gracefully', async () => {
      mockCacheManager.get.mockReturnValue(null);

      // Mock PaginationHelper.smartFetch to throw an error
      (PaginationHelper.smartFetch as jest.Mock).mockRejectedValue(new Error('Pagination error'));

      // Mock secondary and custom clients to return valid data
      mockSecondaryClient.listAPIs.mockResolvedValue({
        'secondary:api:1.0.0': {
          preferred: '1.0.0',
          added: '2023-01-01',
          versions: {
            '1.0.0': {
              info: { title: 'Secondary API', version: '1.0.0' },
              added: '2023-01-01',
              updated: '2023-01-01',
              swaggerUrl: 'test.json',
              swaggerYamlUrl: 'test.yaml',
              openapiVer: '3.0.0'
            }
          }
        }
      });

      mockCustomClient.listAPIs.mockResolvedValue({
        'custom:api:1.0.0': {
          preferred: '1.0.0',
          added: '2023-01-01',
          versions: {
            '1.0.0': {
              info: { title: 'Custom API', version: '1.0.0' },
              added: '2023-01-01',
              updated: '2023-01-01',
              swaggerUrl: 'test.json',
              swaggerYamlUrl: 'test.yaml',
              openapiVer: '3.0.0'
            }
          }
        }
      });

      const result = await client.getPaginatedAPIs(1, 50);

      // Should fallback to secondary and custom results only
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.results.some(r => r.id.includes('secondary'))).toBe(true);
      expect(result.results.some(r => r.id.includes('custom'))).toBe(true);
    });

    test('should handle all Promise.allSettled rejections in getPaginatedAPIs', async () => {
      mockCacheManager.get.mockReturnValue(null);

      // Mock all sources to fail
      (PaginationHelper.smartFetch as jest.Mock).mockRejectedValue(new Error('Primary error'));
      mockSecondaryClient.listAPIs.mockRejectedValue(new Error('Secondary error'));
      mockCustomClient.listAPIs.mockRejectedValue(new Error('Custom error'));

      const result = await client.getPaginatedAPIs(1, 50);

      // Should return empty results when all sources fail
      expect(result.results).toEqual([]);
      expect(result.pagination.total_results).toBe(0);
    });
  });

  describe('searchAPIs - Complex search scenarios', () => {
    test('should handle search with query matching version info fields', async () => {
      mockCacheManager.get.mockReturnValue(null);

      // Mock primary to return empty
      mockPrimaryClient.searchAPIs.mockResolvedValue({
        results: [],
        pagination: { page: 1, limit: 50, total_results: 0, total_pages: 0, has_next: false, has_previous: false }
      });

      // Mock secondary with complex API data to test all search branches
      mockSecondaryClient.listAPIs.mockResolvedValue({
        'test:api:1.0.0': {
          preferred: '1.0.0',
          added: '2023-01-01',
          versions: {
            '1.0.0': {
              info: {
                title: 'Payment Processing API', // Should match 'payment'
                description: 'Handle payment transactions',
                'x-providerName': 'PaymentCorp'
              },
              added: '2023-01-01',
              updated: '2023-01-01',
              swaggerUrl: 'test.json',
              swaggerYamlUrl: 'test.yaml',
              openapiVer: '3.0.0'
            }
          }
        },
        'another:api:1.0.0': {
          preferred: '1.0.0',
          added: '2023-01-01',
          versions: {
            '1.0.0': {
              info: {
                title: 'User Management',
                description: 'User operations and authentication',
                'x-providerName': 'UserProvider'
              },
              added: '2023-01-01',
              updated: '2023-01-01',
              swaggerUrl: 'test.json',
              swaggerYamlUrl: 'test.yaml',
              openapiVer: '3.0.0'
            }
          }
        }
      });

      // Mock custom to return empty object (listAPIs format)
      mockCustomClient.listAPIs.mockResolvedValue({});

      const result = await client.searchAPIs('payment', 1, 50);

      // Should successfully execute search without errors (covers version info field branches)
      expect(result).toBeDefined();
      expect(result.results).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);
    });

    test('should handle search with query matching description field', async () => {
      mockCacheManager.get.mockReturnValue(null);

      mockPrimaryClient.searchAPIs.mockResolvedValue({
        results: [],
        pagination: { page: 1, limit: 50, total_results: 0, total_pages: 0, has_next: false, has_previous: false }
      });

      mockSecondaryClient.listAPIs.mockResolvedValue({
        'analytics:api:1.0.0': {
          preferred: '1.0.0',
          added: '2023-01-01',
          versions: {
            '1.0.0': {
              info: {
                title: 'Analytics Platform',
                description: 'Advanced machine learning and data analytics', // Should match 'machine learning'
                'x-providerName': 'AnalyticsCorp'
              },
              added: '2023-01-01',
              updated: '2023-01-01',
              swaggerUrl: 'test.json',
              swaggerYamlUrl: 'test.yaml',
              openapiVer: '3.0.0'
            }
          }
        }
      });

      mockCustomClient.listAPIs.mockResolvedValue({});

      const result = await client.searchAPIs('machine learning', 1, 50);

      // Should successfully execute search without errors (covers description field branches)
      expect(result).toBeDefined();
      expect(result.results).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);
    });

    test('should handle search with query matching x-providerName field', async () => {
      mockCacheManager.get.mockReturnValue(null);

      mockPrimaryClient.searchAPIs.mockResolvedValue({
        results: [],
        pagination: { page: 1, limit: 50, total_results: 0, total_pages: 0, has_next: false, has_previous: false }
      });

      mockSecondaryClient.listAPIs.mockResolvedValue({
        'provider:api:1.0.0': {
          preferred: '1.0.0',
          added: '2023-01-01',
          versions: {
            '1.0.0': {
              info: {
                title: 'Generic API',
                description: 'Generic functionality',
                'x-providerName': 'SpecialProvider' // Should match 'specialprovider'
              },
              added: '2023-01-01',
              updated: '2023-01-01',
              swaggerUrl: 'test.json',
              swaggerYamlUrl: 'test.yaml',
              openapiVer: '3.0.0'
            }
          }
        }
      });

      mockCustomClient.listAPIs.mockResolvedValue({});

      const result = await client.searchAPIs('specialprovider', 1, 50);

      // Should successfully execute search without errors (covers x-providerName field branches)
      expect(result).toBeDefined();
      expect(result.results).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);
    });

    test('should handle APIs with missing version info fields', async () => {
      mockCacheManager.get.mockReturnValue(null);

      mockPrimaryClient.searchAPIs.mockResolvedValue({
        results: [],
        pagination: { page: 1, limit: 50, total_results: 0, total_pages: 0, has_next: false, has_previous: false }
      });

      mockSecondaryClient.listAPIs.mockResolvedValue({
        'incomplete:api:1.0.0': {
          preferred: '1.0.0',
          added: '2023-01-01',
          versions: {
            '1.0.0': {
              info: {
                // Missing title, description, x-providerName to test optional chaining
              },
              added: '2023-01-01',
              updated: '2023-01-01',
              swaggerUrl: 'test.json',
              swaggerYamlUrl: 'test.yaml',
              openapiVer: '3.0.0'
            }
          }
        }
      });

      mockCustomClient.listAPIs.mockResolvedValue({});

      // Should not crash even with missing fields
      const result = await client.searchAPIs('anything', 1, 50);

      expect(result).toBeDefined();
      expect(result.results).toBeDefined();
    });
  });

  describe('Additional edge cases', () => {
    test('should handle secondary listAPIs with empty return', async () => {
      mockCacheManager.get.mockReturnValue(null);

      mockPrimaryClient.searchAPIs.mockResolvedValue({
        results: [],
        pagination: { page: 1, limit: 50, total_results: 0, total_pages: 0, has_next: false, has_previous: false }
      });

      // Return empty object instead of undefined (null would also work)
      mockSecondaryClient.listAPIs.mockResolvedValue({});

      mockCustomClient.listAPIs.mockResolvedValue({});

      const result = await client.searchAPIs('test', 1, 50);

      expect(result).toBeDefined();
      expect(result.results).toBeDefined();
    });

    test('should handle Promise.allSettled with mixed fulfilled/rejected states', async () => {
      mockCacheManager.get.mockReturnValue(null);

      // Test listAPIs with mixed results instead
      mockPrimaryClient.listAPIs.mockResolvedValue({
        'primary:api:1.0.0': {
          preferred: '1.0.0',
          added: '2023-01-01',
          versions: {
            '1.0.0': {
              info: { title: 'Primary API', version: '1.0.0' },
              added: '2023-01-01',
              updated: '2023-01-01',
              swaggerUrl: 'test.json',
              swaggerYamlUrl: 'test.yaml',
              openapiVer: '3.0.0'
            }
          }
        }
      });

      mockSecondaryClient.listAPIs.mockRejectedValue(new Error('Secondary failed'));

      mockCustomClient.listAPIs.mockResolvedValue({
        'custom:api:1.0.0': {
          preferred: '1.0.0',
          added: '2023-01-01',
          versions: {
            '1.0.0': {
              info: { title: 'Custom API', version: '1.0.0' },
              added: '2023-01-01',
              updated: '2023-01-01',
              swaggerUrl: 'test.json',
              swaggerYamlUrl: 'test.yaml',
              openapiVer: '3.0.0'
            }
          }
        }
      });

      const result = await client.listAPIs();

      // Should include results from primary and custom, but not secondary
      expect(Object.keys(result)).toContain('primary:api:1.0.0');
      expect(Object.keys(result)).toContain('custom:api:1.0.0');
      expect(Object.keys(result).some(key => key.includes('secondary'))).toBe(false);
    });
  });
});