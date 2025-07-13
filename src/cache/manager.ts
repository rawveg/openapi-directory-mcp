import NodeCache from "node-cache";
import { ICacheManager } from "./types.js";

export class CacheManager implements ICacheManager {
  private cache: NodeCache;
  private enabled: boolean;

  constructor(ttlMs: number = 86400000) {
    // 24 hours default
    this.enabled = process.env.DISABLE_CACHE !== "true";

    this.cache = new NodeCache({
      stdTTL: Math.floor(ttlMs / 1000), // NodeCache uses seconds
      checkperiod: Math.floor(ttlMs / 1000 / 10), // Check every 10% of TTL
      useClones: false, // Better performance, but be careful with mutations
      deleteOnExpire: true,
      maxKeys: 1000, // Limit memory usage
    });

    // Set up cache statistics logging
    this.cache.on("expired", (key) => {
      console.error(`Cache expired: ${key}`);
    });

    this.cache.on("set", (key) => {
      console.error(`Cache set: ${key}`);
    });
  }

  /**
   * Get value from cache
   */
  get<T>(key: string): T | undefined {
    if (!this.enabled) {
      return undefined;
    }

    try {
      const value = this.cache.get<T>(key);
      if (value !== undefined) {
        console.error(`Cache hit: ${key}`);
      }
      return value;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return undefined;
    }
  }

  /**
   * Set value in cache
   */
  set<T>(key: string, value: T, ttlMs?: number): boolean {
    if (!this.enabled) {
      return false;
    }

    try {
      const success = ttlMs
        ? this.cache.set(key, value, Math.max(1, Math.floor(ttlMs / 1000)))
        : this.cache.set(key, value);

      if (success) {
        const ttlSeconds = ttlMs
          ? Math.max(1, Math.floor(ttlMs / 1000))
          : "default";
        console.error(`Cache set: ${key} (TTL: ${ttlSeconds}s)`);
      }

      return success;
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
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
        console.error(`Cache deleted: ${key}`);
      }
      return deleted;
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
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
      console.error("Cache cleared");
    } catch (error) {
      console.error("Cache clear error:", error);
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

    return this.cache.getTtl(key);
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
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      let deletedCount = 0;

      for (const key of keys) {
        if (regex.test(key)) {
          deletedCount += this.cache.del(key);
        }
      }

      if (deletedCount > 0) {
        console.error(`Cache invalidated ${deletedCount} keys matching pattern: ${pattern}`);
      }

      return deletedCount;
    } catch (error) {
      console.error(`Cache invalidatePattern error for pattern ${pattern}:`, error);
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
        console.error(`Cache invalidated ${deletedCount} specific keys`);
      }

      return deletedCount;
    } catch (error) {
      console.error(`Cache invalidateKeys error:`, error);
      return 0;
    }
  }

  /**
   * Cache warming - fetch data and store it in cache
   */
  async warmCache<T>(key: string, fetchFn: () => Promise<T>, ttlMs?: number): Promise<T> {
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
      console.error(`Cache warming: ${key}`);
      const data = await fetchFn();
      
      // Store in cache
      this.set(key, data, ttlMs);
      
      return data;
    } catch (error) {
      console.error(`Cache warmCache error for key ${key}:`, error);
      // On error, try to fetch without caching
      return await fetchFn();
    }
  }
}
