import { describe, it, expect, beforeEach } from 'vitest';
import { MiddlewareChainCache } from '../layer2/middleware-chain-cache.js';
import type { MiddlewareExecutor } from '../types.js';

describe('MiddlewareChainCache', () => {
  let cache: MiddlewareChainCache;

  beforeEach(() => {
    cache = new MiddlewareChainCache();
  });

  describe('Basic Operations', () => {
    it('should cache and retrieve a middleware chain', () => {
      const routeToken = 'users.GET';
      const chain: MiddlewareExecutor[] = [
        {
          type: 'guard',
          name: 'AuthGuard',
          executor: async () => {},
        },
        {
          type: 'pipe',
          name: 'ValidationPipe',
          executor: async () => {},
        },
      ];

      cache.set(routeToken, chain);
      const retrieved = cache.get(routeToken);

      expect(retrieved).toEqual(chain);
      expect(retrieved).toHaveLength(2);
    });

    it('should return undefined for non-existent route tokens', () => {
      const retrieved = cache.get('nonexistent.GET');
      expect(retrieved).toBeUndefined();
    });

    it('should check if route token exists', () => {
      const routeToken = 'users.GET';
      const chain: MiddlewareExecutor[] = [
        {
          type: 'guard',
          name: 'AuthGuard',
          executor: async () => {},
        },
      ];

      expect(cache.has(routeToken)).toBe(false);

      cache.set(routeToken, chain);
      expect(cache.has(routeToken)).toBe(true);
    });
  });

  describe('Middleware Executor Types', () => {
    it('should cache chain with guard middleware', () => {
      const routeToken = 'admin.POST';
      const chain: MiddlewareExecutor[] = [
        {
          type: 'guard',
          name: 'RoleGuard',
          executor: async context => {
            if (context.user?.role !== 'admin') {
              throw new Error('Forbidden');
            }
          },
        },
      ];

      cache.set(routeToken, chain);
      const retrieved = cache.get(routeToken);

      expect(retrieved).toBeDefined();
      expect(retrieved![0].type).toBe('guard');
      expect(retrieved![0].name).toBe('RoleGuard');
    });

    it('should cache chain with pipe middleware', () => {
      const routeToken = 'users.POST';
      const chain: MiddlewareExecutor[] = [
        {
          type: 'pipe',
          name: 'ParseIntPipe',
          executor: async context => {
            context.params.id = parseInt(context.params.id, 10);
          },
        },
      ];

      cache.set(routeToken, chain);
      const retrieved = cache.get(routeToken);

      expect(retrieved).toBeDefined();
      expect(retrieved![0].type).toBe('pipe');
      expect(retrieved![0].name).toBe('ParseIntPipe');
    });

    it('should cache chain with interceptor middleware', () => {
      const routeToken = 'users.GET';
      const chain: MiddlewareExecutor[] = [
        {
          type: 'interceptor',
          name: 'LoggingInterceptor',
          executor: async (context: any) => {
            console.warn(`Request: ${context.method} ${context.path}`);
          },
        },
      ];

      cache.set(routeToken, chain);
      const retrieved = cache.get(routeToken);

      expect(retrieved).toBeDefined();
      expect(retrieved![0].type).toBe('interceptor');
      expect(retrieved![0].name).toBe('LoggingInterceptor');
    });
  });

  describe('Complex Chains', () => {
    it('should cache chain with multiple middleware in order', () => {
      const routeToken = 'protected.POST';
      const chain: MiddlewareExecutor[] = [
        {
          type: 'interceptor',
          name: 'LoggingInterceptor',
          executor: async () => {},
        },
        {
          type: 'guard',
          name: 'AuthGuard',
          executor: async () => {},
        },
        {
          type: 'pipe',
          name: 'ValidationPipe',
          executor: async () => {},
        },
        {
          type: 'pipe',
          name: 'TransformPipe',
          executor: async () => {},
        },
      ];

      cache.set(routeToken, chain);
      const retrieved = cache.get(routeToken);

      expect(retrieved).toHaveLength(4);
      expect(retrieved![0].name).toBe('LoggingInterceptor');
      expect(retrieved![1].name).toBe('AuthGuard');
      expect(retrieved![2].name).toBe('ValidationPipe');
      expect(retrieved![3].name).toBe('TransformPipe');
    });

    it('should preserve executor functions in cached chain', () => {
      const routeToken = 'users.GET';
      const executor = async (context: Record<string, any>) => {
        context.result = 'processed';
      };

      const chain: MiddlewareExecutor[] = [
        {
          type: 'pipe',
          name: 'CustomPipe',
          executor,
        },
      ];

      cache.set(routeToken, chain);
      const retrieved = cache.get(routeToken);

      expect(retrieved![0].executor).toBe(executor);
    });
  });

  describe('Size and Clear', () => {
    it('should return correct cache size', () => {
      const chain: MiddlewareExecutor[] = [
        {
          type: 'guard',
          name: 'AuthGuard',
          executor: async () => {},
        },
      ];

      expect(cache.size()).toBe(0);

      cache.set('users.GET', chain);
      expect(cache.size()).toBe(1);

      cache.set('users.POST', chain);
      expect(cache.size()).toBe(2);

      cache.set('posts.GET', chain);
      expect(cache.size()).toBe(3);
    });

    it('should clear all cached chains', () => {
      const chain: MiddlewareExecutor[] = [
        {
          type: 'guard',
          name: 'AuthGuard',
          executor: async () => {},
        },
      ];

      cache.set('users.GET', chain);
      cache.set('users.POST', chain);
      cache.set('posts.GET', chain);

      expect(cache.size()).toBe(3);

      cache.clear();

      expect(cache.size()).toBe(0);
      expect(cache.get('users.GET')).toBeUndefined();
      expect(cache.get('users.POST')).toBeUndefined();
      expect(cache.get('posts.GET')).toBeUndefined();
    });
  });

  describe('Overwriting Chains', () => {
    it('should overwrite existing chain for same route token', () => {
      const routeToken = 'users.GET';

      const chain1: MiddlewareExecutor[] = [
        {
          type: 'guard',
          name: 'AuthGuard',
          executor: async () => {},
        },
      ];

      const chain2: MiddlewareExecutor[] = [
        {
          type: 'guard',
          name: 'RoleGuard',
          executor: async () => {},
        },
        {
          type: 'pipe',
          name: 'ValidationPipe',
          executor: async () => {},
        },
      ];

      cache.set(routeToken, chain1);
      expect(cache.get(routeToken)).toHaveLength(1);

      cache.set(routeToken, chain2);
      expect(cache.get(routeToken)).toHaveLength(2);
      expect(cache.get(routeToken)![0].name).toBe('RoleGuard');
      expect(cache.size()).toBe(1);
    });
  });

  describe('Multiple Routes', () => {
    it('should handle multiple different routes', () => {
      const usersGetChain: MiddlewareExecutor[] = [
        {
          type: 'guard',
          name: 'AuthGuard',
          executor: async () => {},
        },
      ];

      const usersPostChain: MiddlewareExecutor[] = [
        {
          type: 'guard',
          name: 'AdminGuard',
          executor: async () => {},
        },
        {
          type: 'pipe',
          name: 'ValidationPipe',
          executor: async () => {},
        },
      ];

      const postsGetChain: MiddlewareExecutor[] = [
        {
          type: 'interceptor',
          name: 'CachingInterceptor',
          executor: async () => {},
        },
      ];

      cache.set('users.GET', usersGetChain);
      cache.set('users.POST', usersPostChain);
      cache.set('posts.GET', postsGetChain);

      expect(cache.get('users.GET')).toEqual(usersGetChain);
      expect(cache.get('users.POST')).toEqual(usersPostChain);
      expect(cache.get('posts.GET')).toEqual(postsGetChain);
      expect(cache.size()).toBe(3);
    });
  });

  describe('Empty Chain', () => {
    it('should cache empty middleware chains', () => {
      const routeToken = 'public.GET';
      const chain: MiddlewareExecutor[] = [];

      cache.set(routeToken, chain);
      const retrieved = cache.get(routeToken);

      expect(retrieved).toEqual([]);
      expect(retrieved).toHaveLength(0);
      expect(cache.has(routeToken)).toBe(true);
    });
  });
});
