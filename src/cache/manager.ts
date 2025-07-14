import NodeCache from "node-cache";
import { ICacheManager } from "./types.js";
import { CACHE_TTL, CACHE_LIMITS } from "../utils/constants.js";
import { CacheValidator } from "../utils/validation.js";
import { CacheError, ErrorHandler } from "../utils/errors.js";
import { Logger } from "../utils/logger.js";

export class CacheManager implements ICacheManager {
  private cache: NodeCache;
  private enabled: boolean;

  constructor(ttlMs: number = CACHE_TTL.DEFAULT) {
    this.enabled = process.env.DISABLE_CACHE !== "true";

    this.cache = new NodeCache({
      stdTTL: Math.floor(ttlMs / 1000), // NodeCache uses seconds
      checkperiod:
        process.env.NODE_ENV === "test"
          ? 0
          : Math.floor((ttlMs / 1000) * CACHE_LIMITS.CHECK_PERIOD_RATIO), // Disable periodic checks in tests
      useClones: false, // Better performance, but be careful with mutations
      deleteOnExpire: true,
      maxKeys: CACHE_LIMITS.MAX_KEYS,
    });

    // Set up cache statistics logging
    this.cache.on("expired", (key) => {
      Logger.cache("expired", key);
    });

    this.cache.on("set", (key) => {
      Logger.cache("set", key);
    });
  }

  /**
   * Get value from cache with validation
   */
  get<T>(key: string): T | undefined {
    if (!this.enabled) {
      return undefined;
    }

    try {
      const wrappedValue = this.cache.get<any>(key);
      if (wrappedValue !== undefined) {
        // Validate cache entry integrity
        if (!this.validateCacheEntry(key, wrappedValue)) {
          Logger.warn(`Cache corruption detected for key: ${key}`);
          this.delete(key);
          return undefined;
        }

        Logger.cache("hit", key);

        // Return the unwrapped value
        return wrappedValue.value as T;
      }
      return undefined;
    } catch (error) {
      const cacheError = new CacheError(`Cache get error for key ${key}`, {
        operation: "get",
        details: {
          key,
          error: error instanceof Error ? error.message : String(error),
        },
      });
      ErrorHandler.logError(cacheError);
      return undefined;
    }
  }

  /**
   * Set value in cache with enhanced metadata
   */
  set<T>(key: string, value: T, ttlMs?: number): boolean {
    if (!this.enabled) {
      return false;
    }

    try {
      // Wrap value with metadata for validation
      const wrappedValue = {
        value,
        timestamp: new Date().toISOString(),
        integrity: CacheValidator.generateIntegrityHash(value),
      };

      const success = ttlMs
        ? this.cache.set(
            key,
            wrappedValue,
            Math.max(1, Math.floor(ttlMs / 1000)),
          )
        : this.cache.set(key, wrappedValue);

      if (success) {
        const ttlSeconds = ttlMs
          ? Math.max(1, Math.floor(ttlMs / 1000))
          : "default";
        Logger.cache("set", key, { ttl: `${ttlSeconds}s` });
      }

      return success;
    } catch (error) {
      const cacheError = new CacheError(`Cache set error for key ${key}`, {
        operation: "set",
        details: {
          key,
          error: error instanceof Error ? error.message : String(error),
        },
      });
      ErrorHandler.logError(cacheError);
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  delete(key: string): number {
    if (!this.enabled) {
      return 0;
    }

    try {
      const deleted = this.cache.del(key);
      if (deleted > 0) {
        Logger.cache("delete", key);
      }
      return deleted;
    } catch (error) {
      Logger.error(`Cache delete error for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    if (!this.enabled) {
      return;
    }

    try {
      this.cache.flushAll();
      Logger.cache("clear", "all");
    } catch (error) {
      Logger.error("Cache clear error:", error);
    }
  }

  /**
   * Destroy the cache and clean up resources
   */
  destroy(): void {
    if (!this.enabled) return;

    try {
      // Clear all data
      this.cache.flushAll();

      // Close the cache to stop any internal timers
      if (typeof (this.cache as any).close === "function") {
        (this.cache as any).close();
      }
    } catch (error) {
      Logger.error("Cache destroy error:", error);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    keys: number;
    hits: number;
    misses: number;
    ksize: number;
    vsize: number;
  } {
    if (!this.enabled) {
      return {
        keys: 0,
        hits: 0,
        misses: 0,
        ksize: 0,
        vsize: 0,
      };
    }

    return this.cache.getStats();
  }

  /**
   * Get all cache keys
   */
  keys(): string[] {
    if (!this.enabled) {
      return [];
    }

    return this.cache.keys();
  }

  /**
   * Check if cache has a key
   */
  has(key: string): boolean {
    if (!this.enabled) {
      return false;
    }

    return this.cache.has(key);
  }

  /**
   * Get TTL for a key (in seconds)
   */
  getTtl(key: string): number | undefined {
    if (!this.enabled) {
      return undefined;
    }

    const ttl = this.cache.getTtl(key);
    // NodeCache returns 0 for non-existent keys
    return ttl === 0 ? undefined : ttl;
  }

  /**
   * Get cache size information
   */
  getSize(): number {
    if (!this.enabled) {
      return 0;
    }

    return this.cache.keys().length;
  }

  /**
   * Get cache memory usage (approximate)
   */
  getMemoryUsage(): number {
    if (!this.enabled) {
      return 0;
    }

    const stats = this.cache.getStats();
    return stats.vsize + stats.ksize;
  }

  /**
   * Prune expired entries manually
   */
  prune(): void {
    if (!this.enabled) {
      return;
    }

    // NodeCache handles this automatically, but we can force it
    const keys = this.cache.keys();
    const now = Date.now();

    for (const key of keys) {
      const ttl = this.cache.getTtl(key);
      if (ttl && ttl < now) {
        this.cache.del(key);
      }
    }
  }

  /**
   * Set cache enabled/disabled
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.clear();
    }
  }

  /**
   * Check if cache is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get cache configuration
   */
  getConfig(): {
    enabled: boolean;
    ttlSeconds: number;
    maxKeys: number;
  } {
    return {
      enabled: this.enabled,
      ttlSeconds: this.cache.options.stdTTL || 86400,
      maxKeys: this.cache.options.maxKeys || 1000,
    };
  }

  /**
   * Invalidate cache keys matching a pattern (supports * wildcard)
   */
  invalidatePattern(pattern: string): number {
    if (!this.enabled) {
      return 0;
    }

    try {
      const keys = this.keys();
      const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
      let deletedCount = 0;

      for (const key of keys) {
        if (regex.test(key)) {
          deletedCount += this.cache.del(key);
        }
      }

      if (deletedCount > 0) {
        Logger.cache("invalidatePattern", pattern, { count: deletedCount });
      }

      return deletedCount;
    } catch (error) {
      Logger.error(
        `Cache invalidatePattern error for pattern ${pattern}:`,
        error,
      );
      return 0;
    }
  }

  /**
   * Invalidate multiple specific cache keys
   */
  invalidateKeys(keys: string[]): number {
    if (!this.enabled) {
      return 0;
    }

    try {
      let deletedCount = 0;

      for (const key of keys) {
        deletedCount += this.cache.del(key);
      }

      if (deletedCount > 0) {
        Logger.cache("invalidateKeys", "multiple", { count: deletedCount });
      }

      return deletedCount;
    } catch (error) {
      Logger.error(`Cache invalidateKeys error:`, error);
      return 0;
    }
  }

  /**
   * Cache warming - fetch data and store it in cache
   */
  async warmCache<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlMs?: number,
  ): Promise<T> {
    if (!this.enabled) {
      // If cache is disabled, just fetch and return the data
      return await fetchFn();
    }

    try {
      // Check if we already have fresh data
      const cached = this.get<T>(key);
      if (cached !== undefined) {
        return cached;
      }

      // Fetch fresh data
      Logger.cache("warming", key);
      const data = await fetchFn();

      // Store in cache
      this.set(key, data, ttlMs);

      return data;
    } catch (error) {
      Logger.error(`Cache warmCache error for key ${key}:`, error);
      // On error, try to fetch without caching
      return await fetchFn();
    }
  }

  /**
   * Validate cache entry integrity
   */
  private validateCacheEntry(key: string, wrappedValue: any): boolean {
    try {
      // Check if it's a wrapped value with metadata
      if (!wrappedValue || typeof wrappedValue !== "object") {
        return false;
      }

      // For backward compatibility, allow unwrapped values
      if (
        !wrappedValue.value &&
        !wrappedValue.timestamp &&
        !wrappedValue.integrity
      ) {
        return true; // Old format, assume valid
      }

      // Use cache validator for integrity check
      if (!CacheValidator.validateCacheEntry(key, wrappedValue)) {
        return false;
      }

      // Verify integrity hash if present
      if (wrappedValue.integrity) {
        return CacheValidator.verifyCacheIntegrity(
          wrappedValue.value,
          wrappedValue.integrity,
        );
      }

      return true;
    } catch (error) {
      Logger.error(`Cache validation error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Perform cache health check and cleanup
   */
  performHealthCheck(): {
    totalKeys: number;
    corruptedKeys: number;
    cleanedKeys: number;
    memoryUsage: number;
  } {
    if (!this.enabled) {
      return { totalKeys: 0, corruptedKeys: 0, cleanedKeys: 0, memoryUsage: 0 };
    }

    const keys = this.keys();
    let corruptedKeys = 0;
    let cleanedKeys = 0;

    for (const key of keys) {
      const wrappedValue = this.cache.get(key);
      if (!this.validateCacheEntry(key, wrappedValue)) {
        this.delete(key);
        corruptedKeys++;
        cleanedKeys++;
      }
    }

    const memoryUsage = this.getMemoryUsage();

    Logger.cache("healthCheck", "completed", {
      cleaned: cleanedKeys,
      total: keys.length,
      corrupted: corruptedKeys,
    });

    return {
      totalKeys: keys.length,
      corruptedKeys,
      cleanedKeys,
      memoryUsage,
    };
  }
}
