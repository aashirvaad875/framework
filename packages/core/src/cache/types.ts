export interface CacheEntry<T = any> {
  value: T;
  expiresAt: number;
  createdAt: number;
  ttl?: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
}

export interface CacheAdapter {
  name: string;
  isConnected(): Promise<boolean>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;

  get<T = any>(key: string): Promise<T | null>;
  set<T = any>(key: string, value: T, ttl?: number): Promise<void>;
  del(key: string): Promise<boolean>;
  clear(): Promise<void>;
  exists(key: string): Promise<boolean>;

  getMany<T = any>(keys: string[]): Promise<(T | null)[]>;
  setMany<T = any>(items: Array<{ key: string; value: T; ttl?: number }>): Promise<void>;
  delMany(keys: string[]): Promise<number>;

  increment(key: string, by?: number): Promise<number>;
  decrement(key: string, by?: number): Promise<number>;

  getStats(): Promise<CacheStats>;
  reset(): Promise<void>;
}

export interface CacheConfig {
  ttl?: number; // Default TTL in seconds
  namespace?: string; // Key prefix
}

export interface MemoryCacheConfig extends CacheConfig {
  maxSize?: number; // Max entries
  strategy?: 'LRU' | 'FIFO'; // Eviction strategy
}

export interface RedisCacheConfig extends CacheConfig {
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  tls?: boolean;
  retryStrategy?: (times: number) => number;
}

export interface CacheableOptions {
  ttl?: number;
  key?: string | ((...args: any[]) => string); // Custom key or function
  condition?: (...args: any[]) => boolean; // Conditional caching
}

export interface CacheInvalidateOptions {
  key?: string | ((...args: any[]) => string);
  condition?: (...args: any[]) => boolean;
}

export const CACHEABLE_METADATA_KEY = Symbol('cacheable:metadata');
export const CACHE_INVALIDATE_METADATA_KEY = Symbol('cache-invalidate:metadata');
export const CACHE_CLEAR_METADATA_KEY = Symbol('cache-clear:metadata');
