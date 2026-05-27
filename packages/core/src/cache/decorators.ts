import {
  CacheableOptions,
  CacheInvalidateOptions,
  CACHEABLE_METADATA_KEY,
  CACHE_INVALIDATE_METADATA_KEY,
  CACHE_CLEAR_METADATA_KEY,
} from './types.js';
import { CacheKeyGenerator } from './key-generator.js';
import { getGlobalCacheManager } from './cache-manager.js';

export function Cacheable(options: CacheableOptions = {}) {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheManager = getGlobalCacheManager();

      // Check condition
      if (options.condition && !options.condition(...args)) {
        return originalMethod.apply(this, args);
      }

      // Generate cache key
      let cacheKey: string;
      if (options.key) {
        cacheKey =
          typeof options.key === 'function'
            ? options.key(...args)
            : options.key;
      } else {
        const paramsHash = CacheKeyGenerator['hashParams'](...args);
        cacheKey = `${String(propertyKey)}:${paramsHash}`;
      }

      // Try to get from cache
      const cached = await cacheManager.get(cacheKey);
      if (cached !== null) {
        return cached;
      }

      // Call original method
      const result = await originalMethod.apply(this, args);

      // Store in cache
      await cacheManager.set(cacheKey, result, options.ttl);

      return result;
    };

    // Store metadata
    Reflect.defineMetadata(CACHEABLE_METADATA_KEY, options, descriptor.value);

    return descriptor;
  };
}

export function CacheInvalidate(options: CacheInvalidateOptions = {}) {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheManager = getGlobalCacheManager();

      // Check condition
      if (options.condition && !options.condition(...args)) {
        return originalMethod.apply(this, args);
      }

      // Call original method
      const result = await originalMethod.apply(this, args);

      // Invalidate cache
      if (options.key) {
        const cacheKey =
          typeof options.key === 'function'
            ? options.key(...args)
            : options.key;
        await cacheManager.del(cacheKey);
      }

      return result;
    };

    Reflect.defineMetadata(CACHE_INVALIDATE_METADATA_KEY, options, descriptor.value);

    return descriptor;
  };
}

export function CacheClear(pattern?: string) {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheManager = getGlobalCacheManager();

      // Call original method
      const result = await originalMethod.apply(this, args);

      // Clear cache
      await cacheManager.clear();

      return result;
    };

    Reflect.defineMetadata(CACHE_CLEAR_METADATA_KEY, pattern, descriptor.value);

    return descriptor;
  };
}

export function getCacheableMetadata(
  method: Function
): CacheableOptions | undefined {
  return Reflect.getMetadata(CACHEABLE_METADATA_KEY, method);
}

export function getCacheInvalidateMetadata(
  method: Function
): CacheInvalidateOptions | undefined {
  return Reflect.getMetadata(CACHE_INVALIDATE_METADATA_KEY, method);
}
