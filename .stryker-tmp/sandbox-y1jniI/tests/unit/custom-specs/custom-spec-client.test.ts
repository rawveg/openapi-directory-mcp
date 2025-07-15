// @ts-nocheck
import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { CustomSpecClient } from '../../../src/custom-specs/custom-spec-client.js';
import { ManifestManager } from '../../../src/custom-specs/manifest-manager.js';
import { ICacheManager } from '../../../src/cache/types.js';
import { CustomSpecEntry } from '../../../src/custom-specs/types.js';
import { ApiGuruAPI } from '../../../src/types/api.js';
import * as fs from 'fs';

// Mock dependencies
jest.mock('../../../src/custom-specs/manifest-manager.js');
jest.mock('fs');

// Mock validation module
jest.mock('../../../src/utils/validation.js', () => ({
  PathValidator: {
    validatePath: jest.fn(),
    sanitizePath: jest.fn((path: string) => path)
  }
}));

const MockedManifestManager = ManifestManager as jest.MockedClass<typeof ManifestManager>;
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('CustomSpecClient', () => {
  let customSpecClient: CustomSpecClient;
  let mockCacheManager: jest.Mocked<ICacheManager>;
  let mockManifestManager: jest.Mocked<ManifestManager>;

  const mockCustomSpec: ApiGuruAPI = {
    added: '2023-01-01T00:00:00.000Z',
    info: {
      title: 'Custom API',
      version: '1.0.0',
      description: 'A custom API specification',
      contact: {
        email: 'test@example.com'
      }
    },
    preferred: true,
    swaggerUrl: 'file:///custom/api/1.0.0.json',
    swaggerYamlUrl: 'file:///custom/api/1.0.0.yaml',
    openapiVer: '3.0.2',
    link: 'file:///custom/api',
    externalDocs: {
      url: 'https://example.com/docs'
    }
  };

  const mockSpecEntry: CustomSpecEntry = {
    id: 'custom:test-api:1.0.0',
    name: 'test-api',
    version: '1.0.0',
    title: 'Custom API',
    description: 'A custom API specification',
    originalFormat: 'json',
    sourceType: 'file',
    sourcePath: '/path/to/api.json',
    imported: '2023-01-01T00:00:00.000Z',
    lastModified: '2023-01-01T00:00:00.000Z',
    fileSize: 2048
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock cache manager
    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
      has: jest.fn(),
      keys: jest.fn(),
      getStats: jest.fn(),
      getTtl: jest.fn(),
      warmCache: jest.fn(),
      invalidatePattern: jest.fn(),
      invalidateKeys: jest.fn()
    };

    // Mock manifest manager
    mockManifestManager = {
      addSpec: jest.fn(),
      removeSpec: jest.fn(),
      getSpec: jest.fn(),
      listSpecs: jest.fn().mockReturnValue([]),
      updateSpec: jest.fn(),
      getPaths: jest.fn(),
      validateSpec: jest.fn(),
      parseSpecId: jest.fn((id: string) => {
        const match = id.match(/^custom:([^:]+):(.+)$/);
        if (match) {
          return { name: match[1], version: match[2] };
        }
        return null;
      }),
      readSpecFile: jest.fn().mockReturnValue('{}'),
      generateSpecId: jest.fn((name: string, version: string) => `custom:${name}:${version}`),
      hasSpec: jest.fn().mockReturnValue(false),
      hasNameVersion: jest.fn().mockReturnValue(false),
      storeSpecFile: jest.fn(),
      deleteSpecFile: jest.fn().mockReturnValue(true),
      getStats: jest.fn().mockReturnValue({ totalSpecs: 0, byFormat: {}, bySource: {} }),
      validateIntegrity: jest.fn().mockReturnValue({ valid: true, issues: [] }),
      repairIntegrity: jest.fn().mockReturnValue({ repaired: 0, issues: [] })
    } as any;

    MockedManifestManager.mockImplementation(() => mockManifestManager);

    customSpecClient = new CustomSpecClient(mockCacheManager);
  });

  describe('getProviders', () => {
    test('should return custom provider when specs exist', async () => {
      mockCacheManager.get.mockReturnValue(undefined);
      mockManifestManager.listSpecs.mockReturnValue([mockSpecEntry]);

      const result = await customSpecClient.getProviders();

      expect(result).toEqual({ data: ['custom'] });
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'custom:providers',
        { data: ['custom'] },
        undefined
      );
    });

    test('should return empty array when no specs exist', async () => {
      mockCacheManager.get.mockReturnValue(undefined);
      mockManifestManager.listSpecs.mockReturnValue([]);

      const result = await customSpecClient.getProviders();

      expect(result).toEqual({ data: [] });
    });

    test('should return cached result when available', async () => {
      const cachedResult = { data: ['custom'] };
      mockCacheManager.get.mockReturnValue(cachedResult);

      const result = await customSpecClient.getProviders();

      expect(result).toEqual(cachedResult);
      expect(mockManifestManager.listSpecs).not.toHaveBeenCalled();
      expect(mockCacheManager.set).not.toHaveBeenCalled();
    });
  });

  describe('getProvider', () => {
    test('should return custom APIs for custom provider', async () => {
      mockCacheManager.get.mockReturnValue(undefined);
      mockManifestManager.listSpecs.mockReturnValue([mockSpecEntry]);
      mockManifestManager.readSpecFile.mockReturnValue(JSON.stringify(mockCustomSpec));

      const result = await customSpecClient.getProvider('custom');

      expect(result.data).toHaveProperty('custom:test-api');
      expect(result.data['custom:test-api']).toEqual(
        expect.objectContaining({
          '1.0.0': mockCustomSpec
        })
      );
    });

    test('should return empty data for non-custom provider', async () => {
      const result = await customSpecClient.getProvider('other-provider');

      expect(result).toEqual({ data: {} });
      expect(mockManifestManager.listSpecs).not.toHaveBeenCalled();
    });

    test('should handle missing spec files gracefully', async () => {
      mockCacheManager.get.mockReturnValue(undefined);
      mockManifestManager.listSpecs.mockReturnValue([mockSpecEntry]);
      mockManifestManager.readSpecFile.mockImplementation(() => {
        throw new Error('Spec file not found');
      });

      const result = await customSpecClient.getProvider('custom');

      expect(result.data).toEqual({});
    });

    test('should handle invalid JSON in spec files', async () => {
      mockCacheManager.get.mockReturnValue(undefined);
      mockManifestManager.listSpecs.mockReturnValue([mockSpecEntry]);
      mockManifestManager.readSpecFile.mockReturnValue('invalid json');

      const result = await customSpecClient.getProvider('custom');

      expect(result.data).toEqual({});
    });

    test('should return cached result when available', async () => {
      const cachedResult = { data: { 'custom:api': { '1.0.0': mockCustomSpec } } };
      mockCacheManager.get.mockReturnValue(cachedResult);

      const result = await customSpecClient.getProvider('custom');

      expect(result).toEqual(cachedResult);
      expect(mockManifestManager.listSpecs).not.toHaveBeenCalled();
    });
  });

  describe('getAPI', () => {
    test('should return specific API by ID', async () => {
      mockCacheManager.get.mockReturnValue(undefined);
      mockManifestManager.listSpecs.mockReturnValue([mockSpecEntry]);
      mockManifestManager.readSpecFile.mockReturnValue(JSON.stringify(mockCustomSpec));

      const result = await customSpecClient.getAPI('custom:test-api');

      expect(result).toEqual(mockCustomSpec);
    });

    test('should handle API ID with version', async () => {
      mockCacheManager.get.mockReturnValue(undefined);
      mockManifestManager.getSpec.mockReturnValue(mockSpecEntry);
      mockManifestManager.readSpecFile.mockReturnValue(JSON.stringify(mockCustomSpec));

      const result = await customSpecClient.getAPI('custom:test-api:1.0.0');

      expect(result).toEqual(mockCustomSpec);
      expect(mockManifestManager.getSpec).toHaveBeenCalledWith('custom:test-api:1.0.0');
    });

    test('should throw error for non-existent API', async () => {
      mockCacheManager.get.mockReturnValue(undefined);
      mockManifestManager.getSpec.mockReturnValue(undefined);

      await expect(customSpecClient.getAPI('custom:nonexistent'))
        .rejects.toThrow('API not found: custom:nonexistent');
    });

    test('should throw error for missing spec file', async () => {
      mockCacheManager.get.mockReturnValue(undefined);
      mockManifestManager.listSpecs.mockReturnValue([mockSpecEntry]);
      mockManifestManager.readSpecFile.mockImplementation(() => {
        throw new Error('Spec file not found');
      });

      await expect(customSpecClient.getAPI('custom:test-api'))
        .rejects.toThrow('Spec file not found');
    });

    test('should throw error for invalid JSON in spec file', async () => {
      mockCacheManager.get.mockReturnValue(undefined);
      mockManifestManager.listSpecs.mockReturnValue([mockSpecEntry]);
      mockManifestManager.readSpecFile.mockReturnValue('invalid json');

      await expect(customSpecClient.getAPI('custom:test-api'))
        .rejects.toThrow('Invalid JSON in spec file');
    });

    test('should return cached result when available', async () => {
      mockCacheManager.get.mockReturnValue(mockCustomSpec);

      const result = await customSpecClient.getAPI('custom:test-api');

      expect(result).toEqual(mockCustomSpec);
      expect(mockManifestManager.getSpec).not.toHaveBeenCalled();
    });
  });

  describe('listAPIs', () => {
    test('should return paginated list of APIs', async () => {
      mockCacheManager.get.mockReturnValue(undefined);
      mockManifestManager.listSpecs.mockReturnValue([
        mockSpecEntry,
        {
          ...mockSpecEntry,
          id: 'custom:api2:1.0.0',
          name: 'api2',
          title: 'API 2'
        }
      ]);

      const result = await customSpecClient.listAPIs(1, 10);

      expect(result.data).toHaveLength(2);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1
      });
      expect(result.data[0]).toEqual(
        expect.objectContaining({
          id: 'custom:test-api:1.0.0',
          title: 'Custom API',
          description: 'A custom API specification'
        })
      );
    });

    test('should handle pagination correctly', async () => {
      const specs = Array.from({ length: 25 }, (_, i) => ({
        ...mockSpecEntry,
        id: `custom:api${i}:1.0.0`,
        name: `api${i}`,
        title: `API ${i}`
      }));

      mockCacheManager.get.mockReturnValue(undefined);
      mockManifestManager.listSpecs.mockReturnValue(specs);

      const result = await customSpecClient.listAPIs(2, 10);

      expect(result.data).toHaveLength(10);
      expect(result.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 25,
        totalPages: 3
      });
      expect(result.data[0].id).toBe('custom:api10:1.0.0');
    });

    test('should return empty list when no specs exist', async () => {
      mockCacheManager.get.mockReturnValue(undefined);
      mockManifestManager.listSpecs.mockReturnValue([]);

      const result = await customSpecClient.listAPIs(1, 20);

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    test('should return cached result when available', async () => {
      const cachedResult = {
        data: [{ id: 'custom:cached:1.0.0', title: 'Cached API' }],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 }
      };
      mockCacheManager.get.mockReturnValue(cachedResult);

      const result = await customSpecClient.listAPIs();

      expect(result).toEqual(cachedResult);
      expect(mockManifestManager.listSpecs).not.toHaveBeenCalled();
    });
  });

  describe('searchAPIs', () => {
    test('should search APIs by query', async () => {
      mockCacheManager.get.mockReturnValue(undefined);
      mockManifestManager.listSpecs.mockReturnValue([
        mockSpecEntry,
        {
          ...mockSpecEntry,
          id: 'custom:other:1.0.0',
          name: 'other',
          title: 'Other API',
          description: 'Different API'
        }
      ]);

      const result = await customSpecClient.searchAPIs('Custom API', 1, 10);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].title).toBe('Custom API');
      expect(result.pagination.total).toBe(1);
    });

    test('should search in name, title, and description', async () => {
      mockCacheManager.get.mockReturnValue(undefined);
      mockManifestManager.listSpecs.mockReturnValue([
        mockSpecEntry,
        {
          ...mockSpecEntry,
          id: 'custom:search-test:1.0.0',
          name: 'search-test',
          title: 'Test API',
          description: 'API for searching functionality'
        }
      ]);

      // Search by name
      let result = await customSpecClient.searchAPIs('test-api', 1, 10);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('test-api');

      // Search by title
      result = await customSpecClient.searchAPIs('Test API', 1, 10);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].title).toBe('Test API');

      // Search by description
      result = await customSpecClient.searchAPIs('searching', 1, 10);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].description).toContain('searching');
    });

    test('should perform case-insensitive search', async () => {
      mockCacheManager.get.mockReturnValue(undefined);
      mockManifestManager.listSpecs.mockReturnValue([mockSpecEntry]);

      const result = await customSpecClient.searchAPIs('CUSTOM api', 1, 10);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].title).toBe('Custom API');
    });

    test('should return empty results for no matches', async () => {
      mockCacheManager.get.mockReturnValue(undefined);
      mockManifestManager.listSpecs.mockReturnValue([mockSpecEntry]);

      const result = await customSpecClient.searchAPIs('nonexistent', 1, 10);

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    test('should return cached result when available', async () => {
      const cachedResult = {
        data: [{ id: 'custom:cached:1.0.0', title: 'Cached Search Result' }],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 }
      };
      mockCacheManager.get.mockReturnValue(cachedResult);

      const result = await customSpecClient.searchAPIs('cached', 1, 10);

      expect(result).toEqual(cachedResult);
      expect(mockManifestManager.listSpecs).not.toHaveBeenCalled();
    });
  });

  describe('getMetrics', () => {
    test('should return metrics for custom specs', async () => {
      mockCacheManager.get.mockReturnValue(undefined);
      mockManifestManager.listSpecs.mockReturnValue([
        mockSpecEntry,
        {
          ...mockSpecEntry,
          id: 'custom:api2:1.0.0',
          name: 'api2'
        }
      ]);
      mockManifestManager.getStats.mockReturnValue({ 
        totalSpecs: 2, 
        byFormat: { json: 2, yaml: 0 }, 
        bySource: { file: 2, url: 0 } 
      });

      const result = await customSpecClient.getMetrics();

      expect(result).toEqual(
        expect.objectContaining({
          numSpecs: 2,
          numAPIs: 2,
          numEndpoints: 0,
          unreachable: 0,
          invalid: 0,
          unofficial: 2,
          fixes: 0,
          fixedPct: 0,
          datasets: expect.any(Array),
          stars: 0,
          starsPercentile: 0,
          numProviders: 1
        })
      );
    });

    test('should return zero metrics when no specs exist', async () => {
      mockCacheManager.get.mockReturnValue(undefined);
      mockManifestManager.listSpecs.mockReturnValue([]);

      const result = await customSpecClient.getMetrics();

      expect(result.numSpecs).toBe(0);
      expect(result.numAPIs).toBe(0);
      expect(result.numProviders).toBe(0);
    });

    test('should return cached metrics when available', async () => {
      const cachedMetrics = {
        numSpecs: 5,
        numAPIs: 5,
        numProviders: 1
      };
      mockCacheManager.get.mockReturnValue(cachedMetrics);

      const result = await customSpecClient.getMetrics();

      expect(result).toEqual(cachedMetrics);
      expect(mockManifestManager.listSpecs).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    test('should handle manifest manager errors gracefully', async () => {
      mockManifestManager.listSpecs.mockImplementation(() => {
        throw new Error('Manifest error');
      });

      await expect(customSpecClient.getProviders())
        .rejects.toThrow('Manifest error');
    });

    test('should handle file system errors', async () => {
      mockCacheManager.get.mockReturnValue(undefined);
      mockManifestManager.listSpecs.mockReturnValue([mockSpecEntry]);
      mockManifestManager.readSpecFile.mockImplementation(() => {
        throw new Error('File read error');
      });

      await expect(customSpecClient.getAPI('custom:test-api'))
        .rejects.toThrow('File read error');
    });

    test('should handle cache errors gracefully', async () => {
      mockCacheManager.get.mockImplementation(() => {
        throw new Error('Cache error');
      });
      mockManifestManager.listSpecs.mockReturnValue([]);

      // Should still work without cache
      const result = await customSpecClient.getProviders();
      expect(result).toEqual({ data: [] });
    });
  });
});