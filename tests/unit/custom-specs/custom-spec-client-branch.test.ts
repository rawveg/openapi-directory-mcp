import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { CustomSpecClient } from '../../../src/custom-specs/custom-spec-client.js';
import { ICacheManager } from '../../../src/cache/types.js';
import { ManifestManager } from '../../../src/custom-specs/manifest-manager.js';

jest.mock('../../../src/custom-specs/manifest-manager.js');

describe('CustomSpecClient - Branch Coverage', () => {
  let customSpecClient: CustomSpecClient;
  let mockCacheManager: jest.Mocked<ICacheManager>;
  let mockManifestManager: jest.Mocked<ManifestManager>;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock cache manager
    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
      keys: jest.fn(),
      size: jest.fn(),
      has: jest.fn(),
      cleanExpired: jest.fn(),
      destroy: jest.fn(),
      isDestroyed: jest.fn().mockReturnValue(false),
      stats: jest.fn(),
      entries: jest.fn()
    };

    // Mock manifest manager
    mockManifestManager = {
      listSpecs: jest.fn().mockReturnValue([]),
      parseSpecId: jest.fn(),
      readSpecFile: jest.fn(),
      hasSpec: jest.fn(),
      writeSpec: jest.fn(),
      removeSpec: jest.fn(),
      updateTimestamp: jest.fn(),
      lockRead: jest.fn(),
      lockWrite: jest.fn(),
      unlock: jest.fn(),
      init: jest.fn(),
      getSpecDetails: jest.fn(),
      readManifest: jest.fn(),
      writeManifest: jest.fn(),
      getSpec: jest.fn(),
      getStats: jest.fn().mockReturnValue({
        totalSpecs: 0,
        totalSize: 0,
        byFormat: { yaml: 0, json: 0 },
        bySource: { file: 0, url: 0 },
        lastUpdated: new Date().toISOString()
      })
    } as any;

    (ManifestManager as jest.MockedClass<typeof ManifestManager>).mockImplementation(() => mockManifestManager);
    
    customSpecClient = new CustomSpecClient(mockCacheManager);
    
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe('fetchWithCache - branch coverage', () => {
    test('should handle cache get errors gracefully', async () => {
      const cacheError = new Error('Cache read error');
      mockCacheManager.get.mockImplementation(() => {
        throw cacheError;
      });

      const fetchFn = jest.fn().mockResolvedValue({ data: 'fresh' });
      
      const result = await (customSpecClient as any).fetchWithCache('test-key', fetchFn);
      
      expect(result).toEqual({ data: 'fresh' });
      expect(consoleWarnSpy).toHaveBeenCalledWith('Cache error for key test-key:', cacheError);
      expect(fetchFn).toHaveBeenCalled();
    });

    test('should handle cache set errors gracefully', async () => {
      mockCacheManager.get.mockReturnValue(null);
      const cacheError = new Error('Cache write error');
      mockCacheManager.set.mockImplementation(() => {
        throw cacheError;
      });

      const fetchFn = jest.fn().mockResolvedValue({ data: 'fresh' });
      
      const result = await (customSpecClient as any).fetchWithCache('test-key', fetchFn);
      
      expect(result).toEqual({ data: 'fresh' });
      expect(consoleWarnSpy).toHaveBeenCalledWith('Failed to cache result for key test-key:', cacheError);
    });

    test('should use ttl parameter when caching', async () => {
      mockCacheManager.get.mockReturnValue(null);
      const fetchFn = jest.fn().mockResolvedValue({ data: 'fresh' });
      const ttl = 60000;
      
      await (customSpecClient as any).fetchWithCache('test-key', fetchFn, ttl);
      
      expect(mockCacheManager.set).toHaveBeenCalledWith('custom:test-key', { data: 'fresh' }, ttl);
    });
  });

  describe('getProviders - branch coverage', () => {
    test('should return empty array when no specs exist', async () => {
      mockManifestManager.listSpecs.mockReturnValue([]);
      mockCacheManager.get.mockReturnValue(null);
      
      const result = await customSpecClient.getProviders();
      
      expect(result).toEqual({ data: [] });
    });

    test('should return ["custom"] when specs exist', async () => {
      mockManifestManager.listSpecs.mockReturnValue([
        { id: 'custom:test-api:1.0.0', name: 'test-api', version: '1.0.0', addedAt: new Date().toISOString() }
      ]);
      mockCacheManager.get.mockReturnValue(null);
      
      const result = await customSpecClient.getProviders();
      
      expect(result).toEqual({ data: ['custom'] });
    });

    test('should return cached value when available', async () => {
      const cachedData = { data: ['custom'] };
      mockCacheManager.get.mockReturnValue(cachedData);
      
      const result = await customSpecClient.getProviders();
      
      expect(result).toEqual(cachedData);
      expect(mockManifestManager.listSpecs).not.toHaveBeenCalled();
    });
  });

  describe('getProvider - branch coverage', () => {
    test('should return empty object for non-custom provider', async () => {
      const result = await customSpecClient.getProvider('github');
      
      expect(result).toEqual({ data: {} });
      expect(mockManifestManager.listSpecs).not.toHaveBeenCalled();
    });

    test('should handle spec parsing errors', async () => {
      mockManifestManager.listSpecs.mockReturnValue([
        { id: 'invalid-spec-id', name: 'invalid', version: '1.0.0', addedAt: new Date().toISOString() }
      ]);
      mockManifestManager.parseSpecId.mockReturnValue(null);
      mockCacheManager.get.mockReturnValue(null);
      
      const result = await customSpecClient.getProvider('custom');
      
      expect(result).toEqual({ data: {} });
    });

    test('should handle spec reading errors', async () => {
      const specEntry = { 
        id: 'custom:test-api:1.0.0', 
        name: 'test-api', 
        version: '1.0.0', 
        addedAt: new Date().toISOString() 
      };
      
      mockManifestManager.listSpecs.mockReturnValue([specEntry]);
      mockManifestManager.parseSpecId.mockReturnValue({ name: 'test-api', version: '1.0.0' });
      mockManifestManager.readSpecFile.mockImplementation(() => {
        throw new Error('File read error');
      });
      mockCacheManager.get.mockReturnValue(null);
      
      const result = await customSpecClient.getProvider('custom');
      
      expect(result).toEqual({ data: {} });
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to load spec custom:test-api:1.0.0: Error: File read error'
      );
    });

    test('should handle JSON parsing errors', async () => {
      const specEntry = { 
        id: 'custom:test-api:1.0.0', 
        name: 'test-api', 
        version: '1.0.0', 
        addedAt: new Date().toISOString() 
      };
      
      mockManifestManager.listSpecs.mockReturnValue([specEntry]);
      mockManifestManager.parseSpecId.mockReturnValue({ name: 'test-api', version: '1.0.0' });
      mockManifestManager.readSpecFile.mockReturnValue('invalid json');
      mockCacheManager.get.mockReturnValue(null);
      
      const result = await customSpecClient.getProvider('custom');
      
      expect(result).toEqual({ data: {} });
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    test('should successfully load and structure specs', async () => {
      const specEntry = { 
        id: 'custom:test-api:1.0.0', 
        name: 'test-api', 
        version: '1.0.0', 
        addedAt: new Date().toISOString() 
      };
      
      const specContent = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' }
      };
      
      mockManifestManager.listSpecs.mockReturnValue([specEntry]);
      mockManifestManager.parseSpecId.mockReturnValue({ name: 'test-api', version: '1.0.0' });
      mockManifestManager.readSpecFile.mockReturnValue(JSON.stringify(specContent));
      mockCacheManager.get.mockReturnValue(null);
      
      const result = await customSpecClient.getProvider('custom');
      
      expect(result).toEqual({
        data: {
          'custom:test-api': {
            '1.0.0': specContent
          }
        }
      });
    });
  });

  describe('getServices - branch coverage', () => {
    test('should throw error for non-custom provider', async () => {
      await expect(customSpecClient.getServices('github'))
        .rejects.toThrow('Provider github not found in custom specs');
    });

    test('should return sorted service names', async () => {
      const specs = [
        { id: 'custom:analytics-api:1.0.0', name: 'analytics-api', version: '1.0.0', addedAt: new Date().toISOString() },
        { id: 'custom:auth-api:1.0.0', name: 'auth-api', version: '1.0.0', addedAt: new Date().toISOString() },
        { id: 'custom:billing-api:1.0.0', name: 'billing-api', version: '1.0.0', addedAt: new Date().toISOString() }
      ];
      
      mockManifestManager.listSpecs.mockReturnValue(specs);
      mockManifestManager.parseSpecId.mockImplementation((id) => {
        const parts = id.split(':');
        return { name: parts[1], version: parts[2] };
      });
      mockCacheManager.get.mockReturnValue(null);
      
      const result = await customSpecClient.getServices('custom');
      
      expect(result).toEqual({
        data: ['analytics-api', 'auth-api', 'billing-api']
      });
    });

    test('should handle empty spec list', async () => {
      mockManifestManager.listSpecs.mockReturnValue([]);
      mockCacheManager.get.mockReturnValue(null);
      
      const result = await customSpecClient.getServices('custom');
      
      expect(result).toEqual({ data: [] });
    });
  });

  describe('getServiceAPI - branch coverage', () => {
    test('should throw error for non-custom provider', async () => {
      mockCacheManager.get.mockReturnValue(null);
      
      await expect(customSpecClient.getServiceAPI('github', 'service', 'v1'))
        .rejects.toThrow('Provider github not found in custom specs');
    });

    test('should delegate to getAPI with correct parameters', async () => {
      // Mock getAPI
      const getAPISpy = jest.spyOn(customSpecClient, 'getAPI').mockResolvedValue({ data: 'test' } as any);
      
      await customSpecClient.getServiceAPI('custom', 'test-api', '1.0.0');
      
      expect(getAPISpy).toHaveBeenCalledWith('custom', 'test-api');
    });
  });

  describe('getAPI - branch coverage', () => {
    test('should handle single parameter ID format', async () => {
      const specContent = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' }
      };
      
      mockManifestManager.getSpec.mockReturnValue({
        id: 'custom:test-api:1.0.0',
        name: 'test-api',
        version: '1.0.0'
      });
      mockManifestManager.parseSpecId.mockReturnValue({ name: 'test-api', version: '1.0.0' });
      mockManifestManager.readSpecFile.mockReturnValue(JSON.stringify(specContent));
      mockCacheManager.get.mockReturnValue(null);
      
      const result = await customSpecClient.getAPI('custom:test-api:1.0.0');
      
      expect(result).toEqual(specContent);
    });

    test('should throw error for invalid single parameter ID', async () => {
      mockCacheManager.get.mockReturnValue(null);
      
      await expect(customSpecClient.getAPI('invalid-id'))
        .rejects.toThrow('Invalid API ID: invalid-id');
    });

    test('should throw error when ID has less than 2 parts', async () => {
      mockCacheManager.get.mockReturnValue(null);
      
      await expect(customSpecClient.getAPI('custom'))
        .rejects.toThrow('Invalid API ID: custom');
    });

    test('should handle two parameter format', async () => {
      const specContent = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' }
      };
      
      mockManifestManager.listSpecs.mockReturnValue([
        { id: 'custom:test-api:1.0.0', name: 'test-api', version: '1.0.0', addedAt: new Date().toISOString() }
      ]);
      mockManifestManager.parseSpecId.mockReturnValue({ name: 'test-api', version: '1.0.0' });
      mockManifestManager.readSpecFile.mockReturnValue(JSON.stringify(specContent));
      mockCacheManager.get.mockReturnValue(null);
      
      const result = await customSpecClient.getAPI('custom', 'test-api');
      
      expect(result).toEqual(specContent);
    });

    test('should throw error for non-custom provider in two parameter format', async () => {
      mockCacheManager.get.mockReturnValue(null);
      
      await expect(customSpecClient.getAPI('github', 'test-api'))
        .rejects.toThrow('Provider github not found in custom specs');
    });

    test('should throw error when specific version not found', async () => {
      mockManifestManager.getSpec.mockReturnValue(null);
      mockCacheManager.get.mockReturnValue(null);
      
      await expect(customSpecClient.getAPI('custom:test-api:2.0.0'))
        .rejects.toThrow('API not found: custom:test-api:2.0.0');
    });

    test('should throw error when no matching specs found', async () => {
      mockManifestManager.listSpecs.mockReturnValue([]);
      mockCacheManager.get.mockReturnValue(null);
      
      await expect(customSpecClient.getAPI('custom', 'test-api'))
        .rejects.toThrow('API not found: custom:test-api');
    });

    test('should throw error when parseSpecId returns null', async () => {
      mockManifestManager.listSpecs.mockReturnValue([
        { id: 'custom:test-api:1.0.0', name: 'test-api', version: '1.0.0', addedAt: new Date().toISOString() }
      ]);
      mockManifestManager.parseSpecId.mockReturnValue(null);
      mockManifestManager.getSpec.mockReturnValue({
        id: 'custom:test-api:1.0.0'
      });
      mockCacheManager.get.mockReturnValue(null);
      
      await expect(customSpecClient.getAPI('custom:test-api:1.0.0'))
        .rejects.toThrow('Invalid spec ID: custom:test-api:1.0.0');
    });

    test('should throw error for invalid JSON in spec file', async () => {
      mockManifestManager.getSpec.mockReturnValue({
        id: 'custom:test-api:1.0.0'
      });
      mockManifestManager.parseSpecId.mockReturnValue({ name: 'test-api', version: '1.0.0' });
      mockManifestManager.readSpecFile.mockReturnValue('invalid json');
      mockCacheManager.get.mockReturnValue(null);
      
      await expect(customSpecClient.getAPI('custom:test-api:1.0.0'))
        .rejects.toThrow('Invalid JSON in spec file');
    });

    test('should handle empty API name in ID', async () => {
      mockCacheManager.get.mockReturnValue(null);
      
      await expect(customSpecClient.getAPI('custom::1.0.0'))
        .rejects.toThrow('API not found: custom::1.0.0');
    });
  });

  describe('listAPIs - branch coverage', () => {
    test('should return searchAPIs result when pagination parameters provided', async () => {
      const specs = [
        { 
          id: 'custom:test-api:1.0.0', 
          name: 'test-api', 
          version: '1.0.0',
          title: 'Test API',
          description: 'Test API description'
        }
      ];
      
      mockManifestManager.listSpecs.mockReturnValue(specs);
      mockManifestManager.parseSpecId.mockReturnValue({ name: 'test-api', version: '1.0.0' });
      mockCacheManager.get.mockReturnValue(null);
      
      const result = await customSpecClient.listAPIs(1, 10);
      
      // When pagination is provided, it returns data and pagination fields like searchAPIs
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('pagination');
      expect(result.data).toBeInstanceOf(Array);
    });

    test('should return original format when no pagination parameters', async () => {
      const specContent = {
        openapi: '3.0.0',
        info: { 
          title: 'Test API', 
          version: '1.0.0',
          contact: { url: 'https://example.com' }
        }
      };
      
      mockManifestManager.listSpecs.mockReturnValue([
        { 
          id: 'custom:test-api:1.0.0', 
          name: 'test-api', 
          version: '1.0.0', 
          imported: '2023-01-01T00:00:00Z',
          addedAt: new Date().toISOString()
        }
      ]);
      mockManifestManager.parseSpecId.mockReturnValue({ name: 'test-api', version: '1.0.0' });
      mockManifestManager.readSpecFile.mockReturnValue(JSON.stringify(specContent));
      mockCacheManager.get.mockReturnValue(null);
      
      const result = await customSpecClient.listAPIs();
      
      expect(result).toBeDefined();
      expect(result['custom:test-api:1.0.0']).toBeDefined();
      expect(result['custom:test-api:1.0.0'].preferred).toBe('1.0.0');
    });

    test('should handle spec parsing errors in listAPIs', async () => {
      mockManifestManager.listSpecs.mockReturnValue([
        { id: 'invalid-spec', name: 'invalid', version: '1.0.0', imported: '2023-01-01T00:00:00Z' }
      ]);
      mockManifestManager.parseSpecId.mockReturnValue(null);
      mockCacheManager.get.mockReturnValue(null);
      
      const result = await customSpecClient.listAPIs();
      
      expect(result).toEqual({});
    });

    test('should handle spec reading errors in listAPIs', async () => {
      mockManifestManager.listSpecs.mockReturnValue([
        { id: 'custom:test-api:1.0.0', name: 'test-api', version: '1.0.0', imported: '2023-01-01T00:00:00Z' }
      ]);
      mockManifestManager.parseSpecId.mockReturnValue({ name: 'test-api', version: '1.0.0' });
      mockManifestManager.readSpecFile.mockImplementation(() => {
        throw new Error('Read error');
      });
      mockCacheManager.get.mockReturnValue(null);
      
      const result = await customSpecClient.listAPIs();
      
      expect(result).toEqual({});
      expect(consoleWarnSpy).toHaveBeenCalled();
    });
  });

  describe('getMetrics - branch coverage', () => {
    test('should return metrics with zero specs', async () => {
      mockManifestManager.getStats.mockReturnValue({
        totalSpecs: 0,
        totalSize: 0,
        byFormat: { yaml: 0, json: 0 },
        bySource: { file: 0, url: 0 },
        lastUpdated: new Date().toISOString()
      });
      mockManifestManager.listSpecs.mockReturnValue([]);
      mockCacheManager.get.mockReturnValue(null);
      
      const result = await customSpecClient.getMetrics();
      
      expect(result.numSpecs).toBe(0);
      expect(result.numProviders).toBe(0);
      expect(result.numEndpoints).toBe(0);
    });

    test('should calculate endpoints from spec paths', async () => {
      const specWithPaths = {
        versions: {
          '1.0.0': {
            spec: {
              paths: {
                '/users': { get: {}, post: {} },
                '/users/{id}': { get: {}, put: {}, delete: {} }
              }
            }
          }
        },
        preferred: '1.0.0'
      };
      
      mockManifestManager.getStats.mockReturnValue({
        totalSpecs: 1,
        totalSize: 1000,
        byFormat: { yaml: 0, json: 1 },
        bySource: { file: 1, url: 0 },
        lastUpdated: new Date().toISOString()
      });
      mockManifestManager.listSpecs.mockReturnValue([
        { id: 'custom:test-api:1.0.0', name: 'test-api', version: '1.0.0' }
      ]);
      mockManifestManager.parseSpecId.mockReturnValue({ name: 'test-api', version: '1.0.0' });
      mockManifestManager.readSpecFile.mockReturnValue(JSON.stringify(specWithPaths));
      mockCacheManager.get.mockReturnValue(null);
      
      const result = await customSpecClient.getMetrics();
      
      expect(result.numEndpoints).toBe(5); // 2 + 3 endpoints
    });

    test('should handle spec parsing errors in metrics', async () => {
      mockManifestManager.getStats.mockReturnValue({
        totalSpecs: 1,
        totalSize: 1000,
        byFormat: { yaml: 0, json: 1 },
        bySource: { file: 1, url: 0 },
        lastUpdated: new Date().toISOString()
      });
      mockManifestManager.listSpecs.mockReturnValue([
        { id: 'custom:test-api:1.0.0', name: 'test-api', version: '1.0.0' }
      ]);
      mockManifestManager.parseSpecId.mockReturnValue(null);
      mockCacheManager.get.mockReturnValue(null);
      
      const result = await customSpecClient.getMetrics();
      
      expect(result.numEndpoints).toBe(0);
    });

    test('should handle non-standard HTTP methods', async () => {
      const specWithCustomMethods = {
        versions: {
          '1.0.0': {
            spec: {
              paths: {
                '/resource': { 
                  get: {}, 
                  post: {},
                  'x-custom': {}, // Should be ignored
                  '$ref': {} // Should be ignored
                }
              }
            }
          }
        },
        preferred: '1.0.0'
      };
      
      mockManifestManager.getStats.mockReturnValue({
        totalSpecs: 1,
        totalSize: 1000,
        byFormat: { yaml: 0, json: 1 },
        bySource: { file: 1, url: 0 },
        lastUpdated: new Date().toISOString()
      });
      mockManifestManager.listSpecs.mockReturnValue([
        { id: 'custom:test-api:1.0.0', name: 'test-api', version: '1.0.0' }
      ]);
      mockManifestManager.parseSpecId.mockReturnValue({ name: 'test-api', version: '1.0.0' });
      mockManifestManager.readSpecFile.mockReturnValue(JSON.stringify(specWithCustomMethods));
      mockCacheManager.get.mockReturnValue(null);
      
      const result = await customSpecClient.getMetrics();
      
      expect(result.numEndpoints).toBe(2); // Only get and post
    });
  });
});