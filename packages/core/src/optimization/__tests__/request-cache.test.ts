import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { RequestCache } from '../layer2/request-cache.js';
import type { CachedResponse } from '../types.js';

describe('RequestCache', () => {
  let cache: RequestCache;

  beforeEach(() => {
    cache = new RequestCache();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Operations', () => {
    it('should cache and retrieve a response', () => {
      const key = 'GET:/users';
      const response: CachedResponse = {
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
        body: { id: 1, name: 'John' },
        expiresAt: Date.now() + 60000,
      };

      cache.set(key, response, 60000);
      const retrieved = cache.get(key);

      expect(retrieved).toEqual(response);
    });

    it('should return undefined for non-existent keys', () => {
      const retrieved = cache.get('GET:/nonexistent');
      expect(retrieved).toBeUndefined();
    });

    it('should return undefined for expired entries', () => {
      const key = 'GET:/users';
      const response: CachedResponse = {
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
        body: { id: 1, name: 'John' },
        expiresAt: Date.now() + 5000,
      };

      cache.set(key, response, 5000);
      vi.advanceTimersByTime(6000);

      const retrieved = cache.get(key);
      expect(retrieved).toBeUndefined();
    });
  });

  describe('computeKey', () => {
    it('should compute cache key from GET request with path', () => {
      const req = {
        method: 'GET',
        path: '/users',
        query: {},
      };

      const key = cache.computeKey(req);
      expect(key).toBe('GET:/users');
    });

    it('should compute cache key from GET request with query parameters', () => {
      const req = {
        method: 'GET',
        path: '/users',
        query: { page: '1', limit: '10' },
      };

      const key = cache.computeKey(req);
      expect(key).toMatch(/^GET:\/users\?/);
      expect(key).toContain('page=1');
      expect(key).toContain('limit=10');
    });

    it('should compute cache key from POST request', () => {
      const req = {
        method: 'POST',
        path: '/users',
        query: {},
      };

      const key = cache.computeKey(req);
      expect(key).toBe('POST:/users');
    });

    it('should produce consistent keys for same request', () => {
      const req = {
        method: 'GET',
        path: '/users',
        query: { page: '1', limit: '10' },
      };

      const key1 = cache.computeKey(req);
      const key2 = cache.computeKey(req);

      expect(key1).toBe(key2);
    });
  });

  describe('Invalidation', () => {
    beforeEach(() => {
      // Add multiple cache entries
      const response: CachedResponse = {
        statusCode: 200,
        headers: {},
        body: {},
        expiresAt: Date.now() + 60000,
      };

      cache.set('GET:/users', response, 60000);
      cache.set('GET:/users/1', response, 60000);
      cache.set('GET:/users/2', response, 60000);
      cache.set('GET:/posts', response, 60000);
      cache.set('POST:/users', response, 60000);
    });

    it('should invalidate entries matching exact pattern', () => {
      cache.invalidate('GET:/users');

      expect(cache.get('GET:/users')).toBeUndefined();
      expect(cache.get('GET:/users/1')).toBeDefined();
      expect(cache.get('GET:/users/2')).toBeDefined();
      expect(cache.get('GET:/posts')).toBeDefined();
    });

    it('should invalidate entries matching wildcard pattern', () => {
      cache.invalidate('GET:/users*');

      expect(cache.get('GET:/users')).toBeUndefined();
      expect(cache.get('GET:/users/1')).toBeUndefined();
      expect(cache.get('GET:/users/2')).toBeUndefined();
      expect(cache.get('GET:/posts')).toBeDefined();
      expect(cache.get('POST:/users')).toBeDefined();
    });

    it('should invalidate all GET requests with wildcard', () => {
      cache.invalidate('GET:*');

      expect(cache.get('GET:/users')).toBeUndefined();
      expect(cache.get('GET:/users/1')).toBeUndefined();
      expect(cache.get('GET:/users/2')).toBeUndefined();
      expect(cache.get('GET:/posts')).toBeUndefined();
      expect(cache.get('POST:/users')).toBeDefined();
    });

    it('should invalidate all entries with * pattern', () => {
      cache.invalidate('*');

      expect(cache.get('GET:/users')).toBeUndefined();
      expect(cache.get('GET:/users/1')).toBeUndefined();
      expect(cache.get('POST:/users')).toBeUndefined();
      expect(cache.get('GET:/posts')).toBeUndefined();
    });
  });

  describe('Expiration and Cleanup', () => {
    it('should auto-remove expired entries on retrieval', () => {
      const key = 'GET:/users';
      const response: CachedResponse = {
        statusCode: 200,
        headers: {},
        body: {},
        expiresAt: Date.now() + 5000,
      };

      cache.set(key, response, 5000);
      expect(cache.size()).toBe(1);

      vi.advanceTimersByTime(6000);

      const retrieved = cache.get(key);
      expect(retrieved).toBeUndefined();
      expect(cache.size()).toBe(0);
    });

    it('should set up timer for auto-cleanup on expiration', () => {
      const key = 'GET:/users';
      const response: CachedResponse = {
        statusCode: 200,
        headers: {},
        body: {},
        expiresAt: Date.now() + 5000,
      };

      cache.set(key, response, 5000);
      vi.advanceTimersByTime(5100);

      // Entry should be automatically cleaned up
      expect(cache.get(key)).toBeUndefined();
    });
  });

  describe('Size and Clear', () => {
    it('should return correct cache size', () => {
      const response: CachedResponse = {
        statusCode: 200,
        headers: {},
        body: {},
        expiresAt: Date.now() + 60000,
      };

      expect(cache.size()).toBe(0);

      cache.set('GET:/users', response, 60000);
      expect(cache.size()).toBe(1);

      cache.set('GET:/posts', response, 60000);
      expect(cache.size()).toBe(2);
    });

    it('should clear all entries', () => {
      const response: CachedResponse = {
        statusCode: 200,
        headers: {},
        body: {},
        expiresAt: Date.now() + 60000,
      };

      cache.set('GET:/users', response, 60000);
      cache.set('GET:/posts', response, 60000);
      cache.set('GET:/comments', response, 60000);

      expect(cache.size()).toBe(3);

      cache.clear();

      expect(cache.size()).toBe(0);
      expect(cache.get('GET:/users')).toBeUndefined();
      expect(cache.get('GET:/posts')).toBeUndefined();
      expect(cache.get('GET:/comments')).toBeUndefined();
    });

    it('should not count expired entries in size', () => {
      const response: CachedResponse = {
        statusCode: 200,
        headers: {},
        body: {},
        expiresAt: Date.now() + 5000,
      };

      cache.set('GET:/users', response, 5000);
      expect(cache.size()).toBe(1);

      vi.advanceTimersByTime(6000);

      // Trigger cleanup by attempting to get the expired entry
      cache.get('GET:/users');

      expect(cache.size()).toBe(0);
    });
  });

  describe('Multiple Cached Responses', () => {
    it('should handle multiple different responses', () => {
      const response1: CachedResponse = {
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
        body: { users: [] },
        expiresAt: Date.now() + 60000,
      };

      const response2: CachedResponse = {
        statusCode: 404,
        headers: { 'content-type': 'application/json' },
        body: { error: 'Not found' },
        expiresAt: Date.now() + 60000,
      };

      cache.set('GET:/users', response1, 60000);
      cache.set('GET:/posts', response2, 60000);

      expect(cache.get('GET:/users')).toEqual(response1);
      expect(cache.get('GET:/posts')).toEqual(response2);
    });

    it('should overwrite existing cache entries', () => {
      const response1: CachedResponse = {
        statusCode: 200,
        headers: {},
        body: { version: 1 },
        expiresAt: Date.now() + 60000,
      };

      const response2: CachedResponse = {
        statusCode: 200,
        headers: {},
        body: { version: 2 },
        expiresAt: Date.now() + 60000,
      };

      cache.set('GET:/users', response1, 60000);
      cache.set('GET:/users', response2, 60000);

      expect(cache.get('GET:/users')).toEqual(response2);
      expect(cache.size()).toBe(1);
    });
  });
});
