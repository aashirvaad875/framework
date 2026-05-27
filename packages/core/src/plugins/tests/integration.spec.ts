import { describe, it, expect, beforeEach } from 'vitest';
import { Application } from '../../application.js';
import { Container } from '../../di/index.js';
import { PluginManager } from '../plugin.manager.js';
import type { PluginManifest, PluginContext } from '../types.js';

describe('Plugin System Integration', () => {
  let app: Application;
  let container: Container;
  let pluginManager: PluginManager;

  beforeEach(() => {
    app = new Application();
    container = app.container;
    pluginManager = new PluginManager(app, container);
  });

  describe('Plugin Registration and Loading', () => {
    it('should register and load a basic plugin', async () => {
      const manifest: PluginManifest = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin',
        author: 'Test Author',
        keywords: ['test'],
        dependencies: [],
        capabilities: {},
      };

      let loadCalled = false;
      const pluginModule = {
        onLoad: async (context: PluginContext) => {
          loadCalled = true;
          expect(context.id).toBe('test-plugin');
          expect(context.manifest.name).toBe('test-plugin');
          expect(context.version).toBe('1.0.0');
        },
      };

      pluginManager.registerPlugin(manifest, pluginModule);
      const plugins = pluginManager.resolveDependencies();

      expect(plugins).toHaveLength(1);
      expect(plugins[0].id).toBe('test-plugin');
      expect(plugins[0].manifest.name).toBe('test-plugin');

      await pluginManager.loadPlugins();
      expect(loadCalled).toBe(true);
    });

    it('should track plugin lifecycle state correctly', async () => {
      const manifest: PluginManifest = {
        name: 'lifecycle-plugin',
        version: '1.0.0',
        description: 'Lifecycle test',
        author: 'Test',
        keywords: [],
        dependencies: [],
        capabilities: {},
      };

      const pluginModule = {
        onLoad: async () => {
          // noop
        },
      };

      pluginManager.registerPlugin(manifest, pluginModule);

      let metadata = pluginManager.getPlugin('lifecycle-plugin');
      expect(metadata?.lifecycleState).toMatch(/unloaded|loading/);

      await pluginManager.loadPlugins();

      metadata = pluginManager.getPlugin('lifecycle-plugin');
      expect(metadata?.lifecycleState).toBe('loaded');
    });

    it('should retrieve only loaded plugins', async () => {
      const manifest1: PluginManifest = {
        name: 'plugin-one',
        version: '1.0.0',
        description: 'One',
        author: 'Test',
        keywords: [],
        dependencies: [],
        capabilities: {},
      };

      const manifest2: PluginManifest = {
        name: 'plugin-two',
        version: '1.0.0',
        description: 'Two',
        author: 'Test',
        keywords: [],
        dependencies: [],
        capabilities: {},
      };

      pluginManager.registerPlugin(manifest1, { onLoad: async () => {} });
      pluginManager.registerPlugin(manifest2, { onLoad: async () => {} });

      let loadedPlugins = pluginManager.getLoadedPlugins();
      expect(loadedPlugins).toHaveLength(0);

      await pluginManager.loadPlugins();

      loadedPlugins = pluginManager.getLoadedPlugins();
      expect(loadedPlugins).toHaveLength(2);
      expect(loadedPlugins.map(p => p.id)).toContain('plugin-one');
      expect(loadedPlugins.map(p => p.id)).toContain('plugin-two');
    });
  });

  describe('Plugin Dependency Resolution', () => {
    it('should resolve plugins in correct dependency order', async () => {
      const databaseManifest: PluginManifest = {
        name: 'database-plugin',
        version: '1.0.0',
        description: 'Database',
        author: 'Test',
        keywords: [],
        dependencies: [],
        capabilities: {},
      };

      const authManifest: PluginManifest = {
        name: 'auth-plugin',
        version: '1.0.0',
        description: 'Auth',
        author: 'Test',
        keywords: [],
        dependencies: ['database-plugin'],
        capabilities: {},
      };

      const apiManifest: PluginManifest = {
        name: 'api-plugin',
        version: '1.0.0',
        description: 'API',
        author: 'Test',
        keywords: [],
        dependencies: ['auth-plugin'],
        capabilities: {},
      };

      pluginManager.registerPlugin(databaseManifest, {});
      pluginManager.registerPlugin(authManifest, {});
      pluginManager.registerPlugin(apiManifest, {});

      const sorted = pluginManager.resolveDependencies();
      const ids = sorted.map(p => p.id);

      expect(ids.indexOf('database-plugin')).toBeLessThan(ids.indexOf('auth-plugin'));
      expect(ids.indexOf('auth-plugin')).toBeLessThan(ids.indexOf('api-plugin'));
    });

    it('should handle multiple independent dependency chains', async () => {
      const manifest1: PluginManifest = {
        name: 'logger-plugin',
        version: '1.0.0',
        description: 'Logger',
        author: 'Test',
        keywords: [],
        dependencies: [],
        capabilities: {},
      };

      const manifest2: PluginManifest = {
        name: 'cache-plugin',
        version: '1.0.0',
        description: 'Cache',
        author: 'Test',
        keywords: [],
        dependencies: ['logger-plugin'],
        capabilities: {},
      };

      const manifest3: PluginManifest = {
        name: 'storage-plugin',
        version: '1.0.0',
        description: 'Storage',
        author: 'Test',
        keywords: [],
        dependencies: [],
        capabilities: {},
      };

      pluginManager.registerPlugin(manifest1, {});
      pluginManager.registerPlugin(manifest2, {});
      pluginManager.registerPlugin(manifest3, {});

      const sorted = pluginManager.resolveDependencies();
      const ids = sorted.map(p => p.id);

      expect(ids).toHaveLength(3);
      expect(ids.indexOf('logger-plugin')).toBeLessThan(ids.indexOf('cache-plugin'));
      // storage-plugin can be anywhere, as it has no dependencies
      expect(ids).toContain('storage-plugin');
    });

    it('should handle diamond dependency pattern', async () => {
      const baseManifest: PluginManifest = {
        name: 'base-plugin',
        version: '1.0.0',
        description: 'Base',
        author: 'Test',
        keywords: [],
        dependencies: [],
        capabilities: {},
      };

      const leftManifest: PluginManifest = {
        name: 'left-plugin',
        version: '1.0.0',
        description: 'Left',
        author: 'Test',
        keywords: [],
        dependencies: ['base-plugin'],
        capabilities: {},
      };

      const rightManifest: PluginManifest = {
        name: 'right-plugin',
        version: '1.0.0',
        description: 'Right',
        author: 'Test',
        keywords: [],
        dependencies: ['base-plugin'],
        capabilities: {},
      };

      const topManifest: PluginManifest = {
        name: 'top-plugin',
        version: '1.0.0',
        description: 'Top',
        author: 'Test',
        keywords: [],
        dependencies: ['left-plugin', 'right-plugin'],
        capabilities: {},
      };

      pluginManager.registerPlugin(baseManifest, {});
      pluginManager.registerPlugin(leftManifest, {});
      pluginManager.registerPlugin(rightManifest, {});
      pluginManager.registerPlugin(topManifest, {});

      const sorted = pluginManager.resolveDependencies();
      const ids = sorted.map(p => p.id);

      expect(ids.indexOf('base-plugin')).toBeLessThan(ids.indexOf('left-plugin'));
      expect(ids.indexOf('base-plugin')).toBeLessThan(ids.indexOf('right-plugin'));
      expect(ids.indexOf('left-plugin')).toBeLessThan(ids.indexOf('top-plugin'));
      expect(ids.indexOf('right-plugin')).toBeLessThan(ids.indexOf('top-plugin'));
    });
  });

  describe('Plugin Context and Framework Access', () => {
    it('should provide plugin context with all required framework services', async () => {
      let contextProvided: PluginContext | null = null;

      const manifest: PluginManifest = {
        name: 'context-test-plugin',
        version: '1.0.0',
        description: 'Context test',
        author: 'Test',
        keywords: [],
        dependencies: [],
        capabilities: {},
      };

      const pluginModule = {
        onLoad: async (context: PluginContext) => {
          contextProvided = context;
        },
      };

      pluginManager.registerPlugin(manifest, pluginModule);
      await pluginManager.loadPlugins();

      expect(contextProvided).toBeDefined();
      expect(contextProvided?.id).toBe('context-test-plugin');
      expect(contextProvided?.app).toBe(app);
      expect(contextProvided?.container).toBe(container);
      expect(contextProvided?.eventBus).toBeDefined();
      expect(contextProvided?.logger).toBeDefined();
      expect(contextProvided?.manifest).toBe(manifest);
      expect(contextProvided?.version).toBe('1.0.0');
    });

    it('should allow plugins to store data in plugin scope', async () => {
      const manifest: PluginManifest = {
        name: 'scope-test-plugin',
        version: '1.0.0',
        description: 'Scope test',
        author: 'Test',
        keywords: [],
        dependencies: [],
        capabilities: {},
      };

      const pluginModule = {
        onLoad: async (context: PluginContext) => {
          context.pluginScope.set('initialized', true);
          context.pluginScope.set('config', { apiKey: 'test-key' });
          context.pluginScope.set('cache', new Map());
        },
      };

      pluginManager.registerPlugin(manifest, pluginModule);
      await pluginManager.loadPlugins();

      const plugin = pluginManager.getPlugin('scope-test-plugin');
      expect(plugin).toBeDefined();
    });

    it('should provide plugin-specific configuration from app', async () => {
      app.setPluginConfig({
        'config-plugin': {
          jwtSecret: 'test-secret',
          jwtExpiry: 3600,
          apiUrl: 'https://api.test.com',
        },
      });

      let contextConfig: Record<string, unknown> | null = null;

      const manifest: PluginManifest = {
        name: 'config-plugin',
        version: '1.0.0',
        description: 'Config test',
        author: 'Test',
        keywords: [],
        dependencies: [],
        capabilities: {},
      };

      const pluginModule = {
        onLoad: async (context: PluginContext) => {
          contextConfig = context.config;
        },
      };

      pluginManager.registerPlugin(manifest, pluginModule);
      await pluginManager.loadPlugins();

      expect(contextConfig).toBeDefined();
      expect(contextConfig?.jwtSecret).toBe('test-secret');
      expect(contextConfig?.jwtExpiry).toBe(3600);
      expect(contextConfig?.apiUrl).toBe('https://api.test.com');
    });

    it('should allow plugins to access container for dependency injection', async () => {
      let containerAccessed = false;

      const manifest: PluginManifest = {
        name: 'di-plugin',
        version: '1.0.0',
        description: 'DI test',
        author: 'Test',
        keywords: [],
        dependencies: [],
        capabilities: {},
      };

      const pluginModule = {
        onLoad: async (context: PluginContext) => {
          containerAccessed = context.container !== undefined;
          expect(context.container).toBe(container);
        },
      };

      pluginManager.registerPlugin(manifest, pluginModule);
      await pluginManager.loadPlugins();

      expect(containerAccessed).toBe(true);
    });
  });

  describe('Plugin Integration with Application', () => {
    it('should register plugins through application instance', async () => {
      const manifest: PluginManifest = {
        name: 'app-plugin',
        version: '1.0.0',
        description: 'App plugin',
        author: 'Test',
        keywords: [],
        dependencies: [],
        capabilities: {},
      };

      let loadCalled = false;
      const pluginModule = {
        onLoad: async () => {
          loadCalled = true;
        },
      };

      app.registerPlugin(manifest, pluginModule);
      const manager = app.getPluginManager();

      expect(manager).toBeDefined();
      expect(manager?.getPlugin('app-plugin')).toBeDefined();

      await manager?.loadPlugins();
      expect(loadCalled).toBe(true);
    });

    it('should handle multiple plugins with complex dependencies via application', async () => {
      const loadOrder: string[] = [];

      const manifest1: PluginManifest = {
        name: 'plugin-alpha',
        version: '1.0.0',
        description: 'Alpha',
        author: 'Test',
        keywords: [],
        dependencies: [],
        capabilities: {},
      };

      const manifest2: PluginManifest = {
        name: 'plugin-beta',
        version: '1.0.0',
        description: 'Beta',
        author: 'Test',
        keywords: [],
        dependencies: ['plugin-alpha'],
        capabilities: {},
      };

      const manifest3: PluginManifest = {
        name: 'plugin-gamma',
        version: '1.0.0',
        description: 'Gamma',
        author: 'Test',
        keywords: [],
        dependencies: ['plugin-beta'],
        capabilities: {},
      };

      app.registerPlugin(manifest1, {
        onLoad: async () => {
          loadOrder.push('alpha');
        },
      });

      app.registerPlugin(manifest2, {
        onLoad: async () => {
          loadOrder.push('beta');
        },
      });

      app.registerPlugin(manifest3, {
        onLoad: async () => {
          loadOrder.push('gamma');
        },
      });

      const manager = app.getPluginManager();
      await manager?.loadPlugins();

      expect(loadOrder).toEqual(['alpha', 'beta', 'gamma']);
    });

    it('should provide plugin context with reference to application', async () => {
      let contextApp: Application | null = null;

      const manifest: PluginManifest = {
        name: 'app-ref-plugin',
        version: '1.0.0',
        description: 'App ref plugin',
        author: 'Test',
        keywords: [],
        dependencies: [],
        capabilities: {},
      };

      const pluginModule = {
        onLoad: async (context: PluginContext) => {
          contextApp = context.app;
        },
      };

      app.registerPlugin(manifest, pluginModule);
      const manager = app.getPluginManager();
      await manager?.loadPlugins();

      expect(contextApp).toBe(app);
    });
  });
});
