import { describe, it, expect, beforeEach } from 'vitest';
import { RouteCompiler } from '../layer1/route-compiler.js';
import type { RouteEntry } from '../types.js';

describe('HTTP Routing + Optimization', () => {
  let compiler: RouteCompiler;

  beforeEach(() => {
    compiler = new RouteCompiler();
  });

  describe('REST Routes', () => {
    it('should compile REST routes (GET, POST, PUT, DELETE)', async () => {
      const routes: RouteEntry[] = [
        {
          method: 'GET',
          path: '/api/users',
          pattern: /^\/api\/users$/,
          paramNames: [],
          handler: async () => 'list',
        },
        {
          method: 'POST',
          path: '/api/users',
          pattern: /^\/api\/users$/,
          paramNames: [],
          handler: async () => 'create',
        },
        {
          method: 'GET',
          path: '/api/users/:id',
          pattern: /^\/api\/users\/([^/]+)$/,
          paramNames: ['id'],
          handler: async () => 'get',
        },
        {
          method: 'PUT',
          path: '/api/users/:id',
          pattern: /^\/api\/users\/([^/]+)$/,
          paramNames: ['id'],
          handler: async () => 'update',
        },
        {
          method: 'DELETE',
          path: '/api/users/:id',
          pattern: /^\/api\/users\/([^/]+)$/,
          paramNames: ['id'],
          handler: async () => 'delete',
        },
      ];

      compiler.compile(routes);

      const listRoute = compiler.lookup('GET', '/api/users');
      expect(listRoute).toBeTruthy();
      expect(await listRoute?.handler()).toBe('list');

      const createRoute = compiler.lookup('POST', '/api/users');
      expect(createRoute).toBeTruthy();
      expect(await createRoute?.handler()).toBe('create');

      const getRoute = compiler.lookup('GET', '/api/users/123');
      expect(getRoute).toBeTruthy();
      expect(await getRoute?.handler()).toBe('get');

      const updateRoute = compiler.lookup('PUT', '/api/users/456');
      expect(updateRoute).toBeTruthy();
      expect(await updateRoute?.handler()).toBe('update');

      const deleteRoute = compiler.lookup('DELETE', '/api/users/789');
      expect(deleteRoute).toBeTruthy();
      expect(await deleteRoute?.handler()).toBe('delete');
    });

    it('should correctly match different HTTP methods on the same path', async () => {
      const getRoute: RouteEntry = {
        method: 'GET',
        path: '/api/users',
        pattern: /^\/api\/users$/,
        paramNames: [],
        handler: async () => 'list',
      };

      const postRoute: RouteEntry = {
        method: 'POST',
        path: '/api/users',
        pattern: /^\/api\/users$/,
        paramNames: [],
        handler: async () => 'create',
      };

      compiler.compile([getRoute, postRoute]);

      const getResult = compiler.lookup('GET', '/api/users');
      expect(await getResult?.handler()).toBe('list');

      const postResult = compiler.lookup('POST', '/api/users');
      expect(await postResult?.handler()).toBe('create');

      // Different method should not match
      const putResult = compiler.lookup('PUT', '/api/users');
      expect(putResult).toBeNull();
    });

    it('should handle PATCH method', async () => {
      const patchRoute: RouteEntry = {
        method: 'PATCH',
        path: '/api/users/:id',
        pattern: /^\/api\/users\/([^/]+)$/,
        paramNames: ['id'],
        handler: async () => 'partial-update',
      };

      compiler.compile([patchRoute]);

      const result = compiler.lookup('PATCH', '/api/users/123');
      expect(result).toBeTruthy();
      expect(await result?.handler()).toBe('partial-update');
    });
  });

  describe('Nested Resource Routes', () => {
    it('should compile nested resource routes', async () => {
      const routes: RouteEntry[] = [
        {
          method: 'GET',
          path: '/api/users/:userId/posts',
          pattern: /^\/api\/users\/([^/]+)\/posts$/,
          paramNames: ['userId'],
          handler: async () => 'list-posts',
        },
        {
          method: 'GET',
          path: '/api/users/:userId/posts/:postId',
          pattern: /^\/api\/users\/([^/]+)\/posts\/([^/]+)$/,
          paramNames: ['userId', 'postId'],
          handler: async () => 'get-post',
        },
      ];

      compiler.compile(routes);

      const listRoute = compiler.lookup('GET', '/api/users/123/posts');
      expect(listRoute).toBeTruthy();
      expect(await listRoute?.handler()).toBe('list-posts');
      expect(listRoute?.paramNames).toContain('userId');

      const detailRoute = compiler.lookup('GET', '/api/users/123/posts/456');
      expect(detailRoute).toBeTruthy();
      expect(await detailRoute?.handler()).toBe('get-post');
      expect(detailRoute?.paramNames).toContain('userId');
      expect(detailRoute?.paramNames).toContain('postId');
    });

    it('should capture correct parameter names in nested routes', async () => {
      const route: RouteEntry = {
        method: 'GET',
        path: '/api/users/:userId/posts/:postId/comments/:commentId',
        pattern: /^\/api\/users\/([^/]+)\/posts\/([^/]+)\/comments\/([^/]+)$/,
        paramNames: ['userId', 'postId', 'commentId'],
        handler: async () => 'get-comment',
      };

      compiler.compile([route]);

      const result = compiler.lookup('GET', '/api/users/100/posts/200/comments/300');
      expect(result).toBeTruthy();
      expect(result?.paramNames).toEqual(['userId', 'postId', 'commentId']);
      expect(await result?.handler()).toBe('get-comment');
    });

    it('should handle multiple nested resource operations', async () => {
      const routes: RouteEntry[] = [
        {
          method: 'GET',
          path: '/api/users/:userId/posts',
          pattern: /^\/api\/users\/([^/]+)\/posts$/,
          paramNames: ['userId'],
          handler: async () => 'list-posts',
        },
        {
          method: 'POST',
          path: '/api/users/:userId/posts',
          pattern: /^\/api\/users\/([^/]+)\/posts$/,
          paramNames: ['userId'],
          handler: async () => 'create-post',
        },
        {
          method: 'GET',
          path: '/api/users/:userId/posts/:postId',
          pattern: /^\/api\/users\/([^/]+)\/posts\/([^/]+)$/,
          paramNames: ['userId', 'postId'],
          handler: async () => 'get-post',
        },
        {
          method: 'PUT',
          path: '/api/users/:userId/posts/:postId',
          pattern: /^\/api\/users\/([^/]+)\/posts\/([^/]+)$/,
          paramNames: ['userId', 'postId'],
          handler: async () => 'update-post',
        },
        {
          method: 'DELETE',
          path: '/api/users/:userId/posts/:postId',
          pattern: /^\/api\/users\/([^/]+)\/posts\/([^/]+)$/,
          paramNames: ['userId', 'postId'],
          handler: async () => 'delete-post',
        },
      ];

      compiler.compile(routes);

      expect(await compiler.lookup('GET', '/api/users/1/posts')?.handler()).toBe('list-posts');
      expect(await compiler.lookup('POST', '/api/users/1/posts')?.handler()).toBe('create-post');
      expect(await compiler.lookup('GET', '/api/users/1/posts/2')?.handler()).toBe('get-post');
      expect(await compiler.lookup('PUT', '/api/users/1/posts/2')?.handler()).toBe('update-post');
      expect(await compiler.lookup('DELETE', '/api/users/1/posts/2')?.handler()).toBe(
        'delete-post'
      );
    });

    it('should distinguish between nested resources with same method', async () => {
      const routes: RouteEntry[] = [
        {
          method: 'GET',
          path: '/api/users/:userId/posts',
          pattern: /^\/api\/users\/([^/]+)\/posts$/,
          paramNames: ['userId'],
          handler: async () => 'list-posts',
        },
        {
          method: 'GET',
          path: '/api/users/:userId/comments',
          pattern: /^\/api\/users\/([^/]+)\/comments$/,
          paramNames: ['userId'],
          handler: async () => 'list-comments',
        },
      ];

      compiler.compile(routes);

      const postsRoute = compiler.lookup('GET', '/api/users/123/posts');
      expect(await postsRoute?.handler()).toBe('list-posts');

      const commentsRoute = compiler.lookup('GET', '/api/users/123/comments');
      expect(await commentsRoute?.handler()).toBe('list-comments');

      // Different routes should not match each other
      expect(compiler.lookup('GET', '/api/users/123/likes')).toBeNull();
    });
  });

  describe('Routes with Query Strings', () => {
    it('should match routes ignoring query parameters', async () => {
      const route: RouteEntry = {
        method: 'GET',
        path: '/search',
        pattern: /^\/search$/,
        paramNames: [],
        handler: async () => 'search',
      };

      compiler.compile([route]);

      // Route compiler only looks at path, not query params
      const result = compiler.lookup('GET', '/search');
      expect(result).toBeTruthy();
      expect(await result?.handler()).toBe('search');
    });

    it('should handle routes with parameters and potential query strings', async () => {
      const route: RouteEntry = {
        method: 'GET',
        path: '/api/users/:id',
        pattern: /^\/api\/users\/([^/]+)$/,
        paramNames: ['id'],
        handler: async () => 'get-user',
      };

      compiler.compile([route]);

      // Lookup should work with just the path (query strings handled elsewhere)
      const result = compiler.lookup('GET', '/api/users/123');
      expect(result).toBeTruthy();
      expect(await result?.handler()).toBe('get-user');
      expect(result?.paramNames).toEqual(['id']);
    });

    it('should handle list routes with filtering', async () => {
      const routes: RouteEntry[] = [
        {
          method: 'GET',
          path: '/api/users',
          pattern: /^\/api\/users$/,
          paramNames: [],
          handler: async () => 'list-users',
        },
        {
          method: 'GET',
          path: '/api/posts',
          pattern: /^\/api\/posts$/,
          paramNames: [],
          handler: async () => 'list-posts',
        },
      ];

      compiler.compile(routes);

      // Both should match regardless of query params used by client
      const usersRoute = compiler.lookup('GET', '/api/users');
      expect(await usersRoute?.handler()).toBe('list-users');

      const postsRoute = compiler.lookup('GET', '/api/posts');
      expect(await postsRoute?.handler()).toBe('list-posts');
    });
  });

  describe('HTTP Method Handling', () => {
    it('should not confuse different methods on same path', async () => {
      const getRoute: RouteEntry = {
        method: 'GET',
        path: '/api/data',
        pattern: /^\/api\/data$/,
        paramNames: [],
        handler: async () => 'retrieve',
      };

      const postRoute: RouteEntry = {
        method: 'POST',
        path: '/api/data',
        pattern: /^\/api\/data$/,
        paramNames: [],
        handler: async () => 'create',
      };

      const putRoute: RouteEntry = {
        method: 'PUT',
        path: '/api/data',
        pattern: /^\/api\/data$/,
        paramNames: [],
        handler: async () => 'replace',
      };

      const deleteRoute: RouteEntry = {
        method: 'DELETE',
        path: '/api/data',
        pattern: /^\/api\/data$/,
        paramNames: [],
        handler: async () => 'remove',
      };

      compiler.compile([getRoute, postRoute, putRoute, deleteRoute]);

      expect(await compiler.lookup('GET', '/api/data')?.handler()).toBe('retrieve');
      expect(await compiler.lookup('POST', '/api/data')?.handler()).toBe('create');
      expect(await compiler.lookup('PUT', '/api/data')?.handler()).toBe('replace');
      expect(await compiler.lookup('DELETE', '/api/data')?.handler()).toBe('remove');
    });

    it('should handle all standard HTTP methods correctly', async () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'] as const;

      const routes: RouteEntry[] = methods.map(method => ({
        method,
        path: '/api/resource',
        pattern: /^\/api\/resource$/,
        paramNames: [],
        handler: async () => `${method.toLowerCase()}-handler`,
      }));

      compiler.compile(routes);

      for (const method of methods) {
        const result = compiler.lookup(method, '/api/resource');
        expect(result).toBeTruthy();
        expect(result?.method).toBe(method);
        expect(await result?.handler()).toBe(`${method.toLowerCase()}-handler`);
      }
    });

    it('should differentiate methods with parameters', async () => {
      const routes: RouteEntry[] = [
        {
          method: 'GET',
          path: '/api/items/:id',
          pattern: /^\/api\/items\/([^/]+)$/,
          paramNames: ['id'],
          handler: async () => 'get-item',
        },
        {
          method: 'PUT',
          path: '/api/items/:id',
          pattern: /^\/api\/items\/([^/]+)$/,
          paramNames: ['id'],
          handler: async () => 'update-item',
        },
        {
          method: 'DELETE',
          path: '/api/items/:id',
          pattern: /^\/api\/items\/([^/]+)$/,
          paramNames: ['id'],
          handler: async () => 'delete-item',
        },
      ];

      compiler.compile(routes);

      const getResult = compiler.lookup('GET', '/api/items/42');
      expect(await getResult?.handler()).toBe('get-item');

      const putResult = compiler.lookup('PUT', '/api/items/42');
      expect(await putResult?.handler()).toBe('update-item');

      const deleteResult = compiler.lookup('DELETE', '/api/items/42');
      expect(await deleteResult?.handler()).toBe('delete-item');
    });
  });

  describe('Real-world REST API Scenario', () => {
    it('should handle a complete REST API with users and posts', async () => {
      const routes: RouteEntry[] = [
        // Users routes
        {
          method: 'GET',
          path: '/api/users',
          pattern: /^\/api\/users$/,
          paramNames: [],
          handler: async () => 'list-users',
        },
        {
          method: 'POST',
          path: '/api/users',
          pattern: /^\/api\/users$/,
          paramNames: [],
          handler: async () => 'create-user',
        },
        {
          method: 'GET',
          path: '/api/users/:id',
          pattern: /^\/api\/users\/([^/]+)$/,
          paramNames: ['id'],
          handler: async () => 'get-user',
        },
        {
          method: 'PUT',
          path: '/api/users/:id',
          pattern: /^\/api\/users\/([^/]+)$/,
          paramNames: ['id'],
          handler: async () => 'update-user',
        },
        {
          method: 'DELETE',
          path: '/api/users/:id',
          pattern: /^\/api\/users\/([^/]+)$/,
          paramNames: ['id'],
          handler: async () => 'delete-user',
        },
        // User Posts routes
        {
          method: 'GET',
          path: '/api/users/:userId/posts',
          pattern: /^\/api\/users\/([^/]+)\/posts$/,
          paramNames: ['userId'],
          handler: async () => 'list-user-posts',
        },
        {
          method: 'POST',
          path: '/api/users/:userId/posts',
          pattern: /^\/api\/users\/([^/]+)\/posts$/,
          paramNames: ['userId'],
          handler: async () => 'create-user-post',
        },
        {
          method: 'GET',
          path: '/api/users/:userId/posts/:postId',
          pattern: /^\/api\/users\/([^/]+)\/posts\/([^/]+)$/,
          paramNames: ['userId', 'postId'],
          handler: async () => 'get-user-post',
        },
        {
          method: 'PUT',
          path: '/api/users/:userId/posts/:postId',
          pattern: /^\/api\/users\/([^/]+)\/posts\/([^/]+)$/,
          paramNames: ['userId', 'postId'],
          handler: async () => 'update-user-post',
        },
        {
          method: 'DELETE',
          path: '/api/users/:userId/posts/:postId',
          pattern: /^\/api\/users\/([^/]+)\/posts\/([^/]+)$/,
          paramNames: ['userId', 'postId'],
          handler: async () => 'delete-user-post',
        },
      ];

      compiler.compile(routes);

      // Test all routes
      expect(await compiler.lookup('GET', '/api/users')?.handler()).toBe('list-users');
      expect(await compiler.lookup('POST', '/api/users')?.handler()).toBe('create-user');
      expect(await compiler.lookup('GET', '/api/users/1')?.handler()).toBe('get-user');
      expect(await compiler.lookup('PUT', '/api/users/1')?.handler()).toBe('update-user');
      expect(await compiler.lookup('DELETE', '/api/users/1')?.handler()).toBe('delete-user');

      expect(await compiler.lookup('GET', '/api/users/1/posts')?.handler()).toBe('list-user-posts');
      expect(await compiler.lookup('POST', '/api/users/1/posts')?.handler()).toBe(
        'create-user-post'
      );
      expect(await compiler.lookup('GET', '/api/users/1/posts/10')?.handler()).toBe(
        'get-user-post'
      );
      expect(await compiler.lookup('PUT', '/api/users/1/posts/10')?.handler()).toBe(
        'update-user-post'
      );
      expect(await compiler.lookup('DELETE', '/api/users/1/posts/10')?.handler()).toBe(
        'delete-user-post'
      );

      // Verify paramNames
      const userRoute = compiler.lookup('GET', '/api/users/1');
      expect(userRoute?.paramNames).toEqual(['id']);

      const userPostRoute = compiler.lookup('GET', '/api/users/1/posts/10');
      expect(userPostRoute?.paramNames).toEqual(['userId', 'postId']);
    });

    it('should handle complex URL structures with multiple resource levels', async () => {
      const routes: RouteEntry[] = [
        {
          method: 'GET',
          path: '/api/organizations/:orgId/teams/:teamId/members',
          pattern: /^\/api\/organizations\/([^/]+)\/teams\/([^/]+)\/members$/,
          paramNames: ['orgId', 'teamId'],
          handler: async () => 'list-members',
        },
        {
          method: 'GET',
          path: '/api/organizations/:orgId/teams/:teamId/members/:memberId',
          pattern: /^\/api\/organizations\/([^/]+)\/teams\/([^/]+)\/members\/([^/]+)$/,
          paramNames: ['orgId', 'teamId', 'memberId'],
          handler: async () => 'get-member',
        },
      ];

      compiler.compile(routes);

      const listResult = compiler.lookup('GET', '/api/organizations/acme/teams/backend/members');
      expect(await listResult?.handler()).toBe('list-members');
      expect(listResult?.paramNames).toEqual(['orgId', 'teamId']);

      const detailResult = compiler.lookup(
        'GET',
        '/api/organizations/acme/teams/backend/members/john'
      );
      expect(await detailResult?.handler()).toBe('get-member');
      expect(detailResult?.paramNames).toEqual(['orgId', 'teamId', 'memberId']);
    });
  });

  describe('Edge Cases', () => {
    it('should not match partial paths', async () => {
      const route: RouteEntry = {
        method: 'GET',
        path: '/api/users',
        pattern: /^\/api\/users$/,
        paramNames: [],
        handler: async () => 'users',
      };

      compiler.compile([route]);

      // Should not match partial paths
      expect(compiler.lookup('GET', '/api/user')).toBeNull();
      expect(compiler.lookup('GET', '/api/users/extra')).toBeNull();
    });

    it('should not cross-match between different API versions', async () => {
      const routes: RouteEntry[] = [
        {
          method: 'GET',
          path: '/api/v1/users',
          pattern: /^\/api\/v1\/users$/,
          paramNames: [],
          handler: async () => 'v1-users',
        },
        {
          method: 'GET',
          path: '/api/v2/users',
          pattern: /^\/api\/v2\/users$/,
          paramNames: [],
          handler: async () => 'v2-users',
        },
      ];

      compiler.compile(routes);

      expect(await compiler.lookup('GET', '/api/v1/users')?.handler()).toBe('v1-users');
      expect(await compiler.lookup('GET', '/api/v2/users')?.handler()).toBe('v2-users');
      expect(compiler.lookup('GET', '/api/v3/users')).toBeNull();
    });

    it('should handle routes with numbers in paths', async () => {
      const route: RouteEntry = {
        method: 'GET',
        path: '/api/v2/items/:itemId',
        pattern: /^\/api\/v2\/items\/([^/]+)$/,
        paramNames: ['itemId'],
        handler: async () => 'get-item-v2',
      };

      compiler.compile([route]);

      const result = compiler.lookup('GET', '/api/v2/items/12345');
      expect(await result?.handler()).toBe('get-item-v2');
      expect(result?.paramNames).toEqual(['itemId']);
    });

    it('should handle special characters in resource names', async () => {
      const route: RouteEntry = {
        method: 'GET',
        path: '/api/user-profiles/:profileId',
        pattern: /^\/api\/user-profiles\/([^/]+)$/,
        paramNames: ['profileId'],
        handler: async () => 'get-profile',
      };

      compiler.compile([route]);

      const result = compiler.lookup('GET', '/api/user-profiles/abc123');
      expect(await result?.handler()).toBe('get-profile');
    });
  });
});
