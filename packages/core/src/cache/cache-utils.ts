import { CacheManager } from './cache-manager.js';

export class CacheUtils {
  constructor(private cacheManager: CacheManager) {}

  async invalidatePattern(pattern: string): Promise<void> {
    const adapter = this.cacheManager.getAdapter();

    if (adapter.name === 'redis') {
      const client = (adapter as any).client;
      if (client) {
        const keys = await client.keys(pattern);
        if (keys.length > 0) {
          await this.cacheManager.delMany(keys);
        }
      }
    } else {
      await this.cacheManager.clear();
    }
  }

  async warmCache<T>(
    keys: string[],
    fetcher: (key: string) => Promise<T>,
    ttl?: number
  ): Promise<void> {
    const promises = keys.map(async (key) => {
      const value = await fetcher(key);
      await this.cacheManager.set(key, value, ttl);
    });

    await Promise.all(promises);
  }

  async getHitRate(): Promise<{ hits: number; misses: number; rate: number }> {
    const stats = await this.cacheManager.getStats();
    const total = stats.hits + stats.misses;
    const rate = total === 0 ? 0 : (stats.hits / total) * 100;

    return {
      hits: stats.hits,
      misses: stats.misses,
      rate,
    };
  }

  async getCacheSize(): Promise<number> {
    const stats = await this.cacheManager.getStats();
    return stats.size;
  }
}
