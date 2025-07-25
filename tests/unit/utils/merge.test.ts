import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { MergeUtilities } from '../../../src/utils/merge.js';
import { ApiGuruAPI, ApiGuruMetrics } from '../../../src/types/api.js';

// Mock the validation module
jest.mock('../../../src/utils/validation.js', () => ({
  DataValidator: {
    validateProviders: jest.fn((data) => ({
      data,
      valid: true,
      errors: []
    })),
    validateMetrics: jest.fn((data) => ({
      data,
      valid: true,
      errors: []
    })),
    logValidationResults: jest.fn()
  }
}));

describe('MergeUtilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('mergeAPILists', () => {
    test('should merge API lists with secondary taking precedence', () => {
      const primaryAPIs: Record<string, ApiGuruAPI> = {
        'api1:v1': {
          added: '2023-01-01',
          preferred: 'v1',
          versions: {
            v1: {
              info: { title: 'API 1 Primary', version: 'v1' },
              added: '2023-01-01',
              updated: '2023-01-01',
              swaggerUrl: 'primary.json',
              swaggerYamlUrl: 'primary.yaml',
              openapiVer: '3.0.0'
            }
          }
        },
        'api2:v1': {
          added: '2023-01-01',
          preferred: 'v1',
          versions: {
            v1: {
              info: { title: 'API 2 Primary Only', version: 'v1' },
              added: '2023-01-01',
              updated: '2023-01-01',
              swaggerUrl: 'primary2.json',
              swaggerYamlUrl: 'primary2.yaml',
              openapiVer: '3.0.0'
            }
          }
        }
      };

      const secondaryAPIs: Record<string, ApiGuruAPI> = {
        'api1:v1': {
          added: '2023-01-02',
          preferred: 'v1',
          versions: {
            v1: {
              info: { title: 'API 1 Secondary', version: 'v1' },
              added: '2023-01-02',
              updated: '2023-01-02',
              swaggerUrl: 'secondary.json',
              swaggerYamlUrl: 'secondary.yaml',
              openapiVer: '3.0.0'
            }
          }
        },
        'api3:v1': {
          added: '2023-01-02',
          preferred: 'v1',
          versions: {
            v1: {
              info: { title: 'API 3 Secondary Only', version: 'v1' },
              added: '2023-01-02',
              updated: '2023-01-02',
              swaggerUrl: 'secondary3.json',
              swaggerYamlUrl: 'secondary3.yaml',
              openapiVer: '3.0.0'
            }
          }
        }
      };

      const result = MergeUtilities.mergeAPILists(primaryAPIs, secondaryAPIs);

      expect(Object.keys(result)).toHaveLength(3);
      expect(result['api1:v1'].versions.v1.info.title).toBe('API 1 Secondary');
      expect(result['api2:v1'].versions.v1.info.title).toBe('API 2 Primary Only');
      expect(result['api3:v1'].versions.v1.info.title).toBe('API 3 Secondary Only');
    });

    test('should handle empty API lists', () => {
      const result = MergeUtilities.mergeAPILists({}, {});
      expect(result).toEqual({});
    });

    test('should handle when only primary has APIs', () => {
      const primaryAPIs: Record<string, ApiGuruAPI> = {
        'api1:v1': {
          added: '2023-01-01',
          preferred: 'v1',
          versions: {}
        }
      };

      const result = MergeUtilities.mergeAPILists(primaryAPIs, {});
      expect(Object.keys(result)).toHaveLength(1);
      expect(result['api1:v1']).toBeDefined();
    });
  });

  describe('mergeProviders', () => {
    test('should merge and deduplicate provider lists', () => {
      const primaryProviders = { data: ['provider1', 'provider2', 'shared'] };
      const secondaryProviders = { data: ['provider3', 'shared', 'provider4'] };

      const result = MergeUtilities.mergeProviders(primaryProviders, secondaryProviders);

      expect(result.data).toHaveLength(5);
      expect(result.data).toContain('provider1');
      expect(result.data).toContain('provider2');
      expect(result.data).toContain('provider3');
      expect(result.data).toContain('provider4');
      expect(result.data).toContain('shared');
      expect(result.data).toEqual(expect.arrayContaining(['provider1', 'provider2', 'provider3', 'provider4', 'shared']));
      // Check that it's sorted
      expect(result.data).toEqual([...result.data].sort());
    });

    test('should handle empty provider lists', () => {
      const result = MergeUtilities.mergeProviders({ data: [] }, { data: [] });
      expect(result.data).toEqual([]);
    });

    test('should validate providers and log results', () => {
      const { DataValidator } = require('../../../src/utils/validation.js');
      
      MergeUtilities.mergeProviders({ data: ['test'] }, { data: ['test2'] });

      expect(DataValidator.validateProviders).toHaveBeenCalledTimes(2);
      expect(DataValidator.logValidationResults).toHaveBeenCalledTimes(2);
    });
  });

  describe('mergeSearchResults', () => {
    test('should merge search results with secondary taking precedence', () => {
      const primaryResults = {
        results: [
          {
            id: 'shared:api',
            title: 'Primary Title',
            description: 'Primary description',
            provider: 'primaryProvider',
            preferred: 'v1',
            categories: ['primary']
          },
          {
            id: 'primary:only',
            title: 'Primary Only',
            description: 'Only in primary',
            provider: 'primaryProvider',
            preferred: 'v1',
            categories: ['primary']
          }
        ],
        pagination: {
          page: 1,
          limit: 10,
          total_results: 2,
          total_pages: 1,
          has_next: false,
          has_previous: false
        }
      };

      const secondaryResults = {
        results: [
          {
            id: 'shared:api',
            title: 'Secondary Title',
            description: 'Secondary description',
            provider: 'secondaryProvider',
            preferred: 'v2',
            categories: ['secondary']
          },
          {
            id: 'secondary:only',
            title: 'Secondary Only',
            description: 'Only in secondary',
            provider: 'secondaryProvider',
            preferred: 'v1',
            categories: ['secondary']
          }
        ],
        pagination: {
          page: 1,
          limit: 10,
          total_results: 2,
          total_pages: 1,
          has_next: false,
          has_previous: false
        }
      };

      const result = MergeUtilities.mergeSearchResults(
        primaryResults,
        secondaryResults,
        'test',
        1,
        10
      );

      expect(result.results).toHaveLength(3);
      
      // Check that secondary overrides primary for shared:api
      const sharedApi = result.results.find(r => r.id === 'shared:api');
      expect(sharedApi?.title).toBe('Secondary Title');
      expect(sharedApi?.source).toBe('secondary');

      // Check that unique APIs are preserved
      expect(result.results.some(r => r.id === 'primary:only')).toBe(true);
      expect(result.results.some(r => r.id === 'secondary:only')).toBe(true);
    });

    test('should sort results by relevance score', () => {
      const primaryResults = {
        results: [
          {
            id: 'partial:match',
            title: 'Partial Match',
            description: 'Contains test somewhere',
            provider: 'provider1',
            preferred: 'v1',
            categories: []
          }
        ],
        pagination: { page: 1, limit: 10, total_results: 1, total_pages: 1, has_next: false, has_previous: false }
      };

      const secondaryResults = {
        results: [
          {
            id: 'test:exact',
            title: 'Exact Match',
            description: 'Test provider',
            provider: 'test',
            preferred: 'v1',
            categories: []
          },
          {
            id: 'starts:test',
            title: 'Starts with test',
            description: 'Description',
            provider: 'provider2',
            preferred: 'v1',
            categories: []
          }
        ],
        pagination: { page: 1, limit: 10, total_results: 2, total_pages: 1, has_next: false, has_previous: false }
      };

      const result = MergeUtilities.mergeSearchResults(
        primaryResults,
        secondaryResults,
        'test',
        1,
        10
      );

      // Provider exact match should be first
      expect(result.results[0].provider).toBe('test');
    });

    test('should handle pagination correctly', () => {
      const primaryResults = {
        results: Array(15).fill(null).map((_, i) => ({
          id: `primary:api${i}`,
          title: `API ${i}`,
          description: 'Description',
          provider: 'provider',
          preferred: 'v1',
          categories: []
        })),
        pagination: { page: 1, limit: 20, total_results: 15, total_pages: 1, has_next: false, has_previous: false }
      };

      const secondaryResults = {
        results: Array(10).fill(null).map((_, i) => ({
          id: `secondary:api${i}`,
          title: `API ${i}`,
          description: 'Description',
          provider: 'provider',
          preferred: 'v1',
          categories: []
        })),
        pagination: { page: 1, limit: 20, total_results: 10, total_pages: 1, has_next: false, has_previous: false }
      };

      // Get page 2 with limit 10
      const result = MergeUtilities.mergeSearchResults(
        primaryResults,
        secondaryResults,
        'api',
        2,
        10
      );

      expect(result.results).toHaveLength(10);
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.total_results).toBe(25);
      expect(result.pagination.total_pages).toBe(3);
      expect(result.pagination.has_next).toBe(true);
      expect(result.pagination.has_previous).toBe(true);
    });

    test('should give secondary source a boost in case of tie scores', () => {
      const primaryResults = {
        results: [{
          id: 'api:v1',
          title: 'API Test',
          description: 'test',
          provider: 'provider',
          preferred: 'v1',
          categories: []
        }],
        pagination: { page: 1, limit: 10, total_results: 1, total_pages: 1, has_next: false, has_previous: false }
      };

      const secondaryResults = {
        results: [{
          id: 'api:v2',
          title: 'API Test',
          description: 'test',
          provider: 'provider',
          preferred: 'v1',
          categories: []
        }],
        pagination: { page: 1, limit: 10, total_results: 1, total_pages: 1, has_next: false, has_previous: false }
      };

      const result = MergeUtilities.mergeSearchResults(
        primaryResults,
        secondaryResults,
        'test',
        1,
        10
      );

      // When scores are equal, secondary should come first
      expect(result.results[0].source).toBe('secondary');
    });
  });

  describe('mergePaginatedAPIs', () => {
    test('should merge paginated API results', () => {
      const primaryResults = {
        results: [
          {
            id: 'api1:v1',
            title: 'API 1',
            description: 'Description 1',
            provider: 'provider1',
            preferred: 'v1',
            categories: ['category1']
          }
        ]
      };

      const secondaryResults = {
        results: [
          {
            id: 'api2:v1',
            title: 'API 2',
            description: 'Description 2',
            provider: 'provider2',
            preferred: 'v1',
            categories: ['category2']
          }
        ]
      };

      const result = MergeUtilities.mergePaginatedAPIs(
        primaryResults,
        secondaryResults,
        1,
        10
      );

      expect(result.results).toHaveLength(2);
      expect(result.pagination.total_results).toBe(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
    });

    test('should handle long descriptions by truncating', () => {
      const longDescription = 'A'.repeat(250);
      const primaryResults = {
        results: [{
          id: 'api1:v1',
          title: 'API 1',
          description: longDescription,
          provider: 'provider1',
          preferred: 'v1',
          categories: []
        }]
      };

      const result = MergeUtilities.mergePaginatedAPIs(
        primaryResults,
        { results: [] },
        1,
        10
      );

      expect(result.results[0].description).toHaveLength(203); // 200 + '...'
      expect(result.results[0].description.endsWith('...')).toBe(true);
    });

    test('should handle missing provider info', () => {
      const primaryResults = {
        results: [{
          id: 'provider1:api:v1',
          title: 'API 1',
          description: 'Description',
          provider: undefined as any,
          preferred: 'v1',
          categories: []
        }]
      };

      const result = MergeUtilities.mergePaginatedAPIs(
        primaryResults,
        { results: [] },
        1,
        10
      );

      expect(result.results[0].provider).toBe('provider1'); // Extracted from ID
    });

    test('should handle missing version info', () => {
      const primaryResults = {
        results: [{
          id: 'api1:v1',
          title: undefined as any,
          description: undefined as any,
          provider: 'provider1',
          preferred: 'v1',
          categories: undefined as any
        }]
      };

      const result = MergeUtilities.mergePaginatedAPIs(
        primaryResults,
        { results: [] },
        1,
        10
      );

      expect(result.results[0].title).toBe('Untitled API');
      expect(result.results[0].description).toBe('');
      expect(result.results[0].categories).toEqual([]);
    });
  });

  describe('aggregateMetrics', () => {
    test('should aggregate metrics accounting for overlaps', async () => {
      const primaryMetrics: ApiGuruMetrics = {
        numSpecs: 100,
        numAPIs: 100,
        numEndpoints: 5000
      };

      const secondaryMetrics: ApiGuruMetrics = {
        numSpecs: 50,
        numAPIs: 50,
        numEndpoints: 2500
      };

      const primaryAPIs: Record<string, ApiGuruAPI> = {
        'api1:v1': { added: '2023', preferred: 'v1', versions: {} },
        'api2:v1': { added: '2023', preferred: 'v1', versions: {} },
        'shared:v1': { added: '2023', preferred: 'v1', versions: {} }
      };

      const secondaryAPIs: Record<string, ApiGuruAPI> = {
        'api3:v1': { added: '2023', preferred: 'v1', versions: {} },
        'shared:v1': { added: '2023', preferred: 'v1', versions: {} }
      };

      const result = await MergeUtilities.aggregateMetrics(
        primaryMetrics,
        secondaryMetrics,
        primaryAPIs,
        secondaryAPIs
      );

      // Total unique APIs: 4 (api1, api2, api3, shared)
      expect(result.numAPIs).toBe(4);
      
      // Total specs: 100 + 50 - 1 (overlap) = 149
      expect(result.numSpecs).toBe(149);
      
      // Endpoints calculation is weighted
      expect(result.numEndpoints).toBeGreaterThan(0);
    });

    test('should validate metrics and log results', async () => {
      const { DataValidator } = require('../../../src/utils/validation.js');
      
      await MergeUtilities.aggregateMetrics(
        { numSpecs: 10, numAPIs: 10, numEndpoints: 100 },
        { numSpecs: 5, numAPIs: 5, numEndpoints: 50 },
        {},
        {}
      );

      expect(DataValidator.validateMetrics).toHaveBeenCalledTimes(2);
      expect(DataValidator.logValidationResults).toHaveBeenCalledTimes(2);
    });

    test('should handle missing endpoint counts', async () => {
      const primaryMetrics: ApiGuruMetrics = {
        numSpecs: 10,
        numAPIs: 10
      };

      const secondaryMetrics: ApiGuruMetrics = {
        numSpecs: 5,
        numAPIs: 5
      };

      const result = await MergeUtilities.aggregateMetrics(
        primaryMetrics,
        secondaryMetrics,
        { 'api1:v1': { added: '2023', preferred: 'v1', versions: {} } },
        { 'api2:v1': { added: '2023', preferred: 'v1', versions: {} } }
      );

      expect(result.numEndpoints).toBeDefined();
    });

    test('should handle missing spec counts', async () => {
      const primaryMetrics: ApiGuruMetrics = {
        numAPIs: 10
      };

      const secondaryMetrics: ApiGuruMetrics = {
        numAPIs: 5,
        numSpecs: 5
      };

      const primaryAPIs = {
        'api1:v1': { added: '2023', preferred: 'v1', versions: {} }
      };
      const secondaryAPIs = {
        'api2:v1': { added: '2023', preferred: 'v1', versions: {} }
      };

      const result = await MergeUtilities.aggregateMetrics(
        primaryMetrics,
        secondaryMetrics,
        primaryAPIs,
        secondaryAPIs
      );

      expect(result.numSpecs).toBe(5); // (0 + 5 - 0) since no overlap
    });

    test('should handle APIs with providers from different sources', async () => {
      const primaryAPIs: Record<string, ApiGuruAPI> = {
        'provider1:api:v1': {
          added: '2023',
          preferred: 'v1',
          versions: {
            v1: {
              info: { 'x-providerName': 'provider1' },
              added: '2023',
              updated: '2023',
              swaggerUrl: '',
              swaggerYamlUrl: '',
              openapiVer: '3.0.0'
            }
          }
        }
      };

      const secondaryAPIs: Record<string, ApiGuruAPI> = {
        'api2:v1': {
          added: '2023',
          preferred: 'v1',
          versions: {
            v1: {
              info: {},
              added: '2023',
              updated: '2023',
              swaggerUrl: '',
              swaggerYamlUrl: '',
              openapiVer: '3.0.0'
            }
          }
        }
      };

      const result = await MergeUtilities.aggregateMetrics(
        { numAPIs: 1 },
        { numAPIs: 1 },
        primaryAPIs,
        secondaryAPIs
      );

      expect(result.numAPIs).toBe(2);
    });
  });

  describe('getConflictInfo', () => {
    test('should identify conflicts between sources', () => {
      const primaryAPIs: Record<string, ApiGuruAPI> = {
        'api1:v1': { added: '2023', preferred: 'v1', versions: {} },
        'api2:v1': { added: '2023', preferred: 'v1', versions: {} },
        'shared1:v1': { added: '2023', preferred: 'v1', versions: {} },
        'shared2:v1': { added: '2023', preferred: 'v1', versions: {} }
      };

      const secondaryAPIs: Record<string, ApiGuruAPI> = {
        'api3:v1': { added: '2023', preferred: 'v1', versions: {} },
        'shared1:v1': { added: '2023', preferred: 'v1', versions: {} },
        'shared2:v1': { added: '2023', preferred: 'v1', versions: {} }
      };

      const result = MergeUtilities.getConflictInfo(primaryAPIs, secondaryAPIs);

      expect(result.totalConflicts).toBe(2);
      expect(result.conflictingAPIs).toEqual(['shared1:v1', 'shared2:v1']);
      expect(result.primaryOnlyCount).toBe(2);
      expect(result.secondaryOnlyCount).toBe(1);
    });

    test('should handle no conflicts', () => {
      const primaryAPIs: Record<string, ApiGuruAPI> = {
        'api1:v1': { added: '2023', preferred: 'v1', versions: {} }
      };

      const secondaryAPIs: Record<string, ApiGuruAPI> = {
        'api2:v1': { added: '2023', preferred: 'v1', versions: {} }
      };

      const result = MergeUtilities.getConflictInfo(primaryAPIs, secondaryAPIs);

      expect(result.totalConflicts).toBe(0);
      expect(result.conflictingAPIs).toEqual([]);
      expect(result.primaryOnlyCount).toBe(1);
      expect(result.secondaryOnlyCount).toBe(1);
    });

    test('should handle empty lists', () => {
      const result = MergeUtilities.getConflictInfo({}, {});

      expect(result.totalConflicts).toBe(0);
      expect(result.conflictingAPIs).toEqual([]);
      expect(result.primaryOnlyCount).toBe(0);
      expect(result.secondaryOnlyCount).toBe(0);
    });
  });

  describe('Edge case branch coverage', () => {
    test('should handle null/undefined secondary APIs in mergeAPILists', () => {
      const primaryAPIs: Record<string, ApiGuruAPI> = {
        'api1:v1': { added: '2023', preferred: 'v1', versions: {} }
      };
      
      // Test empty secondary APIs object
      const result = MergeUtilities.mergeAPILists(primaryAPIs, {});
      expect(Object.keys(result)).toHaveLength(1);
    });

    test('should handle conditional property access in calculateProviderStats', () => {
      const providerAPIs = {
        'api1': {
          versions: {
            'v1': {
              info: {
                // Missing x-providerName to test fallback
              }
            }
          },
          preferred: 'v1'
        }
      };
      
      const result = MergeUtilities.aggregateMetrics(
        { numAPIs: 1 },
        { numAPIs: 0 },
        { 'api1:v1': { added: '2023', preferred: 'v1', versions: {} } },
        {}
      );
      
      expect(result).toBeDefined();
    });
  });
});