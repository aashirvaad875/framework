import { describe, it, expect, beforeEach } from 'vitest';
import { RouteCompiler } from '../layer1/route-compiler.js';
import type { RouteEntry, HttpMethod } from '../types.js';

describe('RouteCompiler', () => {
  let compiler: RouteCompiler;

  beforeEach(() => {
    compiler = new RouteCompiler();
  });

  describe('Simple Route Compilation', () => {
    it('should compile a simple GET route without parameters', () => {
      const route: RouteEntry = {
        method: 'GET',
        path: '/users',
        pattern: /^\/users$/,
        paramNames: [],
        handler: async () => ({ users: [] }),
      };

      compiler.compile([route]);

      const result = compiler.lookup('GET', '/users');
      expect(result).toEqual(route);
    });

    it('should compile multiple simple routes', () => {
      const routes: RouteEntry[] = [
        {
          method: 'GET',
          path: '/users',
          pattern: /^\/users$/,
          paramNames: [],
          handler: async () => ({ users: [] }),
        },
        {
          method: 'GET',
          path: '/products',
          pattern: /^\/products$/,
          paramNames: [],
          handler: async () => ({ products: [] }),
        },
      ];

      compiler.compile(routes);

      expect(compiler.lookup('GET', '/users')).toEqual(routes[0]);
      expect(compiler.lookup('GET', '/products')).toEqual(routes[1]);
    });
  });

  describe('Routes with Parameters', () => {
    it('should compile a route with a single parameter', () => {
      const route: RouteEntry = {
        method: 'GET',
        path: '/users/:id',
        pattern: /^\/users\/([^/]+)$/,
        paramNames: ['id'],
        handler: async () => ({ id: 1 }),
      };

      compiler.compile([route]);

      const result = compiler.lookup('GET', '/users/:id');
      expect(result).toEqual(route);
    });

    it('should match parameter segments during lookup', () => {
      const route: RouteEntry = {
        method: 'GET',
        path: '/users/:id',
        pattern: /^\/users\/([^/]+)$/,
        paramNames: ['id'],
        handler: async () => ({ id: 1 }),
      };

      compiler.compile([route]);

      const result = compiler.lookup('GET', '/users/123');
      expect(result).toEqual(route);
    });

    it('should compile routes with multiple parameters in nested paths', () => {
      const route: RouteEntry = {
        method: 'GET',
        path: '/users/:userId/posts/:postId',
        pattern: /^\/users\/([^/]+)\/posts\/([^/]+)$/,
        paramNames: ['userId', 'postId'],
        handler: async () => ({ post: {} }),
      };

      compiler.compile([route]);

      const result = compiler.lookup('GET', '/users/123/posts/456');
      expect(result).toEqual(route);
    });

    it('should differentiate between exact match and parameter nodes', () => {
      const exactRoute: RouteEntry = {
        method: 'GET',
        path: '/users/new',
        pattern: /^\/users\/new$/,
        paramNames: [],
        handler: async () => ({ action: 'create' }),
      };

      const paramRoute: RouteEntry = {
        method: 'GET',
        path: '/users/:id',
        pattern: /^\/users\/([^/]+)$/,
        paramNames: ['id'],
        handler: async () => ({ id: 1 }),
      };

      compiler.compile([exactRoute, paramRoute]);

      // Exact match should take precedence
      expect(compiler.lookup('GET', '/users/new')).toEqual(exactRoute);
      // Parameter match should work for other values
      expect(compiler.lookup('GET', '/users/123')).toEqual(paramRoute);
    });
  });

  describe('Multiple HTTP Methods', () => {
    it('should handle same path with different HTTP methods', () => {
      const getRoute: RouteEntry = {
        method: 'GET',
        path: '/users',
        pattern: /^\/users$/,
        paramNames: [],
        handler: async () => ({ users: [] }),
      };

      const postRoute: RouteEntry = {
        method: 'POST',
        path: '/users',
        pattern: /^\/users$/,
        paramNames: [],
        handler: async () => ({ id: 1 }),
      };

      compiler.compile([getRoute, postRoute]);

      expect(compiler.lookup('GET', '/users')).toEqual(getRoute);
      expect(compiler.lookup('POST', '/users')).toEqual(postRoute);
    });

    it('should support all HTTP methods', () => {
      const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
      const routes: RouteEntry[] = methods.map(method => ({
        method,
        path: '/resource',
        pattern: /^\/resource$/,
        paramNames: [],
        handler: async () => ({ method }),
      }));

      compiler.compile(routes);

      methods.forEach(method => {
        const result = compiler.lookup(method, '/resource');
        expect(result?.method).toBe(method);
      });
    });
  });

  describe('Lookup Behavior', () => {
    it('should return null for non-matching routes', () => {
      const route: RouteEntry = {
        method: 'GET',
        path: '/users',
        pattern: /^\/users$/,
        paramNames: [],
        handler: async () => ({ users: [] }),
      };

      compiler.compile([route]);

      expect(compiler.lookup('GET', '/products')).toBeNull();
    });

    it('should return null for non-matching HTTP method', () => {
      const route: RouteEntry = {
        method: 'GET',
        path: '/users',
        pattern: /^\/users$/,
        paramNames: [],
        handler: async () => ({ users: [] }),
      };

      compiler.compile([route]);

      expect(compiler.lookup('POST', '/users')).toBeNull();
    });

    it('should return null for paths that do not exist', () => {
      const route: RouteEntry = {
        method: 'GET',
        path: '/users/:id',
        pattern: /^\/users\/([^/]+)$/,
        paramNames: ['id'],
        handler: async () => ({ id: 1 }),
      };

      compiler.compile([route]);

      expect(compiler.lookup('GET', '/products/123')).toBeNull();
    });

    it('should handle paths with different segments', () => {
      const route: RouteEntry = {
        method: 'GET',
        path: '/users',
        pattern: /^\/users$/,
        paramNames: [],
        handler: async () => ({ users: [] }),
      };

      compiler.compile([route]);

      // Different paths should not match
      expect(compiler.lookup('GET', '/user')).toBeNull();
    });
  });

  describe('Trie Structure', () => {
    it('should maintain separate trees for different HTTP methods', () => {
      const getRoute: RouteEntry = {
        method: 'GET',
        path: '/data',
        pattern: /^\/data$/,
        paramNames: [],
        handler: async () => ({ data: 'get' }),
      };

      const postRoute: RouteEntry = {
        method: 'POST',
        path: '/data',
        pattern: /^\/data$/,
        paramNames: [],
        handler: async () => ({ data: 'post' }),
      };

      compiler.compile([getRoute, postRoute]);

      const compiled = compiler.getCompiledRoutes();
      // Should have at least 2 method trees
      expect(compiled.length).toBeGreaterThanOrEqual(2);
    });

    it('should share common prefixes in trie', () => {
      const routes: RouteEntry[] = [
        {
          method: 'GET',
          path: '/api/users',
          pattern: /^\/api\/users$/,
          paramNames: [],
          handler: async () => ({ endpoint: 'users' }),
        },
        {
          method: 'GET',
          path: '/api/products',
          pattern: /^\/api\/products$/,
          paramNames: [],
          handler: async () => ({ endpoint: 'products' }),
        },
      ];

      compiler.compile(routes);

      // Both routes should be accessible
      expect(compiler.lookup('GET', '/api/users')).toEqual(routes[0]);
      expect(compiler.lookup('GET', '/api/products')).toEqual(routes[1]);
    });
  });

  describe('Clear Operation', () => {
    it('should clear all compiled routes', () => {
      const route: RouteEntry = {
        method: 'GET',
        path: '/users',
        pattern: /^\/users$/,
        paramNames: [],
        handler: async () => ({ users: [] }),
      };

      compiler.compile([route]);
      expect(compiler.lookup('GET', '/users')).toEqual(route);

      compiler.clear();

      expect(compiler.lookup('GET', '/users')).toBeNull();
    });

    it('should allow recompilation after clear', () => {
      const route1: RouteEntry = {
        method: 'GET',
        path: '/users',
        pattern: /^\/users$/,
        paramNames: [],
        handler: async () => ({ users: [] }),
      };

      compiler.compile([route1]);
      compiler.clear();

      const route2: RouteEntry = {
        method: 'POST',
        path: '/products',
        pattern: /^\/products$/,
        paramNames: [],
        handler: async () => ({ products: [] }),
      };

      compiler.compile([route2]);

      expect(compiler.lookup('POST', '/products')).toEqual(route2);
      expect(compiler.lookup('GET', '/users')).toBeNull();
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle deeply nested routes', () => {
      const route: RouteEntry = {
        method: 'GET',
        path: '/api/v1/users/:userId/posts/:postId/comments/:commentId',
        pattern: /^\/api\/v1\/users\/([^/]+)\/posts\/([^/]+)\/comments\/([^/]+)$/,
        paramNames: ['userId', 'postId', 'commentId'],
        handler: async () => ({ comment: {} }),
      };

      compiler.compile([route]);

      const result = compiler.lookup('GET', '/api/v1/users/123/posts/456/comments/789');
      expect(result).toEqual(route);
    });

    it('should handle multiple overlapping routes', () => {
      const routes: RouteEntry[] = [
        {
          method: 'GET',
          path: '/users',
          pattern: /^\/users$/,
          paramNames: [],
          handler: async () => ({ action: 'list' }),
        },
        {
          method: 'GET',
          path: '/users/:id',
          pattern: /^\/users\/([^/]+)$/,
          paramNames: ['id'],
          handler: async () => ({ action: 'get' }),
        },
        {
          method: 'GET',
          path: '/users/:id/posts',
          pattern: /^\/users\/([^/]+)\/posts$/,
          paramNames: ['id'],
          handler: async () => ({ action: 'posts' }),
        },
        {
          method: 'GET',
          path: '/users/:id/posts/:postId',
          pattern: /^\/users\/([^/]+)\/posts\/([^/]+)$/,
          paramNames: ['id', 'postId'],
          handler: async () => ({ action: 'post-detail' }),
        },
      ];

      compiler.compile(routes);

      expect(compiler.lookup('GET', '/users')).toEqual(routes[0]);
      expect(compiler.lookup('GET', '/users/123')).toEqual(routes[1]);
      expect(compiler.lookup('GET', '/users/123/posts')).toEqual(routes[2]);
      expect(compiler.lookup('GET', '/users/123/posts/456')).toEqual(routes[3]);
    });

    it('should maintain performance with many routes', () => {
      const routes: RouteEntry[] = [];

      // Create 100 routes
      for (let i = 0; i < 100; i++) {
        routes.push({
          method: 'GET',
          path: `/route${i}`,
          pattern: new RegExp(`^/route${i}$`),
          paramNames: [],
          handler: async () => ({ route: i }),
        });
      }

      compiler.compile(routes);

      // Lookup should be fast even with many routes
      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        compiler.lookup('GET', `/route${i}`);
      }
      const end = performance.now();

      // All lookups combined should complete in less than 10ms
      expect(end - start).toBeLessThan(10);

      // Verify all lookups work correctly
      for (let i = 0; i < 100; i++) {
        const result = compiler.lookup('GET', `/route${i}`);
        expect(result?.handler).toBeDefined();
      }
    });

    it('should handle mixed simple and complex routes', () => {
      const routes: RouteEntry[] = [
        {
          method: 'GET',
          path: '/health',
          pattern: /^\/health$/,
          paramNames: [],
          handler: async () => ({ status: 'ok' }),
        },
        {
          method: 'GET',
          path: '/users/:id',
          pattern: /^\/users\/([^/]+)$/,
          paramNames: ['id'],
          handler: async () => ({ user: {} }),
        },
        {
          method: 'POST',
          path: '/users',
          pattern: /^\/users$/,
          paramNames: [],
          handler: async () => ({ id: 1 }),
        },
        {
          method: 'PUT',
          path: '/users/:id',
          pattern: /^\/users\/([^/]+)$/,
          paramNames: ['id'],
          handler: async () => ({ updated: true }),
        },
        {
          method: 'DELETE',
          path: '/users/:id',
          pattern: /^\/users\/([^/]+)$/,
          paramNames: ['id'],
          handler: async () => ({ deleted: true }),
        },
      ];

      compiler.compile(routes);

      expect(compiler.lookup('GET', '/health')).toEqual(routes[0]);
      expect(compiler.lookup('GET', '/users/123')).toEqual(routes[1]);
      expect(compiler.lookup('POST', '/users')).toEqual(routes[2]);
      expect(compiler.lookup('PUT', '/users/123')).toEqual(routes[3]);
      expect(compiler.lookup('DELETE', '/users/123')).toEqual(routes[4]);
    });
  });
});
