import type { MiddlewareExecutor } from '../types.js';

/**
 * MiddlewareChainCache stores pre-compiled middleware execution plans by route token.
 * Uses a simple Map-based cache with no TTL (lives for the duration of the application).
 * Enables efficient re-execution of middleware chains without recompiling on each request.
 */
export class MiddlewareChainCache {
  private cache: Map<string, MiddlewareExecutor[]> = new Map();

  /**
   * Retrieve a cached middleware chain for the given route token.
   * Returns undefined if the route token is not in the cache.
   */
  get(routeToken: string): MiddlewareExecutor[] | undefined {
    return this.cache.get(routeToken);
  }

  /**
   * Store a middleware chain for the given route token.
   * Overwrites any existing chain for the same token.
   */
  set(routeToken: string, chain: MiddlewareExecutor[]): void {
    this.cache.set(routeToken, chain);
  }

  /**
   * Check if a route token exists in the cache.
   */
  has(routeToken: string): boolean {
    return this.cache.has(routeToken);
  }

  /**
   * Clear all cached middleware chains.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get the number of cached middleware chains.
   */
  size(): number {
    return this.cache.size;
  }
}
