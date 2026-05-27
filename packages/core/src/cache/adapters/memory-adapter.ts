import { CacheAdapter, CacheEntry, CacheStats, MemoryCacheConfig } from '../types.js';

export class MemoryCacheAdapter implements CacheAdapter {
  name = 'memory';
  private store = new Map<string, CacheEntry>();
  private stats: CacheStats = { hits: 0, misses: 0, evictions: 0, size: 0 };
  private maxSize: number;
  private strategy: 'LRU' | 'FIFO';
  private accessOrder: string[] = [];

  constructor(config: MemoryCacheConfig = {}) {
    this.maxSize = config.maxSize || 1000;
    this.strategy = config.strategy || 'LRU';
  }

  async isConnected(): Promise<boolean> {
    return true;
  }

  async connect(): Promise<void> {
    // No connection needed for memory
  }

  async disconnect(): Promise<void> {
    this.store.clear();
    this.accessOrder = [];
  }

  async get<T = any>(key: string): Promise<T | null> {
    const entry = this.store.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check expiration
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      this.accessOrder = this.accessOrder.filter((k) => k !== key);
      this.stats.misses++;
      return null;
    }

    // Update access order for LRU
    if (this.strategy === 'LRU') {
      this.accessOrder = this.accessOrder.filter((k) => k !== key);
      this.accessOrder.push(key);
    }

    this.stats.hits++;
    return entry.value as T;
  }

  async set<T = any>(key: string, value: T, ttl?: number): Promise<void> {
    const expiresAt = ttl ? Date.now() + ttl * 1000 : Infinity;

    // Evict if necessary
    if (this.store.size >= this.maxSize && !this.store.has(key)) {
      const keyToEvict = this.accessOrder[0];

      if (keyToEvict) {
        this.store.delete(keyToEvict);
        this.accessOrder.shift();
        this.stats.evictions++;
      }
    }

    this.store.set(key, {
      value,
      expiresAt,
      createdAt: Date.now(),
      ttl,
    });

    // Track access order
    this.accessOrder = this.accessOrder.filter((k) => k !== key);
    this.accessOrder.push(key);
  }

  async del(key: string): Promise<boolean> {
    const existed = this.store.has(key);
    if (existed) {
      this.store.delete(key);
      this.accessOrder = this.accessOrder.filter((k) => k !== key);
    }
    return existed;
  }

  async clear(): Promise<void> {
    this.store.clear();
    this.accessOrder = [];
  }

  async exists(key: string): Promise<boolean> {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (entry.expiresAt < Date.now()) {
      await this.del(key);
      return false;
    }
    return true;
  }

  async getMany<T = any>(keys: string[]): Promise<(T | null)[]> {
    return Promise.all(keys.map((key) => this.get<T>(key)));
  }

  async setMany<T = any>(
    items: Array<{ key: string; value: T; ttl?: number }>
  ): Promise<void> {
    for (const item of items) {
      await this.set(item.key, item.value, item.ttl);
    }
  }

  async delMany(keys: string[]): Promise<number> {
    let count = 0;
    for (const key of keys) {
      if (await this.del(key)) count++;
    }
    return count;
  }

  async increment(key: string, by: number = 1): Promise<number> {
    const current = (await this.get<number>(key)) || 0;
    const newValue = current + by;
    await this.set(key, newValue);
    return newValue;
  }

  async decrement(key: string, by: number = 1): Promise<number> {
    return this.increment(key, -by);
  }

  async getStats(): Promise<CacheStats> {
    return {
      ...this.stats,
      size: this.store.size,
    };
  }

  async reset(): Promise<void> {
    await this.clear();
    this.stats = { hits: 0, misses: 0, evictions: 0, size: 0 };
  }

  startCleanup(intervalMs: number = 60000): NodeJS.Timer {
    return setInterval(async () => {
      const now = Date.now();
      const expiredKeys = Array.from(this.store.entries())
        .filter(([, entry]) => entry.expiresAt < now)
        .map(([key]) => key);

      for (const key of expiredKeys) {
        await this.del(key);
      }
    }, intervalMs);
  }
}
