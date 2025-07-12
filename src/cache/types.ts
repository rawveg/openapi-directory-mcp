/**
 * Common interface for cache managers
 */
export interface ICacheManager {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, ttlMs?: number): boolean;
  delete(key: string): number;
  clear(): void;
  getStats(): {
    keys: number;
    hits: number;
    misses: number;
    ksize: number;
    vsize: number;
  };
  keys(): string[];
  has(key: string): boolean;
  getTtl(key: string): number | undefined;
  getSize(): number;
  getMemoryUsage(): number;
  prune(): void;
  setEnabled(enabled: boolean): void;
  isEnabled(): boolean;
  getConfig(): {
    enabled: boolean;
    ttlSeconds: number;
    maxKeys: number;
  };

  // Optional methods for specific implementations
  getCacheDir?(): string;
  destroy?(): void;
}
