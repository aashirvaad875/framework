import Redis from 'ioredis';
import { CacheAdapter, CacheEntry, CacheStats, RedisCacheConfig } from '../types.js';

export class RedisCacheAdapter implements CacheAdapter {
  name = 'redis';
  private client: Redis | null = null;
  private config: RedisCacheConfig;
  private stats: CacheStats = { hits: 0, misses: 0, evictions: 0, size: 0 };

  constructor(config: RedisCacheConfig = {}) {
    this.config = config;
  }

  async isConnected(): Promise<boolean> {
    if (!this.client) return false;
    try {
      await this.client.ping();
      return true;
    } catch {
      return false;
    }
  }

  async connect(): Promise<void> {
    if (this.client) return;

    const redisOptions = {
      host: this.config.host || 'localhost',
      port: this.config.port || 6379,
      password: this.config.password,
      db: this.config.db || 0,
      retryStrategy: this.config.retryStrategy || this.defaultRetryStrategy,
      ...(this.config.tls && { tls: {} }),
    };

    this.client = new Redis(redisOptions);

    return new Promise((resolve, reject) => {
      this.client!.on('ready', () => resolve());
      this.client!.on('error', (err) => reject(err));
    });
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
  }

  async get<T = any>(key: string): Promise<T | null> {
    if (!this.client) throw new Error('Redis not connected');

    const data = await this.client.get(key);
    if (!data) {
      this.stats.misses++;
      return null;
    }

    try {
      this.stats.hits++;
      return JSON.parse(data) as T;
    } catch {
      return data as any;
    }
  }

  async set<T = any>(key: string, value: T, ttl?: number): Promise<void> {
    if (!this.client) throw new Error('Redis not connected');

    const serialized = typeof value === 'string' ? value : JSON.stringify(value);

    if (ttl) {
      await this.client.setex(key, ttl, serialized);
    } else {
      await this.client.set(key, serialized);
    }
  }

  async del(key: string): Promise<boolean> {
    if (!this.client) throw new Error('Redis not connected');

    const result = await this.client.del(key);
    return result > 0;
  }

  async clear(): Promise<void> {
    if (!this.client) throw new Error('Redis not connected');

    await this.client.flushdb();
  }

  async exists(key: string): Promise<boolean> {
    if (!this.client) throw new Error('Redis not connected');

    const result = await this.client.exists(key);
    return result > 0;
  }

  async getMany<T = any>(keys: string[]): Promise<(T | null)[]> {
    if (!this.client) throw new Error('Redis not connected');

    if (keys.length === 0) return [];

    const values = await this.client.mget(...keys);
    return values.map((v) => {
      if (!v) return null;
      try {
        return JSON.parse(v) as T;
      } catch {
        return v as any;
      }
    });
  }

  async setMany<T = any>(
    items: Array<{ key: string; value: T; ttl?: number }>
  ): Promise<void> {
    if (!this.client) throw new Error('Redis not connected');

    const pipeline = this.client.pipeline();

    for (const item of items) {
      const serialized =
        typeof item.value === 'string'
          ? item.value
          : JSON.stringify(item.value);

      if (item.ttl) {
        pipeline.setex(item.key, item.ttl, serialized);
      } else {
        pipeline.set(item.key, serialized);
      }
    }

    await pipeline.exec();
  }

  async delMany(keys: string[]): Promise<number> {
    if (!this.client) throw new Error('Redis not connected');

    if (keys.length === 0) return 0;

    return this.client.del(...keys);
  }

  async increment(key: string, by: number = 1): Promise<number> {
    if (!this.client) throw new Error('Redis not connected');

    if (by === 1) {
      return this.client.incr(key);
    } else {
      return this.client.incrby(key, by);
    }
  }

  async decrement(key: string, by: number = 1): Promise<number> {
    if (!this.client) throw new Error('Redis not connected');

    if (by === 1) {
      return this.client.decr(key);
    } else {
      return this.client.decrby(key, by);
    }
  }

  async getStats(): Promise<CacheStats> {
    if (!this.client) {
      return this.stats;
    }

    try {
      const dbInfo = await this.client.dbsize();

      return {
        hits: this.stats.hits,
        misses: this.stats.misses,
        evictions: this.stats.evictions,
        size: dbInfo,
      };
    } catch {
      return { ...this.stats, size: 0 };
    }
  }

  async reset(): Promise<void> {
    await this.clear();
    this.stats = { hits: 0, misses: 0, evictions: 0, size: 0 };
  }

  private defaultRetryStrategy = (times: number): number => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  };
}
