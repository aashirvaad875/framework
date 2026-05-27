import { describe, it, expect, beforeEach } from 'vitest';
import { MetadataCache } from '../layer1/metadata-cache.js';
import type { ModuleMetadata, RouteEntry } from '../types.js';
import type { Token } from '../../di/types.js';

describe('MetadataCache', () => {
  let cache: MetadataCache;

  beforeEach(() => {
    cache = new MetadataCache();
  });

  describe('Module Metadata', () => {
    it('should cache and retrieve module metadata', () => {
      const token: Token = 'AppModule';
      const metadata: ModuleMetadata = {
        providers: ['service1', 'service2'],
        imports: ['HttpModule'],
        exports: ['service1'],
      };

      cache.setModuleMetadata(token, metadata);
      const retrieved = cache.getModuleMetadata(token);

      expect(retrieved).toEqual(metadata);
    });

    it('should return undefined for uncached modules', () => {
      const token: Token = 'NonExistentModule';
      const retrieved = cache.getModuleMetadata(token);

      expect(retrieved).toBeUndefined();
    });

    it('should handle class tokens as keys', () => {
      class TestModule {}
      const metadata: ModuleMetadata = {
        providers: [],
        imports: [],
        exports: [],
      };

      cache.setModuleMetadata(TestModule, metadata);
      const retrieved = cache.getModuleMetadata(TestModule);

      expect(retrieved).toEqual(metadata);
    });

    it('should handle symbol tokens as keys', () => {
      const token = Symbol('TestModule');
      const metadata: ModuleMetadata = {
        providers: ['service1'],
      };

      cache.setModuleMetadata(token, metadata);
      const retrieved = cache.getModuleMetadata(token);

      expect(retrieved).toEqual(metadata);
    });

    it('should override existing module metadata', () => {
      const token: Token = 'AppModule';
      const metadata1: ModuleMetadata = { providers: ['service1'] };
      const metadata2: ModuleMetadata = { providers: ['service2', 'service3'] };

      cache.setModuleMetadata(token, metadata1);
      cache.setModuleMetadata(token, metadata2);
      const retrieved = cache.getModuleMetadata(token);

      expect(retrieved).toEqual(metadata2);
    });
  });

  describe('Route Metadata', () => {
    it('should cache and retrieve route metadata', () => {
      const token: Token = 'UserController';
      const routes: RouteEntry[] = [
        {
          method: 'GET',
          path: '/users',
          pattern: /^\/users$/,
          paramNames: [],
          handler: async () => ({ users: [] }),
        },
      ];

      cache.setRouteMetadata(token, routes);
      const retrieved = cache.getRouteMetadata(token);

      expect(retrieved).toEqual(routes);
      expect(retrieved).toHaveLength(1);
      expect(retrieved![0].method).toBe('GET');
    });

    it('should return undefined for uncached routes', () => {
      const token: Token = 'NonExistentController';
      const retrieved = cache.getRouteMetadata(token);

      expect(retrieved).toBeUndefined();
    });

    it('should handle multiple routes per token', () => {
      const token: Token = 'ProductController';
      const routes: RouteEntry[] = [
        {
          method: 'GET',
          path: '/products',
          pattern: /^\/products$/,
          paramNames: [],
          handler: async () => ({ products: [] }),
        },
        {
          method: 'POST',
          path: '/products',
          pattern: /^\/products$/,
          paramNames: [],
          handler: async () => ({ id: 1 }),
        },
        {
          method: 'GET',
          path: '/products/:id',
          pattern: /^\/products\/([^/]+)$/,
          paramNames: ['id'],
          handler: async () => ({ id: 1 }),
        },
      ];

      cache.setRouteMetadata(token, routes);
      const retrieved = cache.getRouteMetadata(token);

      expect(retrieved).toHaveLength(3);
      expect(retrieved!.map(r => r.method)).toEqual(['GET', 'POST', 'GET']);
    });
  });

  describe('Provider Metadata', () => {
    it('should cache and retrieve provider metadata', () => {
      const token: Token = 'UserService';
      const metadata = {
        singleton: true,
        dependencies: ['DatabaseService', 'CacheService'],
      };

      cache.setProviderMetadata(token, metadata);
      const retrieved = cache.getProviderMetadata(token);

      expect(retrieved).toEqual(metadata);
    });

    it('should return undefined for uncached providers', () => {
      const token: Token = 'NonExistentService';
      const retrieved = cache.getProviderMetadata(token);

      expect(retrieved).toBeUndefined();
    });

    it('should handle various metadata types', () => {
      const tokens: Token[] = ['string-token', Symbol('symbol-token')];
      const metadataList = [{ scope: 'singleton' }, { scope: 'transient' }];

      tokens.forEach((token, idx) => {
        cache.setProviderMetadata(token, metadataList[idx]);
      });

      tokens.forEach((token, idx) => {
        const retrieved = cache.getProviderMetadata(token);
        expect(retrieved).toEqual(metadataList[idx]);
      });
    });
  });

  describe('Clear Cache', () => {
    it('should clear all cached data', () => {
      const moduleToken: Token = 'AppModule';
      const routeToken: Token = 'UserController';
      const providerToken: Token = 'UserService';

      cache.setModuleMetadata(moduleToken, { providers: [] });
      cache.setRouteMetadata(routeToken, [
        {
          method: 'GET',
          path: '/users',
          pattern: /^\/users$/,
          paramNames: [],
          handler: async () => ({}),
        },
      ]);
      cache.setProviderMetadata(providerToken, { scope: 'singleton' });

      cache.clear();

      expect(cache.getModuleMetadata(moduleToken)).toBeUndefined();
      expect(cache.getRouteMetadata(routeToken)).toBeUndefined();
      expect(cache.getProviderMetadata(providerToken)).toBeUndefined();
    });
  });

  describe('Has Method', () => {
    it('should return true for cached tokens', () => {
      const token: Token = 'AppModule';
      cache.setModuleMetadata(token, { providers: [] });

      expect(cache.has(token)).toBe(true);
    });

    it('should return false for uncached tokens', () => {
      const token: Token = 'NonExistent';

      expect(cache.has(token)).toBe(false);
    });

    it('should return true if any metadata type is cached for token', () => {
      const token: Token = 'MultiService';

      cache.setModuleMetadata(token, { providers: [] });
      expect(cache.has(token)).toBe(true);

      cache.clear();

      cache.setRouteMetadata(token, [
        {
          method: 'GET',
          path: '/test',
          pattern: /^\/test$/,
          paramNames: [],
          handler: async () => ({}),
        },
      ]);
      expect(cache.has(token)).toBe(true);

      cache.clear();

      cache.setProviderMetadata(token, { scope: 'singleton' });
      expect(cache.has(token)).toBe(true);
    });
  });

  describe('Serialization', () => {
    it('should serialize cache to valid JSON string', () => {
      const token: Token = 'AppModule';
      cache.setModuleMetadata(token, { providers: ['service1'] });

      const json = cache.serialize();

      expect(typeof json).toBe('string');
      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('should deserialize cache from JSON string', () => {
      const json = cache.serialize();

      const cache2 = new MetadataCache();
      cache2.deserialize(json);

      expect(() => cache2.serialize()).not.toThrow();
    });

    it('should handle round-trip serialization', () => {
      const token: Token = 'AppModule';
      const metadata: ModuleMetadata = {
        providers: ['service1', 'service2'],
        imports: ['HttpModule'],
        exports: ['service1'],
      };

      cache.setModuleMetadata(token, metadata);
      const json1 = cache.serialize();

      const cache2 = new MetadataCache();
      cache2.deserialize(json1);
      const json2 = cache2.serialize();

      expect(json1).toBe(json2);
    });

    it('should handle serialization of empty cache', () => {
      const json = cache.serialize();

      expect(typeof json).toBe('string');
      expect(() => JSON.parse(json)).not.toThrow();

      const cache2 = new MetadataCache();
      cache2.deserialize(json);

      expect(cache2.has('any-token')).toBe(false);
    });

    it('should handle invalid JSON in deserialize gracefully', () => {
      expect(() => {
        cache.deserialize('invalid json {]');
      }).toThrow();
    });

    it('should preserve string token metadata through serialization round-trip', () => {
      // Set up metadata for string tokens (symbols cannot be serialized to JSON)
      const stringToken1: Token = 'AppModule';
      const stringToken2: Token = 'UserService';

      const moduleMetadata: ModuleMetadata = {
        providers: ['service1', 'service2'],
        imports: ['HttpModule'],
        exports: ['service1'],
      };

      const providerMetadata = { scope: 'singleton', dependencies: ['DatabaseService'] };

      cache.setModuleMetadata(stringToken1, moduleMetadata);
      cache.setProviderMetadata(stringToken2, providerMetadata);

      // Serialize
      const json = cache.serialize();

      // Create new cache and deserialize
      const cache2 = new MetadataCache();
      cache2.deserialize(json);

      // Verify string token metadata is preserved
      expect(cache2.getModuleMetadata(stringToken1)).toEqual(moduleMetadata);

      // Verify string token metadata is preserved
      expect(cache2.getProviderMetadata(stringToken2)).toEqual(providerMetadata);
    });

    it('should preserve route metadata through serialization round-trip', () => {
      const token: Token = 'UserController';
      const routes: RouteEntry[] = [
        {
          method: 'GET',
          path: '/users',
          pattern: /^\/users$/,
          paramNames: [],
          handler: async () => ({ users: [] }),
        },
        {
          method: 'POST',
          path: '/users',
          pattern: /^\/users$/,
          paramNames: [],
          handler: async () => ({ id: 1 }),
        },
      ];

      cache.setRouteMetadata(token, routes);
      const json = cache.serialize();

      const cache2 = new MetadataCache();
      cache2.deserialize(json);

      const retrieved = cache2.getRouteMetadata(token);
      expect(retrieved).toHaveLength(2);
      expect(retrieved![0].method).toBe('GET');
      expect(retrieved![0].path).toBe('/users');
      expect(retrieved![1].method).toBe('POST');
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle mixed metadata types for same token', () => {
      const token: Token = 'UserModule';

      const moduleMetadata: ModuleMetadata = {
        providers: ['UserService'],
        imports: ['DatabaseModule'],
      };

      const routes: RouteEntry[] = [
        {
          method: 'GET',
          path: '/users',
          pattern: /^\/users$/,
          paramNames: [],
          handler: async () => ({ users: [] }),
        },
      ];

      const providerMetadata = { singleton: true };

      cache.setModuleMetadata(token, moduleMetadata);
      cache.setRouteMetadata(token, routes);
      cache.setProviderMetadata(token, providerMetadata);

      expect(cache.getModuleMetadata(token)).toEqual(moduleMetadata);
      expect(cache.getRouteMetadata(token)).toEqual(routes);
      expect(cache.getProviderMetadata(token)).toEqual(providerMetadata);
      expect(cache.has(token)).toBe(true);
    });

    it('should handle multiple tokens independently', () => {
      const token1: Token = 'Module1';
      const token2: Token = 'Module2';
      const token3: Token = Symbol('Module3');

      const metadata1: ModuleMetadata = { providers: ['Service1'] };
      const metadata2: ModuleMetadata = { providers: ['Service2'] };
      const metadata3: ModuleMetadata = { providers: ['Service3'] };

      cache.setModuleMetadata(token1, metadata1);
      cache.setModuleMetadata(token2, metadata2);
      cache.setModuleMetadata(token3, metadata3);

      expect(cache.getModuleMetadata(token1)).toEqual(metadata1);
      expect(cache.getModuleMetadata(token2)).toEqual(metadata2);
      expect(cache.getModuleMetadata(token3)).toEqual(metadata3);
    });
  });
});
