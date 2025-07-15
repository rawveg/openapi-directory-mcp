# Cache Implementation Strategy

## Overview

The caching layer is crucial for performance, reducing API calls to APIs.guru, and providing offline capability. This document outlines the complete caching strategy with 24-hour TTL and efficient cache management.

## Cache Architecture

### Cache Storage Backend

#### File-Based Cache
- **Location**: `~/.cache/openapi-directory-mcp/`
- **Format**: JSON files with metadata
- **Benefits**: Simple, no external dependencies, persistent across restarts
- **Limitations**: Not suitable for high-concurrency scenarios

#### Cache Directory Structure
```
~/.cache/openapi-directory-mcp/
├── meta.json                    # Cache metadata and configuration
├── index.json                   # Cache index with TTL tracking
└── data/
    ├── providers.json           # getProviders cache
    ├── provider-{name}.json     # getProvider cache per provider
    ├── services-{provider}.json # getServices cache per provider
    ├── api-{provider}-{api}.json          # getAPI cache
    ├── api-{provider}-{service}-{api}.json # getServiceAPI cache
    ├── list.json                # listAPIs cache
    └── metrics.json             # getMetrics cache
```

## Cache Key Generation

### Key Patterns
```typescript
interface CacheKeyPatterns {
  providers: 'providers';
  provider: 'provider:{provider}';
  services: 'services:{provider}';
  api: 'api:{provider}:{api}';
  serviceApi: 'api:{provider}:{service}:{api}';
  list: 'list';
  metrics: 'metrics';
}
```

### Key Generation Logic
```typescript
class CacheKeyGenerator {
  static forProviders(): string {
    return 'providers';
  }
  
  static forProvider(provider: string): string {
    return `provider:${this.sanitize(provider)}`;
  }
  
  static forServices(provider: string): string {
    return `services:${this.sanitize(provider)}`;
  }
  
  static forAPI(provider: string, api: string): string {
    return `api:${this.sanitize(provider)}:${this.sanitize(api)}`;
  }
  
  static forServiceAPI(provider: string, service: string, api: string): string {
    return `api:${this.sanitize(provider)}:${this.sanitize(service)}:${this.sanitize(api)}`;
  }
  
  static forList(): string {
    return 'list';
  }
  
  static forMetrics(): string {
    return 'metrics';
  }
  
  private static sanitize(value: string): string {
    return value.replace(/[^a-zA-Z0-9.-]/g, '_');
  }
}
```

## Cache Entry Structure

### Cache Entry Format
```typescript
interface CacheEntry<T = any> {
  key: string;
  data: T;
  timestamp: number;
  ttl: number;
  etag?: string;
  lastModified?: string;
  size: number;
  accessCount: number;
  lastAccessed: number;
}
```

### Cache Index
```typescript
interface CacheIndex {
  version: string;
  created: number;
  lastCleanup: number;
  entries: {
    [key: string]: {
      timestamp: number;
      ttl: number;
      size: number;
      accessCount: number;
      lastAccessed: number;
    };
  };
}
```

## TTL Management

### TTL Configuration
```typescript
interface TTLConfig {
  providers: 24 * 60 * 60 * 1000;     // 24 hours
  provider: 24 * 60 * 60 * 1000;      // 24 hours
  services: 24 * 60 * 60 * 1000;      // 24 hours
  api: 24 * 60 * 60 * 1000;           // 24 hours
  serviceApi: 24 * 60 * 60 * 1000;    // 24 hours
  list: 24 * 60 * 60 * 1000;          // 24 hours
  metrics: 60 * 60 * 1000;            // 1 hour (metrics change frequently)
}
```

### TTL Validation
```typescript
class TTLValidator {
  static isValid(entry: CacheEntry, currentTime: number = Date.now()): boolean {
    return (currentTime - entry.timestamp) < entry.ttl;
  }
  
  static getRemainingTTL(entry: CacheEntry, currentTime: number = Date.now()): number {
    return Math.max(0, entry.ttl - (currentTime - entry.timestamp));
  }
  
  static isExpired(entry: CacheEntry, currentTime: number = Date.now()): boolean {
    return !this.isValid(entry, currentTime);
  }
}
```

## Cache Operations

### Read Operation
```typescript
async read<T>(key: string): Promise<T | null> {
  const entry = await this.getEntry<T>(key);
  if (!entry) return null;
  
  if (TTLValidator.isExpired(entry)) {
    await this.invalidate(key);
    return null;
  }
  
  // Update access statistics
  await this.updateAccessStats(key);
  
  return entry.data;
}
```

### Write Operation
```typescript
async write<T>(key: string, data: T, ttl?: number): Promise<void> {
  const entry: CacheEntry<T> = {
    key,
    data,
    timestamp: Date.now(),
    ttl: ttl || this.getTTLForKey(key),
    size: this.calculateSize(data),
    accessCount: 0,
    lastAccessed: Date.now()
  };
  
  await this.storeEntry(entry);
  await this.updateIndex(key, entry);
}
```

### Invalidation Operation
```typescript
async invalidate(key: string): Promise<void> {
  await this.removeEntry(key);
  await this.removeFromIndex(key);
}
```

## Cache Cleanup

### Cleanup Strategy
1. **Startup Cleanup**: Remove expired entries on server start
2. **Periodic Cleanup**: Clean expired entries every 6 hours
3. **Size-Based Cleanup**: Remove LRU entries when cache exceeds size limit

### Cleanup Implementation
```typescript
class CacheCleanup {
  private static readonly MAX_CACHE_SIZE = 100 * 1024 * 1024; // 100MB
  private static readonly CLEANUP_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours
  
  async performCleanup(): Promise<void> {
    const index = await this.loadIndex();
    const currentTime = Date.now();
    
    // Remove expired entries
    await this.removeExpiredEntries(index, currentTime);
    
    // Check size limit
    const totalSize = this.calculateTotalSize(index);
    if (totalSize > CacheCleanup.MAX_CACHE_SIZE) {
      await this.performLRUCleanup(index);
    }
    
    // Update cleanup timestamp
    index.lastCleanup = currentTime;
    await this.saveIndex(index);
  }
  
  private async removeExpiredEntries(index: CacheIndex, currentTime: number): Promise<void> {
    const expiredKeys = Object.keys(index.entries).filter(key => {
      const entry = index.entries[key];
      return (currentTime - entry.timestamp) > entry.ttl;
    });
    
    for (const key of expiredKeys) {
      await this.invalidate(key);
    }
  }
  
  private async performLRUCleanup(index: CacheIndex): Promise<void> {
    const entries = Object.entries(index.entries)
      .sort(([,a], [,b]) => a.lastAccessed - b.lastAccessed);
    
    let totalSize = this.calculateTotalSize(index);
    const targetSize = CacheCleanup.MAX_CACHE_SIZE * 0.8; // Clean to 80% capacity
    
    for (const [key, entry] of entries) {
      if (totalSize <= targetSize) break;
      
      await this.invalidate(key);
      totalSize -= entry.size;
    }
  }
}
```

## Error Handling

### Cache Errors
```typescript
class CacheErrorHandler {
  static async handleCacheError(error: Error, operation: string, key: string): Promise<void> {
    console.error(`Cache ${operation} failed for key ${key}:`, error);
    
    if (error.code === 'ENOENT') {
      // File not found - normal for cache misses
      return;
    }
    
    if (error.code === 'EACCES') {
      // Permission denied - try to recover
      await this.recoverFromPermissionError(key);
      return;
    }
    
    // For other errors, log and continue
    console.warn(`Cache operation ${operation} failed, continuing without cache`);
  }
  
  private static async recoverFromPermissionError(key: string): Promise<void> {
    // Attempt to recreate cache directory with proper permissions
    const cacheDir = path.dirname(this.getCacheFilePath(key));
    await fs.mkdir(cacheDir, { recursive: true, mode: 0o755 });
  }
}
```

## Performance Optimizations

### Lazy Loading
```typescript
class LazyCache {
  private indexCache: CacheIndex | null = null;
  
  async getIndex(): Promise<CacheIndex> {
    if (!this.indexCache) {
      this.indexCache = await this.loadIndex();
    }
    return this.indexCache;
  }
  
  invalidateIndexCache(): void {
    this.indexCache = null;
  }
}
```

### Batch Operations
```typescript
class BatchCacheOperations {
  async batchRead<T>(keys: string[]): Promise<Map<string, T | null>> {
    const results = new Map<string, T | null>();
    const promises = keys.map(async (key) => {
      const result = await this.read<T>(key);
      results.set(key, result);
    });
    
    await Promise.all(promises);
    return results;
  }
  
  async batchWrite<T>(entries: Array<{ key: string; data: T; ttl?: number }>): Promise<void> {
    const promises = entries.map(entry => 
      this.write(entry.key, entry.data, entry.ttl)
    );
    
    await Promise.all(promises);
  }
}
```

## Monitoring and Metrics

### Cache Statistics
```typescript
interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalSize: number;
  entryCount: number;
  oldestEntry: number;
  newestEntry: number;
  cleanupCount: number;
  lastCleanup: number;
}

class CacheMonitor {
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    totalSize: 0,
    entryCount: 0,
    oldestEntry: 0,
    newestEntry: 0,
    cleanupCount: 0,
    lastCleanup: 0
  };
  
  recordHit(): void {
    this.stats.hits++;
    this.updateHitRate();
  }
  
  recordMiss(): void {
    this.stats.misses++;
    this.updateHitRate();
  }
  
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }
  
  getStats(): CacheStats {
    return { ...this.stats };
  }
}
```

## Testing Strategy

### Unit Tests
- Cache entry creation and validation
- TTL calculation and validation
- Key generation and sanitization
- Cleanup operations

### Integration Tests
- End-to-end cache operations
- Cache persistence across restarts
- Error recovery scenarios
- Performance benchmarks

### Mock Implementation
```typescript
class MockCache implements CacheInterface {
  private store = new Map<string, CacheEntry>();
  
  async read<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry || TTLValidator.isExpired(entry)) {
      return null;
    }
    return entry.data;
  }
  
  async write<T>(key: string, data: T, ttl?: number): Promise<void> {
    const entry: CacheEntry<T> = {
      key,
      data,
      timestamp: Date.now(),
      ttl: ttl || 24 * 60 * 60 * 1000,
      size: JSON.stringify(data).length,
      accessCount: 0,
      lastAccessed: Date.now()
    };
    this.store.set(key, entry);
  }
  
  async invalidate(key: string): Promise<void> {
    this.store.delete(key);
  }
  
  async clear(): Promise<void> {
    this.store.clear();
  }
}
```