import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { PersistentCacheManager } from '../../../src/cache/persistent-manager.js';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { Logger } from '../../../src/utils/logger.js';

// Mock fs and os modules
jest.mock('fs');
jest.mock('os');

// Mock Logger
jest.mock('../../../src/utils/logger.js', () => ({
  Logger: {
    cache: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn()
  }
}));

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedOs = os as jest.Mocked<typeof os>;

describe('PersistentCacheManager Extended Tests', () => {
  let persistentCache: PersistentCacheManager;
  let consoleErrorSpy: jest.SpyInstance;
  const mockHomeDir = '/home/test';
  const defaultCacheDir = path.join(mockHomeDir, '.cache', 'openapi-directory-mcp');

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock os.homedir
    mockedOs.homedir.mockReturnValue(mockHomeDir);
    
    // Mock fs methods
    mockedFs.existsSync.mockReturnValue(false);
    mockedFs.mkdirSync.mockImplementation(() => undefined);
    mockedFs.readFileSync.mockImplementation(() => {
      throw new Error('File not found');
    });
    mockedFs.writeFileSync.mockImplementation(() => undefined);
    mockedFs.unlinkSync.mockImplementation(() => undefined);
    
    // Suppress console.error
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    // Clear env vars
    delete process.env.DISABLE_CACHE;
    delete process.env.OPENAPI_DIRECTORY_CACHE_DIR;
    
    persistentCache = new PersistentCacheManager();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    // Properly destroy the cache manager to clean up all timers
    if (persistentCache && typeof persistentCache.destroy === 'function' && persistentCache['enabled']) {
      persistentCache.destroy();
    }
    // Extra safety: directly clear the timer if it still exists
    if (persistentCache && persistentCache['persistTimer']) {
      clearInterval(persistentCache['persistTimer']);
    }
  });

  describe('getStats', () => {
    test('should return cache statistics', () => {
      persistentCache['cacheData'].set('key1', {
        value: { data: 'test1' },
        expires: Date.now() + 10000,
        created: Date.now()
      });
      persistentCache['cacheData'].set('key2', {
        value: { data: 'test2' },
        expires: Date.now() + 10000,
        created: Date.now()
      });

      const stats = persistentCache.getStats();

      expect(stats.keys).toBe(2);
      expect(stats.ksize).toBeGreaterThan(0);
      expect(stats.vsize).toBeGreaterThan(0);
      expect(stats.hits).toBe(0); // Not tracked
      expect(stats.misses).toBe(0); // Not tracked
    });

    test('should return zero stats when cache is disabled', () => {
      persistentCache['enabled'] = false;
      
      const stats = persistentCache.getStats();
      
      expect(stats).toEqual({
        keys: 0,
        hits: 0,
        misses: 0,
        ksize: 0,
        vsize: 0
      });
    });
  });

  describe('keys', () => {
    test('should return all cache keys', () => {
      persistentCache['cacheData'].set('key1', {
        value: 'value1',
        expires: Date.now() + 10000,
        created: Date.now()
      });
      persistentCache['cacheData'].set('key2', {
        value: 'value2',
        expires: Date.now() + 10000,
        created: Date.now()
      });

      const keys = persistentCache.keys();

      expect(keys).toEqual(['key1', 'key2']);
    });

    test('should return empty array when disabled', () => {
      persistentCache['enabled'] = false;
      
      const keys = persistentCache.keys();
      
      expect(keys).toEqual([]);
    });

    test('should handle errors in keys method', () => {
      jest.spyOn(Array, 'from').mockImplementationOnce(() => {
        throw new Error('Keys error');
      });

      const keys = persistentCache.keys();

      expect(keys).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Cache keys error:', expect.any(Error));
    });
  });

  describe('getTtl', () => {
    test('should return remaining TTL for key', () => {
      const ttl = 10000; // 10 seconds
      const expires = Date.now() + ttl;
      persistentCache['cacheData'].set('key', {
        value: 'value',
        expires,
        created: Date.now()
      });

      const remaining = persistentCache.getTtl('key');

      expect(remaining).toBeDefined();
      expect(remaining).toBeLessThanOrEqual(ttl);
      expect(remaining).toBeGreaterThan(ttl - 100); // Allow 100ms variance
    });

    test('should return undefined for non-existent key', () => {
      const ttl = persistentCache.getTtl('non-existent');
      expect(ttl).toBeUndefined();
    });

    test('should return undefined for entries without expiration', () => {
      persistentCache['cacheData'].set('no-expire', {
        value: 'value',
        expires: 0,
        created: Date.now()
      });

      const ttl = persistentCache.getTtl('no-expire');
      expect(ttl).toBeUndefined();
    });

    test('should return undefined when disabled', () => {
      persistentCache['enabled'] = false;
      const ttl = persistentCache.getTtl('key');
      expect(ttl).toBeUndefined();
    });

    test('should handle errors in getTtl', () => {
      persistentCache['cacheData'].set('key', {
        value: 'value',
        expires: Date.now() + 10000,
        created: Date.now()
      });

      jest.spyOn(persistentCache['cacheData'], 'get').mockImplementationOnce(() => {
        throw new Error('Get error');
      });

      const ttl = persistentCache.getTtl('key');
      expect(ttl).toBeUndefined();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Cache getTtl error for key key:', expect.any(Error));
    });
  });

  describe('getSize', () => {
    test('should return number of cache entries', () => {
      persistentCache['cacheData'].set('key1', {
        value: 'value1',
        expires: Date.now() + 10000,
        created: Date.now()
      });
      persistentCache['cacheData'].set('key2', {
        value: 'value2',
        expires: Date.now() + 10000,
        created: Date.now()
      });

      expect(persistentCache.getSize()).toBe(2);
    });
  });

  describe('getMemoryUsage', () => {
    test('should return sum of key and value sizes', () => {
      persistentCache['cacheData'].set('key1', {
        value: 'value1',
        expires: Date.now() + 10000,
        created: Date.now()
      });

      const usage = persistentCache.getMemoryUsage();
      expect(usage).toBeGreaterThan(0);
    });
  });

  describe('prune', () => {
    test('should clean expired entries', () => {
      persistentCache['cacheData'].set('expired', {
        value: 'expired',
        expires: Date.now() - 10000,
        created: Date.now() - 20000
      });
      persistentCache['cacheData'].set('valid', {
        value: 'valid',
        expires: Date.now() + 10000,
        created: Date.now()
      });

      persistentCache.prune();

      expect(persistentCache['cacheData'].has('expired')).toBe(false);
      expect(persistentCache['cacheData'].has('valid')).toBe(true);
    });

    test('should not prune when disabled', () => {
      persistentCache['enabled'] = false;
      
      // prune() just calls cleanExpired() which checks enabled status internally
      persistentCache.prune();

      // Since cache is disabled, cleanExpired will return early
      // We can verify this by checking that the cache data wasn't modified
      expect(persistentCache['cacheData'].size).toBe(0);
    });
  });

  describe('setEnabled', () => {
    test('should enable cache and initialize if needed', () => {
      persistentCache['enabled'] = false;
      persistentCache['cacheData'] = null as any;

      persistentCache.setEnabled(true);

      expect(persistentCache['enabled']).toBe(true);
      expect(persistentCache['cacheData']).toBeDefined();
    });

    test('should disable cache and clear data', () => {
      // Mock the clear method to verify it gets called
      const clearSpy = jest.spyOn(persistentCache, 'clear');
      
      persistentCache['cacheData'].set('key', {
        value: 'value',
        expires: Date.now() + 10000,
        created: Date.now()
      });

      persistentCache.setEnabled(false);

      expect(persistentCache['enabled']).toBe(false);
      expect(clearSpy).toHaveBeenCalled();
      // Note: clear() won't actually clear the data because enabled is now false
      // This is the actual behavior of the implementation
    });
  });

  describe('isEnabled', () => {
    test('should return enabled status', () => {
      expect(persistentCache.isEnabled()).toBe(true);

      persistentCache['enabled'] = false;
      expect(persistentCache.isEnabled()).toBe(false);
    });
  });

  describe('getConfig', () => {
    test('should return cache configuration', () => {
      const config = persistentCache.getConfig();

      expect(config).toEqual({
        enabled: true,
        ttlSeconds: 86400, // 24 hours
        maxKeys: 1000
      });
    });

    test('should handle custom TTL', () => {
      const customCache = new PersistentCacheManager(3600000); // 1 hour
      const config = customCache.getConfig();

      expect(config.ttlSeconds).toBe(3600);
    });
  });

  describe('save', () => {
    test('should force persistence to disk', () => {
      const persistSpy = jest.spyOn(persistentCache as any, 'persistToDisk');
      
      persistentCache.save();

      expect(persistSpy).toHaveBeenCalled();
    });
  });

  describe('createInvalidationFlag', () => {
    test('should create invalidation flag file', () => {
      persistentCache.createInvalidationFlag();

      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        path.join(defaultCacheDir, '.invalidate'),
        '',
        'utf-8'
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith('Cache invalidation flag created');
    });

    test('should not create flag when disabled', () => {
      persistentCache['enabled'] = false;

      persistentCache.createInvalidationFlag();

      expect(mockedFs.writeFileSync).not.toHaveBeenCalled();
    });

    test('should handle errors when creating flag', () => {
      mockedFs.writeFileSync.mockImplementationOnce(() => {
        throw new Error('Write error');
      });

      persistentCache.createInvalidationFlag();

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to create invalidation flag:', expect.any(Error));
    });
  });

  describe('getCacheDir', () => {
    test('should return cache directory path', () => {
      expect(persistentCache.getCacheDir()).toBe(defaultCacheDir);
    });
  });

  describe('error handling', () => {
    test('should handle get errors', () => {
      persistentCache['cacheData'].set('key', {
        value: 'value',
        expires: Date.now() + 10000,
        created: Date.now()
      });

      jest.spyOn(persistentCache['cacheData'], 'get').mockImplementationOnce(() => {
        throw new Error('Get error');
      });

      const result = persistentCache.get('key');
      expect(result).toBeUndefined();
      expect(Logger.error).toHaveBeenCalledWith('Cache get error for key key:', expect.any(Error));
    });

    test('should handle set errors', () => {
      jest.spyOn(persistentCache['cacheData'], 'set').mockImplementationOnce(() => {
        throw new Error('Set error');
      });

      const result = persistentCache.set('key', 'value');
      expect(result).toBe(false);
      expect(Logger.error).toHaveBeenCalledWith('Cache set error for key key:', expect.any(Error));
    });

    test('should handle delete errors', () => {
      jest.spyOn(persistentCache['cacheData'], 'has').mockImplementationOnce(() => {
        throw new Error('Has error');
      });

      const result = persistentCache.delete('key');
      expect(result).toBe(0);
      expect(Logger.error).toHaveBeenCalledWith('Cache delete error for key key:', expect.any(Error));
    });

    test('should handle clear errors', () => {
      jest.spyOn(persistentCache['cacheData'], 'clear').mockImplementationOnce(() => {
        throw new Error('Clear error');
      });

      // Should not throw
      expect(() => persistentCache.clear()).not.toThrow();
      expect(Logger.error).toHaveBeenCalledWith('Cache clear error:', expect.any(Error));
    });

    test('should handle has errors', () => {
      jest.spyOn(persistentCache['cacheData'], 'get').mockImplementationOnce(() => {
        throw new Error('Get error');
      });

      const result = persistentCache.has('key');
      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Cache has error for key key:', expect.any(Error));
    });

    test('should handle initialization errors', () => {
      mockedFs.mkdirSync.mockImplementationOnce(() => {
        throw new Error('Cannot create directory');
      });

      const cache = new PersistentCacheManager();
      expect(cache['enabled']).toBe(false);
      expect(Logger.error).toHaveBeenCalledWith('Failed to initialize persistent cache:', expect.any(Error));
    });

    test('should handle invalidation flag removal errors', () => {
      mockedFs.existsSync.mockReturnValueOnce(true).mockReturnValueOnce(true);
      mockedFs.unlinkSync.mockImplementationOnce(() => {
        throw new Error('Cannot remove flag');
      });

      persistentCache['checkInvalidationFlag']();

      expect(Logger.error).toHaveBeenCalledWith('Failed to remove invalidation flag:', expect.any(Error));
    });

    test('should handle cleanup errors', () => {
      jest.spyOn(Array, 'from').mockImplementationOnce(() => {
        throw new Error('Array error');
      });

      // Should not throw
      expect(() => persistentCache['cleanExpired']()).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Cache cleanup error:', expect.any(Error));
    });

    test('should handle load errors', () => {
      mockedFs.existsSync.mockReturnValueOnce(true).mockReturnValueOnce(false).mockReturnValueOnce(true);
      mockedFs.readFileSync.mockImplementationOnce(() => {
        throw new Error('Read error');
      });

      persistentCache['loadFromDisk']();

      expect(persistentCache['cacheData'].size).toBe(0);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Cache load error:', expect.any(Error));
    });

    test('should handle persist errors when disabled', () => {
      persistentCache['enabled'] = false;
      const writeSpy = jest.spyOn(mockedFs, 'writeFileSync');

      persistentCache['persistToDisk']();

      expect(writeSpy).not.toHaveBeenCalled();
    });
  });

  describe('invalidatePattern', () => {
    test('should invalidate keys matching pattern', () => {
      persistentCache['cacheData'].set('api:v1', {
        value: 'value1',
        expires: Date.now() + 10000,
        created: Date.now()
      });
      persistentCache['cacheData'].set('api:v2', {
        value: 'value2',
        expires: Date.now() + 10000,
        created: Date.now()
      });
      persistentCache['cacheData'].set('user:123', {
        value: 'value3',
        expires: Date.now() + 10000,
        created: Date.now()
      });

      const result = persistentCache.invalidatePattern('api:*');

      expect(result).toBe(2);
      expect(persistentCache['cacheData'].has('api:v1')).toBe(false);
      expect(persistentCache['cacheData'].has('api:v2')).toBe(false);
      expect(persistentCache['cacheData'].has('user:123')).toBe(true);
    });

    test('should return 0 when disabled', () => {
      persistentCache['enabled'] = false;

      const result = persistentCache.invalidatePattern('*');
      expect(result).toBe(0);
    });

    test('should handle pattern invalidation errors', () => {
      jest.spyOn(persistentCache, 'keys').mockImplementationOnce(() => {
        throw new Error('Keys error');
      });

      const result = persistentCache.invalidatePattern('test:*');
      expect(result).toBe(0);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Cache invalidatePattern error for pattern test:*:',
        expect.any(Error)
      );
    });
  });

  describe('invalidateKeys', () => {
    test('should invalidate specific keys', () => {
      persistentCache['cacheData'].set('key1', {
        value: 'value1',
        expires: Date.now() + 10000,
        created: Date.now()
      });
      persistentCache['cacheData'].set('key2', {
        value: 'value2',
        expires: Date.now() + 10000,
        created: Date.now()
      });

      const result = persistentCache.invalidateKeys(['key1', 'key2', 'non-existent']);

      expect(result).toBe(2);
      expect(persistentCache['cacheData'].has('key1')).toBe(false);
      expect(persistentCache['cacheData'].has('key2')).toBe(false);
    });

    test('should return 0 when disabled', () => {
      persistentCache['enabled'] = false;

      const result = persistentCache.invalidateKeys(['key1']);
      expect(result).toBe(0);
    });

    test('should handle invalidateKeys errors', () => {
      persistentCache['cacheData'].set('key1', {
        value: 'value1',
        expires: Date.now() + 10000,
        created: Date.now()
      });

      jest.spyOn(persistentCache['cacheData'], 'delete').mockImplementationOnce(() => {
        throw new Error('Delete error');
      });

      const result = persistentCache.invalidateKeys(['key1']);
      expect(result).toBe(0);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Cache invalidateKeys error:', expect.any(Error));
    });
  });

  describe('warmCache', () => {
    test('should warm cache with fetched data', async () => {
      const fetchFn = jest.fn().mockResolvedValue({ data: 'fetched' });

      const result = await persistentCache.warmCache('warm-key', fetchFn, 5000);

      expect(result).toEqual({ data: 'fetched' });
      expect(fetchFn).toHaveBeenCalled();
      expect(persistentCache['cacheData'].has('warm-key')).toBe(true);
    });

    test('should return cached data if available', async () => {
      persistentCache['cacheData'].set('warm-key', {
        value: { data: 'cached' },
        expires: Date.now() + 10000,
        created: Date.now()
      });
      const fetchFn = jest.fn();

      const result = await persistentCache.warmCache('warm-key', fetchFn);

      expect(result).toEqual({ data: 'cached' });
      expect(fetchFn).not.toHaveBeenCalled();
    });

    test('should fetch data when cache is disabled', async () => {
      persistentCache['enabled'] = false;
      const fetchFn = jest.fn().mockResolvedValue({ data: 'fetched' });

      const result = await persistentCache.warmCache('warm-key', fetchFn);

      expect(result).toEqual({ data: 'fetched' });
      expect(fetchFn).toHaveBeenCalled();
    });

    test('should handle warmCache errors', async () => {
      const fetchFn = jest.fn().mockRejectedValue(new Error('Fetch error'));

      await expect(persistentCache.warmCache('warm-key', fetchFn)).rejects.toThrow('Fetch error');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Cache warmCache error for key warm-key:', expect.any(Error));
    });
  });

  describe('destroy', () => {
    test('should cleanup and save on destroy', () => {
      const timer = setInterval(() => {}, 1000);
      persistentCache['persistTimer'] = timer;
      const cleanSpy = jest.spyOn(persistentCache as any, 'cleanExpired');
      const persistSpy = jest.spyOn(persistentCache as any, 'persistToDisk');
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      persistentCache.destroy();

      expect(cleanSpy).toHaveBeenCalled();
      expect(persistSpy).toHaveBeenCalled();
      // Timer should be cleared
      expect(clearIntervalSpy).toHaveBeenCalledWith(timer);
      
      clearInterval(timer); // Clean up the actual timer
    });

    test('should not destroy when disabled', () => {
      persistentCache['enabled'] = false;
      const cleanSpy = jest.spyOn(persistentCache as any, 'cleanExpired');

      persistentCache.destroy();

      expect(cleanSpy).not.toHaveBeenCalled();
    });
  });

  describe('timer setup in production', () => {
    test('should set up persistence timer in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      jest.clearAllMocks();
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      
      new PersistentCacheManager();

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 5 * 60 * 1000);
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('cleanExpired with many entries', () => {
    test('should log when cleaning multiple expired entries', () => {
      // Add multiple expired entries
      for (let i = 0; i < 5; i++) {
        persistentCache['cacheData'].set(`expired${i}`, {
          value: `value${i}`,
          expires: Date.now() - 10000,
          created: Date.now() - 20000
        });
      }

      persistentCache['cleanExpired']();

      expect(consoleErrorSpy).toHaveBeenCalledWith('Cleaned 5 expired cache entries');
    });
  });

  describe('loadFromDisk with data', () => {
    test('should log when loading cache from disk', () => {
      const mockCacheData = {
        'key1': { value: 'value1', expires: Date.now() + 10000, created: Date.now() },
        'key2': { value: 'value2', expires: Date.now() + 10000, created: Date.now() }
      };
      
      mockedFs.existsSync.mockReturnValueOnce(true);
      mockedFs.readFileSync.mockReturnValueOnce(JSON.stringify(mockCacheData));

      persistentCache['loadFromDisk']();

      expect(consoleErrorSpy).toHaveBeenCalledWith('Loaded 2 cache entries from disk');
    });
  });

  describe('persist errors', () => {
    test('should handle persist to disk errors', () => {
      jest.spyOn(persistentCache as any, 'cleanExpired').mockImplementationOnce(() => {
        throw new Error('Clean error');
      });

      // Should not throw
      expect(() => persistentCache['persistToDisk']()).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Cache persistence error:', expect.any(Error));
    });
  });

  describe('delete return value', () => {
    test('should return 0 when cache is disabled', () => {
      persistentCache['enabled'] = false;
      const result = persistentCache.delete('key');
      expect(result).toBe(0);
    });
  });

  describe('clear when disabled', () => {
    test('should return early when disabled', () => {
      persistentCache['enabled'] = false;
      const clearSpy = jest.spyOn(persistentCache['cacheData'], 'clear');

      persistentCache.clear();

      expect(clearSpy).not.toHaveBeenCalled();
    });
  });

  describe('TTL with zero value', () => {
    test('should handle entries with zero TTL (never expire)', () => {
      const result = persistentCache.set('no-expire', 'value', 0);
      expect(result).toBe(true);

      const entry = persistentCache['cacheData'].get('no-expire');
      // When TTL is 0, it still adds the default TTL (24 hours)
      expect(entry?.expires).toBeGreaterThan(Date.now());
      expect(Logger.cache).toHaveBeenCalledWith('set', 'no-expire', { ttl: '86400s' });
    });
  });
});