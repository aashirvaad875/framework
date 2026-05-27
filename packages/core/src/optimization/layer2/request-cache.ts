import type { CachedResponse } from '../types.js';

/**
 * RequestCache stores ETag-based GET response caches with TTL-based expiration.
 * Supports wildcard pattern-based invalidation for related cache entries.
 */
export class RequestCache {
  private cache: Map<string, CachedResponse> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Retrieve a cached response by key.
   * Returns undefined if the entry is expired or does not exist.
   * Automatically cleans up expired entries.
   */
  get(key: string): CachedResponse | undefined {
    const response = this.cache.get(key);

    if (!response) {
      return undefined;
    }

    // Check if response has expired
    if (response.expiresAt <= Date.now()) {
      this.removeEntry(key);
      return undefined;
    }

    return response;
  }

  /**
   * Store a response in cache with TTL-based expiration.
   * Sets up automatic cleanup timer that removes the entry when TTL expires.
   */
  set(key: string, response: CachedResponse, ttlMs: number): void {
    // Clear any existing timer for this key
    const existingTimer = this.timers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Update the response with correct expiration time
    const expiringResponse: CachedResponse = {
      ...response,
      expiresAt: Date.now() + ttlMs,
    };

    this.cache.set(key, expiringResponse);

    // Set up auto-cleanup timer
    const timer = setTimeout(() => {
      this.removeEntry(key);
    }, ttlMs);

    this.timers.set(key, timer);
  }

  /**
   * Compute cache key from request object.
   * Format: `method:path` or `method:path?queryString` if query parameters exist.
   */
  computeKey(req: Record<string, any>): string {
    const method = req.method || 'GET';
    const path = req.path || '';
    const query = req.query || {};

    // Build query string from query object
    const queryParams = Object.entries(query)
      .map(([key, value]) => `${key}=${value}`)
      .sort()
      .join('&');

    if (queryParams) {
      return `${method}:${path}?${queryParams}`;
    }

    return `${method}:${path}`;
  }

  /**
   * Invalidate cache entries matching a wildcard pattern.
   * Patterns:
   * - 'GET:/users' - exact match
   * - 'GET:/users*' - all entries starting with GET:/users
   * - 'GET:*' - all GET requests
   * - '*' - all entries
   */
  invalidate(pattern: string): void {
    const keysToRemove: string[] = [];

    for (const key of this.cache.keys()) {
      if (this.matchesPattern(key, pattern)) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      this.removeEntry(key);
    }
  }

  /**
   * Clear all cache entries and timers.
   */
  clear(): void {
    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }

    this.cache.clear();
    this.timers.clear();
  }

  /**
   * Get the number of cached entries.
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Check if a key matches a wildcard pattern.
   * Supports '*' as wildcard.
   */
  private matchesPattern(key: string, pattern: string): boolean {
    // Exact match
    if (pattern === key) {
      return true;
    }

    // Match all
    if (pattern === '*') {
      return true;
    }

    // Wildcard pattern matching
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      return key.startsWith(prefix);
    }

    return false;
  }

  /**
   * Remove a cache entry and its associated timer.
   */
  private removeEntry(key: string): void {
    this.cache.delete(key);

    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
  }
}
