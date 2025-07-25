import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { CustomSpecClient } from '../../../src/custom-specs/custom-spec-client.js';
import { ManifestManager } from '../../../src/custom-specs/manifest-manager.js';
import { CacheManager } from '../../../src/cache/manager.js';

// Mock dependencies
jest.mock('../../../src/custom-specs/manifest-manager.js');
jest.mock('../../../src/cache/manager.js');

describe('CustomSpecClient - Additional Branch Coverage', () => {
  let client: CustomSpecClient;
  let mockManifestManager: jest.Mocked<ManifestManager>;
  let mockCacheManager: jest.Mocked<CacheManager>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockManifestManager = {
      hasSpec: jest.fn(),
      listSpecs: jest.fn(),
      parseSpecId: jest.fn(),
      getSpec: jest.fn(),
      readSpecFile: jest.fn(),
    } as any;

    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      has: jest.fn(),
      clear: jest.fn(),
      delete: jest.fn(),
    } as any;

    (ManifestManager as jest.MockedClass<typeof ManifestManager>).mockImplementation(() => mockManifestManager);
    (CacheManager as jest.MockedClass<typeof CacheManager>).mockImplementation(() => mockCacheManager);

    client = new CustomSpecClient();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('hasAPI method coverage', () => {
    test('should call manifestManager.hasSpec with correct parameters', async () => {
      mockManifestManager.hasSpec.mockReturnValue(true);

      await client.hasAPI('custom:test-api:1.0.0');

      expect(mockManifestManager.hasSpec).toHaveBeenCalledWith('custom:test-api:1.0.0');
    });

    test('should return boolean result from manifestManager', async () => {
      mockManifestManager.hasSpec.mockReturnValue(false);

      const result = await client.hasAPI('custom:nonexistent:1.0.0');

      expect(result).toBe(false);
    });
  });

  describe('hasProvider method branches', () => {
    test('should return false immediately for non-custom provider', async () => {
      const result = await client.hasProvider('github');

      expect(result).toBe(false);
      expect(mockManifestManager.listSpecs).not.toHaveBeenCalled();
    });

    test('should return true when custom provider has specs', async () => {
      mockManifestManager.listSpecs.mockReturnValue([
        { id: 'custom:api1:1.0.0', title: 'API 1', description: 'Test', name: 'api1' }
      ]);

      const result = await client.hasProvider('custom');

      expect(result).toBe(true);
      expect(mockManifestManager.listSpecs).toHaveBeenCalled();
    });

    test('should return false when custom provider has no specs', async () => {
      mockManifestManager.listSpecs.mockReturnValue([]);

      const result = await client.hasProvider('custom');

      expect(result).toBe(false);
    });
  });

  describe('searchAPIs method overloading branches', () => {
    beforeEach(() => {
      mockCacheManager.get.mockResolvedValue(null);
      mockCacheManager.set.mockResolvedValue();
    });

    test('should handle 2-parameter call (query, limitOrPage as page)', async () => {
      mockManifestManager.listSpecs.mockReturnValue([
        { id: 'custom:test:1.0.0', title: 'Test API', description: 'Test', name: 'test' }
      ]);
      mockManifestManager.parseSpecId.mockReturnValue({ name: 'test', version: '1.0.0' });

      // Call with 2 params where second param is page number
      const result = await client.searchAPIs('test', 2);

      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(20); // Default limit
    });

    test('should handle 3-parameter call with page and limit', async () => {
      mockManifestManager.listSpecs.mockReturnValue([
        { id: 'custom:test:1.0.0', title: 'Test API', description: 'Test', name: 'test' }
      ]);
      mockManifestManager.parseSpecId.mockReturnValue({ name: 'test', version: '1.0.0' });

      // Call with 3 params: query, page, limit
      const result = await client.searchAPIs('test', 3, 15);

      expect(result.pagination.page).toBe(3);
      expect(result.pagination.limit).toBe(15);
    });

    test('should handle 4-parameter call with provider filter', async () => {
      mockManifestManager.listSpecs.mockReturnValue([
        { id: 'custom:test:1.0.0', title: 'Test API', description: 'Test', name: 'test' }
      ]);
      mockManifestManager.parseSpecId.mockReturnValue({ name: 'test', version: '1.0.0' });

      // Call with 4 params: query, provider, page, limit
      const result = await client.searchAPIs('test', 'custom', 2, 25);

      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(25);
    });

    test('should return empty results when provider is not custom', async () => {
      // Test the early return branch for non-custom provider
      const result = await client.searchAPIs('test', 'github', 1, 10);

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
      expect(mockManifestManager.listSpecs).not.toHaveBeenCalled();
    });

    test('should search across all spec fields (id, title, description, name)', async () => {
      const specs = [
        { id: 'custom:payment-api:1.0.0', title: 'Payment API', description: 'Process payments', name: 'payment' },
        { id: 'custom:user-api:1.0.0', title: 'User API', description: 'User management payment gateway', name: 'users' },
        { id: 'custom:analytics:1.0.0', title: 'Analytics', description: 'Data analytics', name: 'payment-analytics' },
        { id: 'custom:other:1.0.0', title: 'Other API', description: 'Other functionality', name: 'other' }
      ];

      mockManifestManager.listSpecs.mockReturnValue(specs);
      mockManifestManager.parseSpecId.mockImplementation((id) => {
        const parts = id.split(':');
        return { name: parts[1], version: parts[2] };
      });

      const result = await client.searchAPIs('payment', 1, 10);

      // Should find:
      // - payment-api (id match)
      // - Payment API (title match) 
      // - user-api (description match)
      // - analytics (name match)
      expect(result.data.length).toBe(3); // All except 'other'
      expect(result.data.find(api => api.id === 'custom:payment-api:1.0.0')).toBeDefined();
      expect(result.data.find(api => api.id === 'custom:user-api:1.0.0')).toBeDefined();
      expect(result.data.find(api => api.id === 'custom:analytics:1.0.0')).toBeDefined();
    });

    test('should handle null result from parseSpecId in search', async () => {
      mockManifestManager.listSpecs.mockReturnValue([
        { id: 'invalid:format', title: 'Test', description: 'test query', name: 'test' }
      ]);
      mockManifestManager.parseSpecId.mockReturnValue(null);

      const result = await client.searchAPIs('test', 1, 10);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].preferred).toBe('1.0.0'); // Default fallback
    });
  });

  describe('getPaginatedAPIs description truncation branches', () => {
    beforeEach(() => {
      mockCacheManager.get.mockResolvedValue(null);
      mockCacheManager.set.mockResolvedValue();
    });

    test('should truncate long descriptions', async () => {
      const longDescription = 'A'.repeat(250);
      mockManifestManager.listSpecs.mockReturnValue([
        { 
          id: 'custom:api1:1.0.0', 
          title: 'API 1', 
          description: longDescription, 
          name: 'api1' 
        }
      ]);

      mockManifestManager.parseSpecId.mockReturnValue({ name: 'api1', version: '1.0.0' });

      const result = await client.getPaginatedAPIs(1, 10);

      expect(result.results[0].description).toHaveLength(203); // 200 + '...'
      expect(result.results[0].description.endsWith('...')).toBe(true);
    });

    test('should not truncate short descriptions', async () => {
      const shortDescription = 'Short description';
      mockManifestManager.listSpecs.mockReturnValue([
        { 
          id: 'custom:api1:1.0.0', 
          title: 'API 1', 
          description: shortDescription, 
          name: 'api1' 
        }
      ]);

      mockManifestManager.parseSpecId.mockReturnValue({ name: 'api1', version: '1.0.0' });

      const result = await client.getPaginatedAPIs(1, 10);

      expect(result.results[0].description).toBe(shortDescription);
      expect(result.results[0].description.endsWith('...')).toBe(false);
    });

    test('should handle parseSpecId returning null', async () => {
      mockManifestManager.listSpecs.mockReturnValue([
        { id: 'invalid:spec:format', title: 'Invalid', description: 'Test', name: 'invalid' }
      ]);

      mockManifestManager.parseSpecId.mockReturnValue(null);

      const result = await client.getPaginatedAPIs(1, 10);

      expect(result.results[0].preferred).toBe('1.0.0'); // Default fallback
    });
  });

  describe('Edge cases and boundary conditions', () => {
    test('should handle pagination beyond available results', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockCacheManager.set.mockResolvedValue();

      mockManifestManager.listSpecs.mockReturnValue([
        { id: 'custom:api1:1.0.0', title: 'API 1', description: 'Test', name: 'api1' }
      ]);

      const result = await client.getPaginatedAPIs(5, 10); // Page 5 with only 1 result

      expect(result.results).toEqual([]);
      expect(result.pagination.page).toBe(5);
      expect(result.pagination.has_next).toBe(false);
      expect(result.pagination.has_previous).toBe(true);
    });

    test('should handle empty spec list in pagination', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockCacheManager.set.mockResolvedValue();

      mockManifestManager.listSpecs.mockReturnValue([]);

      const result = await client.getPaginatedAPIs(1, 10);

      expect(result.results).toEqual([]);
      expect(result.pagination.total_results).toBe(0);
      expect(result.pagination.total_pages).toBe(0);
    });

    test('should calculate pagination correctly', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockCacheManager.set.mockResolvedValue();

      const specs = Array.from({ length: 25 }, (_, i) => ({
        id: `custom:api${i}:1.0.0`,
        title: `API ${i}`,
        description: `Description ${i}`,
        name: `api${i}`
      }));

      mockManifestManager.listSpecs.mockReturnValue(specs);
      mockManifestManager.parseSpecId.mockImplementation((id) => {
        const match = id.match(/api(\d+)/);
        return match ? { name: `api${match[1]}`, version: '1.0.0' } : null;
      });

      const result = await client.getPaginatedAPIs(2, 10);

      expect(result.results).toHaveLength(10);
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.total_pages).toBe(3);
      expect(result.pagination.has_next).toBe(true);
      expect(result.pagination.has_previous).toBe(true);
    });
  });

  describe('Cache error handling branches', () => {
    test('should handle cache get throwing synchronous error', async () => {
      mockCacheManager.get.mockImplementation(() => {
        throw new Error('Sync cache error');
      });

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      mockManifestManager.listSpecs.mockReturnValue([]);

      const result = await client.getPaginatedAPIs(1, 10);

      expect(result).toBeDefined();
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    test('should handle cache set throwing synchronous error', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockCacheManager.set.mockImplementation(() => {
        throw new Error('Sync cache set error');
      });

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      mockManifestManager.listSpecs.mockReturnValue([]);

      const result = await client.getPaginatedAPIs(1, 10);

      expect(result).toBeDefined();
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });
  });
});