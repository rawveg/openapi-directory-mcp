"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheManager = void 0;
const node_cache_1 = require("node-cache");
const constants_js_1 = require("../utils/constants.js");
const validation_js_1 = require("../utils/validation.js");
const errors_js_1 = require("../utils/errors.js");
class CacheManager {
    constructor(ttlMs = constants_js_1.CACHE_TTL.DEFAULT) {
        this.enabled = process.env.DISABLE_CACHE !== "true";
        this.cache = new node_cache_1.default({
            stdTTL: Math.floor(ttlMs / 1000), // NodeCache uses seconds
            checkperiod: Math.floor((ttlMs / 1000) * constants_js_1.CACHE_LIMITS.CHECK_PERIOD_RATIO), // Check every 10% of TTL
            useClones: false, // Better performance, but be careful with mutations
            deleteOnExpire: true,
            maxKeys: constants_js_1.CACHE_LIMITS.MAX_KEYS,
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
     * Get value from cache with validation
     */
    get(key) {
        if (!this.enabled) {
            return undefined;
        }
        try {
            const wrappedValue = this.cache.get(key);
            if (wrappedValue !== undefined) {
                // Validate cache entry integrity
                if (!this.validateCacheEntry(key, wrappedValue)) {
                    console.error(`Cache corruption detected for key: ${key}`);
                    this.delete(key);
                    return undefined;
                }
                console.error(`Cache hit: ${key}`);
                // Return the unwrapped value
                return wrappedValue.value;
            }
            return undefined;
        }
        catch (error) {
            const cacheError = new errors_js_1.CacheError(`Cache get error for key ${key}`, {
                operation: "get",
                details: {
                    key,
                    error: error instanceof Error ? error.message : String(error),
                },
            });
            errors_js_1.ErrorHandler.logError(cacheError);
            return undefined;
        }
    }
    /**
     * Set value in cache with enhanced metadata
     */
    set(key, value, ttlMs) {
        if (!this.enabled) {
            return false;
        }
        try {
            // Wrap value with metadata for validation
            const wrappedValue = {
                value,
                timestamp: new Date().toISOString(),
                integrity: validation_js_1.CacheValidator.generateIntegrityHash(value),
            };
            const success = ttlMs
                ? this.cache.set(key, wrappedValue, Math.max(1, Math.floor(ttlMs / 1000)))
                : this.cache.set(key, wrappedValue);
            if (success) {
                const ttlSeconds = ttlMs
                    ? Math.max(1, Math.floor(ttlMs / 1000))
                    : "default";
                console.error(`Cache set: ${key} (TTL: ${ttlSeconds}s)`);
            }
            return success;
        }
        catch (error) {
            const cacheError = new errors_js_1.CacheError(`Cache set error for key ${key}`, {
                operation: "set",
                details: {
                    key,
                    error: error instanceof Error ? error.message : String(error),
                },
            });
            errors_js_1.ErrorHandler.logError(cacheError);
            return false;
        }
    }
    /**
     * Delete value from cache
     */
    delete(key) {
        if (!this.enabled) {
            return 0;
        }
        try {
            const deleted = this.cache.del(key);
            if (deleted > 0) {
                console.error(`Cache deleted: ${key}`);
            }
            return deleted;
        }
        catch (error) {
            console.error(`Cache delete error for key ${key}:`, error);
            return 0;
        }
    }
    /**
     * Clear all cache entries
     */
    clear() {
        if (!this.enabled) {
            return;
        }
        try {
            this.cache.flushAll();
            console.error("Cache cleared");
        }
        catch (error) {
            console.error("Cache clear error:", error);
        }
    }
    /**
     * Get cache statistics
     */
    getStats() {
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
    keys() {
        if (!this.enabled) {
            return [];
        }
        return this.cache.keys();
    }
    /**
     * Check if cache has a key
     */
    has(key) {
        if (!this.enabled) {
            return false;
        }
        return this.cache.has(key);
    }
    /**
     * Get TTL for a key (in seconds)
     */
    getTtl(key) {
        if (!this.enabled) {
            return undefined;
        }
        return this.cache.getTtl(key);
    }
    /**
     * Get cache size information
     */
    getSize() {
        if (!this.enabled) {
            return 0;
        }
        return this.cache.keys().length;
    }
    /**
     * Get cache memory usage (approximate)
     */
    getMemoryUsage() {
        if (!this.enabled) {
            return 0;
        }
        const stats = this.cache.getStats();
        return stats.vsize + stats.ksize;
    }
    /**
     * Prune expired entries manually
     */
    prune() {
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
    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled) {
            this.clear();
        }
    }
    /**
     * Check if cache is enabled
     */
    isEnabled() {
        return this.enabled;
    }
    /**
     * Get cache configuration
     */
    getConfig() {
        return {
            enabled: this.enabled,
            ttlSeconds: this.cache.options.stdTTL || 86400,
            maxKeys: this.cache.options.maxKeys || 1000,
        };
    }
    /**
     * Invalidate cache keys matching a pattern (supports * wildcard)
     */
    invalidatePattern(pattern) {
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
                console.error(`Cache invalidated ${deletedCount} keys matching pattern: ${pattern}`);
            }
            return deletedCount;
        }
        catch (error) {
            console.error(`Cache invalidatePattern error for pattern ${pattern}:`, error);
            return 0;
        }
    }
    /**
     * Invalidate multiple specific cache keys
     */
    invalidateKeys(keys) {
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
        }
        catch (error) {
            console.error(`Cache invalidateKeys error:`, error);
            return 0;
        }
    }
    /**
     * Cache warming - fetch data and store it in cache
     */
    async warmCache(key, fetchFn, ttlMs) {
        if (!this.enabled) {
            // If cache is disabled, just fetch and return the data
            return await fetchFn();
        }
        try {
            // Check if we already have fresh data
            const cached = this.get(key);
            if (cached !== undefined) {
                return cached;
            }
            // Fetch fresh data
            console.error(`Cache warming: ${key}`);
            const data = await fetchFn();
            // Store in cache
            this.set(key, data, ttlMs);
            return data;
        }
        catch (error) {
            console.error(`Cache warmCache error for key ${key}:`, error);
            // On error, try to fetch without caching
            return await fetchFn();
        }
    }
    /**
     * Validate cache entry integrity
     */
    validateCacheEntry(key, wrappedValue) {
        try {
            // Check if it's a wrapped value with metadata
            if (!wrappedValue || typeof wrappedValue !== "object") {
                return false;
            }
            // For backward compatibility, allow unwrapped values
            if (!wrappedValue.value &&
                !wrappedValue.timestamp &&
                !wrappedValue.integrity) {
                return true; // Old format, assume valid
            }
            // Use cache validator for integrity check
            if (!validation_js_1.CacheValidator.validateCacheEntry(key, wrappedValue)) {
                return false;
            }
            // Verify integrity hash if present
            if (wrappedValue.integrity) {
                return validation_js_1.CacheValidator.verifyCacheIntegrity(wrappedValue.value, wrappedValue.integrity);
            }
            return true;
        }
        catch (error) {
            console.error(`Cache validation error for key ${key}:`, error);
            return false;
        }
    }
    /**
     * Perform cache health check and cleanup
     */
    performHealthCheck() {
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
        console.error(`Cache health check: ${cleanedKeys} corrupted entries cleaned out of ${keys.length} total`);
        return {
            totalKeys: keys.length,
            corruptedKeys,
            cleanedKeys,
            memoryUsage,
        };
    }
}
exports.CacheManager = CacheManager;
