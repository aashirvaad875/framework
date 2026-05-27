import { CacheAdapter, CacheConfig, CacheStats } from './types.js';
import { MemoryCacheAdapter } from './adapters/memory-adapter.js';
import { RedisCacheAdapter } from './adapters/redis-adapter.js';
import { CacheKeyGenerator } from './key-generator.js';

export class CacheManager {
  private adapter: CacheAdapter;
  private config: CacheConfig;

  constructor(adapter: CacheAdapter, config: CacheConfig = {}) {
    this.adapter = adapter;
    this.config = {
      ttl: 3600, // 1 hour default
      ...config,
    };
  }

  static createMemory(config?: CacheConfig): CacheManager {
    const adapter = new MemoryCacheAdapter({
      maxSize: 1000,
      strategy: 'LRU',
    });
    return new CacheManager(adapter, config);
  }

  static createRedis(config?: CacheConfig): CacheManager {
    const adapter = new RedisCacheAdapter({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    });
    return new CacheManager(adapter, config);
  }

  async isConnected(): Promise<boolean> {
    return this.adapter.isConnected();
  }

  async connect(): Promise<void> {
    return this.adapter.connect();
  }

  async disconnect(): Promise<void> {
    return this.adapter.disconnect();
  }

  async get<T = any>(key: string): Promise<T | null> {
    const fullKey = this.buildKey(key);
    return this.adapter.get<T>(fullKey);
  }

  async set<T = any>(key: string, value: T, ttl?: number): Promise<void> {
    const fullKey = this.buildKey(key);
    const finalTtl = ttl ?? this.config.ttl;
    return this.adapter.set(fullKey, value, finalTtl);
  }

  async del(key: string): Promise<boolean> {
    const fullKey = this.buildKey(key);
    return this.adapter.del(fullKey);
  }

  async clear(): Promise<void> {
    return this.adapter.clear();
  }

  async exists(key: string): Promise<boolean> {
    const fullKey = this.buildKey(key);
    return this.adapter.exists(fullKey);
  }

  async getMany<T = any>(keys: string[]): Promise<(T | null)[]> {
    const fullKeys = keys.map((k) => this.buildKey(k));
    return this.adapter.getMany<T>(fullKeys);
  }

  async setMany<T = any>(
    items: Array<{ key: string; value: T; ttl?: number }>
  ): Promise<void> {
    const mappedItems = items.map((item) => ({
      key: this.buildKey(item.key),
      value: item.value,
      ttl: item.ttl ?? this.config.ttl,
    }));
    return this.adapter.setMany(mappedItems);
  }

  async delMany(keys: string[]): Promise<number> {
    const fullKeys = keys.map((k) => this.buildKey(k));
    return this.adapter.delMany(fullKeys);
  }

  async increment(key: string, by?: number): Promise<number> {
    const fullKey = this.buildKey(key);
    return this.adapter.increment(fullKey, by);
  }

  async decrement(key: string, by?: number): Promise<number> {
    const fullKey = this.buildKey(key);
    return this.adapter.decrement(fullKey, by);
  }

  async getStats(): Promise<CacheStats> {
    return this.adapter.getStats();
  }

  async reset(): Promise<void> {
    return this.adapter.reset();
  }

  async remember<T>(
    key: string,
    fn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const value = await fn();
    await this.set(key, value, ttl);
    return value;
  }

  async rememberMany<T>(
    keys: string[],
    fn: (missingKeys: string[]) => Promise<Map<string, T>>,
    ttl?: number
  ): Promise<Map<string, T>> {
    const cached = await this.getMany<T>(keys);
    const result = new Map<string, T>();
    const missingKeys: string[] = [];

    for (let i = 0; i < keys.length; i++) {
      if (cached[i] !== null) {
        result.set(keys[i], cached[i]!);
      } else {
        missingKeys.push(keys[i]);
      }
    }

    if (missingKeys.length > 0) {
      const fetched = await fn(missingKeys);
      const toSet = Array.from(fetched.entries()).map(([key, value]) => ({
        key,
        value,
        ttl,
      }));
      await this.setMany(toSet);
      fetched.forEach((value, key) => result.set(key, value));
    }

    return result;
  }

  private buildKey(key: string): string {
    return CacheKeyGenerator.generate(this.config.namespace, key);
  }

  getAdapter(): CacheAdapter {
    return this.adapter;
  }

  getConfig(): CacheConfig {
    return this.config;
  }
}

let globalCacheManager: CacheManager | null = null;

export function setGlobalCacheManager(manager: CacheManager): void {
  globalCacheManager = manager;
}

export function getGlobalCacheManager(): CacheManager {
  if (!globalCacheManager) {
    globalCacheManager = CacheManager.createMemory();
  }
  return globalCacheManager;
}
