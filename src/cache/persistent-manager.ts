import { join } from "path";
import { homedir } from "os";
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "fs";
import { ICacheManager } from "./types.js";

interface CacheEntry {
  value: any;
  expires: number;
  created: number;
}

export class PersistentCacheManager implements ICacheManager {
  private cacheData: Map<string, CacheEntry>;
  private enabled: boolean;
  private cacheDir: string;
  private cacheFile: string;
  private invalidateFlag: string;
  private ttlMs: number;
  private persistInterval: number = 5 * 60 * 1000; // 5 minutes
  private persistTimer?: ReturnType<typeof setInterval>;

  constructor(ttlMs: number = 86400000) {
    // 24 hours default
    this.enabled = process.env.DISABLE_CACHE !== "true";
    this.ttlMs = ttlMs;
    this.cacheData = new Map<string, CacheEntry>();

    // Set up cache directory and file
    this.cacheDir =
      process.env.OPENAPI_DIRECTORY_CACHE_DIR ||
      join(homedir(), ".cache", "openapi-directory-mcp");
    this.cacheFile = join(this.cacheDir, "cache.json");
    this.invalidateFlag = join(this.cacheDir, ".invalidate");

    if (this.enabled) {
      this.initializeCache();
    }
  }

  private initializeCache(): void {
    try {
      // Create cache directory if it doesn't exist
      if (!existsSync(this.cacheDir)) {
        mkdirSync(this.cacheDir, { recursive: true });
        console.error(`Created cache directory: ${this.cacheDir}`);
      }

      // Check for invalidation flag before loading cache
      this.checkInvalidationFlag();

      // Load existing cache data if it exists
      this.loadFromDisk();

      console.error(`Persistent cache initialized: ${this.cacheFile}`);

      // Set up automatic persistence interval (disabled in test environment)
      if (process.env.NODE_ENV !== "test") {
        this.persistTimer = setInterval(() => {
          this.persistToDisk();
        }, this.persistInterval);
      }

      // Clean expired entries on startup
      this.cleanExpired();
    } catch (error) {
      console.error("Failed to initialize persistent cache:", error);
      this.enabled = false;
    }
  }

  /**
   * Check for invalidation flag and clear cache if present
   */
  private checkInvalidationFlag(): void {
    if (existsSync(this.invalidateFlag)) {
      console.error("Cache invalidation flag detected, clearing cache...");
      this.cacheData.clear();
      try {
        require("fs").unlinkSync(this.invalidateFlag);
        console.error("Cache invalidation flag removed");
      } catch (error) {
        console.error("Failed to remove invalidation flag:", error);
      }
    }
  }

  /**
   * Get value from cache
   */
  get<T>(key: string): T | undefined {
    if (!this.enabled) {
      return undefined;
    }

    // Check for invalidation flag before any cache operation
    this.checkInvalidationFlag();

    try {
      const entry = this.cacheData.get(key);
      if (!entry) {
        return undefined;
      }

      // Check TTL expiration
      if (entry.expires && Date.now() > entry.expires) {
        this.cacheData.delete(key);
        return undefined;
      }

      console.error(`Cache hit: ${key}`);
      return entry.value as T;
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
      const effectiveTtl = ttlMs || this.ttlMs;
      const expires = effectiveTtl > 0 ? Date.now() + effectiveTtl : 0;

      const entry: CacheEntry = {
        value,
        expires,
        created: Date.now(),
      };

      this.cacheData.set(key, entry);

      const ttlSeconds =
        effectiveTtl > 0 ? Math.floor(effectiveTtl / 1000) : "never";
      console.error(`Cache set: ${key} (TTL: ${ttlSeconds}s)`);

      return true;
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
      const existed = this.cacheData.has(key);
      if (existed) {
        this.cacheData.delete(key);
        console.error(`Cache deleted: ${key}`);
        return 1;
      }
      return 0;
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
      this.cacheData.clear();

      // Also delete the cache file
      if (existsSync(this.cacheFile)) {
        try {
          require("fs").unlinkSync(this.cacheFile);
          console.error("Cache file deleted");
        } catch (error) {
          console.error("Failed to delete cache file:", error);
        }
      }

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

    const keys = this.keys();
    let ksize = 0;
    let vsize = 0;

    keys.forEach((key) => {
      const entry = this.cacheData.get(key);
      if (entry && entry.value !== undefined) {
        ksize += Buffer.byteLength(key, "utf8");
        vsize += Buffer.byteLength(JSON.stringify(entry.value), "utf8");
      }
    });

    return {
      keys: keys.length,
      hits: 0, // we don't track hits/misses
      misses: 0,
      ksize,
      vsize,
    };
  }

  /**
   * Get all cache keys
   */
  keys(): string[] {
    if (!this.enabled) {
      return [];
    }

    try {
      return Array.from(this.cacheData.keys());
    } catch (error) {
      console.error("Cache keys error:", error);
      return [];
    }
  }

  /**
   * Check if cache has a key
   */
  has(key: string): boolean {
    if (!this.enabled) {
      return false;
    }

    try {
      const entry = this.cacheData.get(key);
      if (!entry) {
        return false;
      }

      // Check TTL expiration
      if (entry.expires && Date.now() > entry.expires) {
        this.cacheData.delete(key);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`Cache has error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get TTL for a key (in milliseconds)
   */
  getTtl(key: string): number | undefined {
    if (!this.enabled) {
      return undefined;
    }

    try {
      const entry = this.cacheData.get(key);
      if (!entry || !entry.expires) {
        return undefined;
      }

      const remaining = entry.expires - Date.now();
      return remaining > 0 ? remaining : undefined;
    } catch (error) {
      console.error(`Cache getTtl error for key ${key}:`, error);
      return undefined;
    }
  }

  /**
   * Get cache size information
   */
  getSize(): number {
    return this.keys().length;
  }

  /**
   * Get cache memory usage (approximate)
   */
  getMemoryUsage(): number {
    const stats = this.getStats();
    return stats.vsize + stats.ksize;
  }

  /**
   * Prune expired entries manually
   */
  prune(): void {
    this.cleanExpired();
  }

  /**
   * Set cache enabled/disabled
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled && this.cacheData) {
      this.clear();
    } else if (enabled && !this.cacheData) {
      this.initializeCache();
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
      ttlSeconds: Math.floor(this.ttlMs / 1000),
      maxKeys: 1000, // We don't limit keys by default
    };
  }

  /**
   * Force persistence to disk
   */
  save(): void {
    this.persistToDisk();
  }

  /**
   * Create invalidation flag file to signal cache refresh needed
   */
  createInvalidationFlag(): void {
    if (!this.enabled) {
      return;
    }

    try {
      writeFileSync(this.invalidateFlag, "", "utf-8");
      console.error("Cache invalidation flag created");
    } catch (error) {
      console.error("Failed to create invalidation flag:", error);
    }
  }

  /**
   * Get cache directory path
   */
  getCacheDir(): string {
    return this.cacheDir;
  }

  /**
   * Clean expired entries
   */
  private cleanExpired(): void {
    if (!this.enabled) {
      return;
    }

    try {
      const keys = Array.from(this.cacheData.keys());
      const now = Date.now();
      let cleanedCount = 0;

      keys.forEach((key: string) => {
        const entry = this.cacheData.get(key);
        if (entry && entry.expires && now > entry.expires) {
          this.cacheData.delete(key);
          cleanedCount++;
        }
      });

      if (cleanedCount > 0) {
        console.error(`Cleaned ${cleanedCount} expired cache entries`);
      }
    } catch (error) {
      console.error("Cache cleanup error:", error);
    }
  }

  /**
   * Persist cache to disk
   */
  private loadFromDisk(): void {
    if (!existsSync(this.cacheFile)) {
      return; // No cache file exists yet
    }

    try {
      const data = readFileSync(this.cacheFile, "utf8");
      const cacheObject = JSON.parse(data);

      // Convert the object back to a Map
      this.cacheData = new Map(Object.entries(cacheObject));

      console.error(`Loaded ${this.cacheData.size} cache entries from disk`);
    } catch (error) {
      console.error("Cache load error:", error);
      this.cacheData = new Map(); // Start with empty cache on error
    }
  }

  private persistToDisk(): void {
    if (!this.enabled) {
      return;
    }

    try {
      // Clean expired entries before persisting
      this.cleanExpired();

      const cacheObject = Object.fromEntries(this.cacheData.entries());
      writeFileSync(
        this.cacheFile,
        JSON.stringify(cacheObject, null, 2),
        "utf8",
      );
    } catch (error) {
      console.error("Cache persistence error:", error);
    }
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
          if (this.cacheData.delete(key)) {
            deletedCount++;
          }
        }
      }

      if (deletedCount > 0) {
        console.error(
          `Cache invalidated ${deletedCount} keys matching pattern: ${pattern}`,
        );
      }

      return deletedCount;
    } catch (error) {
      console.error(
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
        if (this.cacheData.delete(key)) {
          deletedCount++;
        }
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

  /**
   * Clean up and save on shutdown
   */
  destroy(): void {
    if (this.enabled) {
      if (this.persistTimer) {
        clearInterval(this.persistTimer);
      }
      this.cleanExpired();
      this.persistToDisk();
    }
  }
}
