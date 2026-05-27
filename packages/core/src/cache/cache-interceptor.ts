import { CacheManager } from './cache-manager.js';
import { CacheKeyGenerator } from './key-generator.js';

export type ExecutionContext = any; // Imported from http context

export interface CacheInterceptorOptions {
  ttl?: number;
  condition?: (context: ExecutionContext) => boolean;
  keyBuilder?: (context: ExecutionContext) => string;
}

export class CacheInterceptor {
  constructor(
    private cacheManager: CacheManager,
    private options: CacheInterceptorOptions = {}
  ) {}

  async intercept(
    context: ExecutionContext,
    next: (context?: ExecutionContext) => Promise<any>
  ): Promise<any> {
    const req = context.getRequest();
    const res = context.getResponse();

    // Only cache GET requests
    if (req.method !== 'GET') {
      return next(context);
    }

    // Check condition
    if (this.options.condition && !this.options.condition(context)) {
      return next(context);
    }

    // Generate cache key
    const cacheKey = this.options.keyBuilder
      ? this.options.keyBuilder(context)
      : this.buildDefaultKey(req);

    // Try to get from cache
    const cached = await this.cacheManager.get(cacheKey);
    if (cached !== null) {
      // Set cache hit header
      res.set('X-Cache', 'HIT');
      return cached;
    }

    // Call handler
    const result = await next(context);

    // Cache successful responses
    if (res.statusCode === 200) {
      await this.cacheManager.set(cacheKey, result, this.options.ttl);
      res.set('X-Cache', 'MISS');
    }

    return result;
  }

  private buildDefaultKey(req: any): string {
    const queryString = req.url.includes('?') ? req.url.split('?')[1] : '';
    return CacheKeyGenerator.generate(
      undefined,
      `route:${req.method}:${req.path}:${queryString}`
    );
  }
}

export function createCacheInterceptor(
  cacheManager: CacheManager,
  options?: CacheInterceptorOptions
): CacheInterceptor {
  return new CacheInterceptor(cacheManager, options);
}
