import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { CacheManager } from '../../../src/cache/manager.js';
import NodeCache from 'node-cache';
import { CacheValidator } from '../../../src/utils/validation.js';

// Mock NodeCache
jest.mock('node-cache');
const MockedNodeCache = NodeCache as jest.MockedClass<typeof NodeCache>;

// Mock CacheValidator
jest.mock('../../../src/utils/validation.js', () => ({
  CacheValidator: {
    generateIntegrityHash: jest.fn().mockReturnValue('mock-hash'),
    verifyCacheIntegrity: jest.fn().mockReturnValue(true),
    validateCacheEntry: jest.fn().mockReturnValue(true)
  }
}));

describe('CacheManager', () => {
  let cacheManager: CacheManager;
  let mockNodeCache: jest.Mocked<NodeCache>;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock NodeCache instance
    mockNodeCache = {
      get: jest.fn(),
      set: jest.fn().mockReturnValue(true),
      del: jest.fn().mockReturnValue(1),
      has: jest.fn(),
      flushAll: jest.fn(),
      keys: jest.fn().mockReturnValue([]),
      on: jest.fn(),
      getStats: jest.fn().mockReturnValue({
        keys: 0,
        hits: 0,
        misses: 0,
        ksize: 0,
        vsize: 0
      }),
      getTtl: jest.fn(),
      ttl: jest.fn().mockReturnValue(true),
      close: jest.fn()
    } as any;
    
    MockedNodeCache.mockImplementation(() => mockNodeCache);
    
    // Suppress console.error in tests
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    cacheManager = new CacheManager();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    // Properly destroy the cache manager
    if (cacheManager && typeof cacheManager.destroy === 'function') {
      cacheManager.destroy();
    } else if (cacheManager) {
      cacheManager.clear();
    }
    // Clear all mocks to prevent timer leaks
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('should initialize NodeCache with correct options', () => {
      expect(MockedNodeCache).toHaveBeenCalledWith({
        stdTTL: expect.any(Number),
        checkperiod: expect.any(Number),
        useClones: false,
        deleteOnExpire: true,
        maxKeys: 1000
      });
    });

    test('should set up event listeners', () => {
      expect(mockNodeCache.on).toHaveBeenCalledWith('expired', expect.any(Function));
      expect(mockNodeCache.on).toHaveBeenCalledWith('set', expect.any(Function));
    });

    test('should respect custom TTL', () => {
      new CacheManager(3600000); // 1 hour
      
      expect(MockedNodeCache).toHaveBeenCalledWith(
        expect.objectContaining({
          stdTTL: 3600
        })
      );
    });

    test('should respect DISABLE_CACHE environment variable', () => {
      process.env.DISABLE_CACHE = 'true';
      const disabledCache = new CacheManager();
      
      expect(disabledCache['enabled']).toBe(false);
      
      delete process.env.DISABLE_CACHE;
    });
  });

  describe('get', () => {
    test('should retrieve value from cache', () => {
      const testValue = { data: 'test' };
      const wrappedValue = {
        value: testValue,
        timestamp: new Date().toISOString(),
        integrity: 'mock-hash'
      };
      mockNodeCache.get.mockReturnValueOnce(wrappedValue);
      
      const result = cacheManager.get('test-key');
      
      expect(mockNodeCache.get).toHaveBeenCalledWith('test-key');
      expect(result).toEqual(testValue);
    });

    test('should return undefined for non-existent key', () => {
      mockNodeCache.get.mockReturnValueOnce(undefined);
      
      const result = cacheManager.get('non-existent');
      
      expect(result).toBeUndefined();
    });

    test('should return undefined when cache is disabled', () => {
      cacheManager['enabled'] = false;
      
      const result = cacheManager.get('test-key');
      
      expect(result).toBeUndefined();
      expect(mockNodeCache.get).not.toHaveBeenCalled();
    });

    test('should validate cache entry integrity', () => {
      const testValue = { data: 'test' };
      const wrappedValue = {
        value: testValue,
        timestamp: new Date().toISOString(),
        integrity: 'wrong-hash'
      };
      mockNodeCache.get.mockReturnValueOnce(wrappedValue);
      
      // Mock integrity check to fail
      jest.spyOn(CacheValidator, 'validateCacheEntry').mockReturnValueOnce(false);
      
      const result = cacheManager.get('test-key');
      
      expect(result).toBeUndefined();
      expect(mockNodeCache.del).toHaveBeenCalledWith('test-key');
    });

    test('should handle cache get errors gracefully', () => {
      mockNodeCache.get.mockImplementationOnce(() => {
        throw new Error('Cache error');
      });
      
      const result = cacheManager.get('test-key');
      
      expect(result).toBeUndefined();
    });
  });

  describe('set', () => {
    test('should store value in cache with metadata', () => {
      const testValue = { data: 'test' };
      
      const result = cacheManager.set('test-key', testValue);
      
      expect(mockNodeCache.set).toHaveBeenCalledWith(
        'test-key',
        expect.objectContaining({
          value: testValue,
          timestamp: expect.any(String),
          integrity: 'mock-hash'
        })
      );
      expect(result).toBe(true);
    });

    test('should use custom TTL when provided', () => {
      const testValue = { data: 'test' };
      const ttlMs = 10000; // 10 seconds
      
      cacheManager.set('test-key', testValue, ttlMs);
      
      expect(mockNodeCache.set).toHaveBeenCalledWith(
        'test-key',
        expect.any(Object),
        10 // 10 seconds
      );
    });

    test('should return false when cache is disabled', () => {
      cacheManager['enabled'] = false;
      
      const result = cacheManager.set('test-key', { data: 'test' });
      
      expect(result).toBe(false);
      expect(mockNodeCache.set).not.toHaveBeenCalled();
    });

    test('should handle cache set errors gracefully', () => {
      mockNodeCache.set.mockImplementationOnce(() => {
        throw new Error('Cache error');
      });
      
      const result = cacheManager.set('test-key', { data: 'test' });
      
      expect(result).toBe(false);
    });
  });

  describe('delete', () => {
    test('should delete key from cache', () => {
      mockNodeCache.del.mockReturnValueOnce(1);
      
      const result = cacheManager.delete('test-key');
      
      expect(mockNodeCache.del).toHaveBeenCalledWith('test-key');
      expect(result).toBe(1);
    });

    test('should return 0 for non-existent key', () => {
      mockNodeCache.del.mockReturnValueOnce(0);
      
      const result = cacheManager.delete('non-existent');
      
      expect(result).toBe(0);
    });

    test('should return 0 when cache is disabled', () => {
      cacheManager['enabled'] = false;
      
      const result = cacheManager.delete('test-key');
      
      expect(result).toBe(0);
      expect(mockNodeCache.del).not.toHaveBeenCalled();
    });
  });

  describe('clear', () => {
    test('should clear all cache entries', () => {
      cacheManager.clear();
      
      expect(mockNodeCache.flushAll).toHaveBeenCalled();
    });

    test('should not clear when cache is disabled', () => {
      cacheManager['enabled'] = false;
      
      cacheManager.clear();
      
      expect(mockNodeCache.flushAll).not.toHaveBeenCalled();
    });
  });

  describe('has', () => {
    test('should check if key exists', () => {
      mockNodeCache.has.mockReturnValueOnce(true);
      
      const result = cacheManager.has('test-key');
      
      expect(mockNodeCache.has).toHaveBeenCalledWith('test-key');
      expect(result).toBe(true);
    });

    test('should return false when cache is disabled', () => {
      cacheManager['enabled'] = false;
      
      const result = cacheManager.has('test-key');
      
      expect(result).toBe(false);
      expect(mockNodeCache.has).not.toHaveBeenCalled();
    });
  });

  describe('keys', () => {
    test('should return all cache keys', () => {
      const mockKeys = ['key1', 'key2', 'key3'];
      mockNodeCache.keys.mockReturnValueOnce(mockKeys);
      
      const result = cacheManager.keys();
      
      expect(result).toEqual(mockKeys);
    });

    test('should return empty array when cache is disabled', () => {
      cacheManager['enabled'] = false;
      
      const result = cacheManager.keys();
      
      expect(result).toEqual([]);
    });
  });

  describe('getStats', () => {
    test('should return cache statistics', () => {
      const mockStats = {
        keys: 10,
        hits: 50,
        misses: 5,
        ksize: 100,
        vsize: 1000
      };
      mockNodeCache.getStats.mockReturnValueOnce(mockStats);
      
      const result = cacheManager.getStats();
      
      expect(result).toEqual(mockStats);
    });

    test('should return zero stats when cache is disabled', () => {
      cacheManager['enabled'] = false;
      
      const result = cacheManager.getStats();
      
      expect(result).toEqual({
        keys: 0,
        hits: 0,
        misses: 0,
        ksize: 0,
        vsize: 0
      });
    });
  });

  describe('getTtl', () => {
    test('should return TTL for key', () => {
      const ttlTime = Date.now() + 5000;
      mockNodeCache.getTtl.mockReturnValueOnce(ttlTime);
      
      const result = cacheManager.getTtl('test-key');
      
      expect(mockNodeCache.getTtl).toHaveBeenCalledWith('test-key');
      expect(result).toBe(ttlTime);
    });

    test('should return undefined for non-existent key', () => {
      mockNodeCache.getTtl.mockReturnValueOnce(0);
      
      const result = cacheManager.getTtl('non-existent');
      
      expect(result).toBeUndefined();
    });

    test('should return undefined when cache is disabled', () => {
      cacheManager['enabled'] = false;
      
      const result = cacheManager.getTtl('test-key');
      
      expect(result).toBeUndefined();
    });
  });

  describe('event handlers', () => {
    test('should log expired keys', () => {
      const expiredHandler = mockNodeCache.on.mock.calls.find(
        call => call[0] === 'expired'
      )?.[1];
      
      // Mock console.log to capture Logger.cache calls
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      
      expiredHandler?.('expired-key', 'expired-value');
      
      expect(consoleLogSpy).toHaveBeenCalledWith('[CACHE] expired: expired-key');
      
      consoleLogSpy.mockRestore();
    });

    test('should log set keys', () => {
      const setHandler = mockNodeCache.on.mock.calls.find(
        call => call[0] === 'set'
      )?.[1];
      
      // Mock console.log to capture Logger.cache calls
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      
      setHandler?.('new-key', 'new-value');
      
      expect(consoleLogSpy).toHaveBeenCalledWith('[CACHE] set: new-key');
      
      consoleLogSpy.mockRestore();
    });
  });

  describe('cache warming', () => {
    test('should warm cache with fetched data', async () => {
      const fetchFn = jest.fn().mockResolvedValue({ data: 'fetched' });
      mockNodeCache.get.mockReturnValueOnce(undefined);
      
      const result = await cacheManager.warmCache('warm-key', fetchFn, 5000);
      
      expect(mockNodeCache.get).toHaveBeenCalledWith('warm-key');
      expect(fetchFn).toHaveBeenCalled();
      expect(mockNodeCache.set).toHaveBeenCalledWith(
        'warm-key',
        expect.objectContaining({
          value: { data: 'fetched' }
        }),
        5
      );
      expect(result).toEqual({ data: 'fetched' });
    });

    test('should return cached data if available', async () => {
      const fetchFn = jest.fn();
      const cachedData = { data: 'cached' };
      const wrappedValue = {
        value: cachedData,
        timestamp: new Date().toISOString(),
        integrity: 'mock-hash'
      };
      mockNodeCache.get.mockReturnValueOnce(wrappedValue);
      
      const result = await cacheManager.warmCache('warm-key', fetchFn);
      
      expect(fetchFn).not.toHaveBeenCalled();
      expect(result).toEqual(cachedData);
    });
  });

  describe('pattern invalidation', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('should invalidate keys matching pattern', () => {
      mockNodeCache.keys.mockReturnValueOnce(['api:v1', 'api:v2', 'user:123']);
      mockNodeCache.del.mockReturnValue(1);
      
      const result = cacheManager.invalidatePattern('api:*');
      
      expect(mockNodeCache.del).toHaveBeenCalledWith('api:v1');
      expect(mockNodeCache.del).toHaveBeenCalledWith('api:v2');
      expect(mockNodeCache.del).toHaveBeenCalledTimes(2);
      expect(result).toBe(2);
    });

    test('should handle no matching keys', () => {
      mockNodeCache.keys.mockReturnValueOnce(['user:123', 'user:456']);
      
      const result = cacheManager.invalidatePattern('api:*');
      
      expect(mockNodeCache.del).not.toHaveBeenCalled();
      expect(result).toBe(0);
    });
  });

  describe('multiple key invalidation', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('should invalidate multiple specific keys', () => {
      mockNodeCache.del.mockReturnValue(1);
      
      const result = cacheManager.invalidateKeys(['key1', 'key2']);
      
      expect(mockNodeCache.del).toHaveBeenCalledWith('key1');
      expect(mockNodeCache.del).toHaveBeenCalledWith('key2');
      expect(mockNodeCache.del).toHaveBeenCalledTimes(2);
      expect(result).toBe(2);
    });

    test('should handle empty key list', () => {
      const result = cacheManager.invalidateKeys([]);
      
      expect(mockNodeCache.del).not.toHaveBeenCalled();
      expect(result).toBe(0);
    });
  });
});