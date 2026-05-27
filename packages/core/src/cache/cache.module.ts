import { CacheManager } from './cache-manager.js';
import { MemoryCacheAdapter } from './adapters/memory-adapter.js';
import { RedisCacheAdapter } from './adapters/redis-adapter.js';
import { CacheConfig, RedisCacheConfig, MemoryCacheConfig } from './types.js';
import { setGlobalCacheManager } from './cache-manager.js';

export interface CacheModuleOptions {
  type: 'memory' | 'redis';
  config?: CacheConfig;
  memoryConfig?: MemoryCacheConfig;
  redisConfig?: RedisCacheConfig;
  global?: boolean;
}

export function CacheModule(options: CacheModuleOptions) {
  return {
    module: 'CacheModule',
    providers: [
      {
        provide: CacheManager,
        useFactory: async () => {
          let manager: CacheManager;

          if (options.type === 'memory') {
            const adapter = new MemoryCacheAdapter(options.memoryConfig);
            manager = new CacheManager(adapter, options.config);
          } else {
            const adapter = new RedisCacheAdapter(options.redisConfig);
            manager = new CacheManager(adapter, options.config);
            await manager.connect();
          }

          if (options.global) {
            setGlobalCacheManager(manager);
          }

          return manager;
        },
      },
    ],
    exports: [CacheManager],
  };
}

export class CacheModuleBuilder {
  private options: CacheModuleOptions = {
    type: 'memory',
    global: true,
  };

  setType(type: 'memory' | 'redis'): this {
    this.options.type = type;
    return this;
  }

  setMemoryConfig(config: MemoryCacheConfig): this {
    this.options.memoryConfig = config;
    return this;
  }

  setRedisConfig(config: RedisCacheConfig): this {
    this.options.redisConfig = config;
    return this;
  }

  setConfig(config: CacheConfig): this {
    this.options.config = config;
    return this;
  }

  setGlobal(global: boolean): this {
    this.options.global = global;
    return this;
  }

  build(): any {
    return CacheModule(this.options);
  }
}
