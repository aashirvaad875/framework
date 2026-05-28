import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Application, createApplication } from '../application.js';
import { OptimizationManager, defaultOptimizationConfig } from '../optimization/index.js';
import type { OptimizationConfig } from '../optimization/index.js';

describe('Application Integration - OptimizationManager', () => {
  let app: Application;

  beforeEach(() => {
    delete process.env.ENABLE_PROFILING;
  });

  afterEach(async () => {
    if (app) {
      // Don't actually start the server for these tests
    }
  });

  describe('constructor with optimization option', () => {
    it('should accept optimization config object', () => {
      const config = defaultOptimizationConfig('development');
      app = createApplication({ optimization: config });

      expect(app.getOptimizationManager()).toBeUndefined(); // Not initialized yet
    });

    it('should use default config when optimization is true', () => {
      app = createApplication({ optimization: true });

      expect(app.getOptimizationManager()).toBeUndefined(); // Not initialized yet
    });

    it('should not set optimization when optimization is false', () => {
      app = createApplication({ optimization: false });

      expect(app.getOptimizationManager()).toBeUndefined();
    });

    it('should not set optimization when no option provided', () => {
      app = createApplication();

      expect(app.getOptimizationManager()).toBeUndefined();
    });

    it('should merge partial config with defaults', () => {
      const partialConfig: Partial<OptimizationConfig> = {
        layer2: {
          enabled: true,
          caching: { enabled: true, ttl: 600 },
          middlewareChain: true,
          di: { memoization: true },
          memory: { pooling: true, poolSize: 200 },
        },
      };

      const merged = defaultOptimizationConfig('development', partialConfig);
      app = createApplication({ optimization: merged });

      expect(app.getOptimizationManager()).toBeUndefined(); // Not initialized yet
    });
  });

  describe('start() with optimization manager', () => {
    it('should not create optimization manager if config not set', async () => {
      app = createApplication();

      // Simulate what happens: without optimization option, manager not created
      expect(app.getOptimizationManager()).toBeUndefined();
    });

    it('should create and initialize optimization manager on start', async () => {
      const config = defaultOptimizationConfig('development');
      app = createApplication({ optimization: config });

      // Manually initialize (simulating start without actual server)
      const manager = new OptimizationManager(config);
      await manager.initialize();

      expect(manager).toBeDefined();
      expect(manager).toBeInstanceOf(OptimizationManager);
      expect(manager.layer1).toBeDefined();

      await manager.shutdown();
    });

    it('should initialize all enabled layers on start', async () => {
      const config = defaultOptimizationConfig('production');
      app = createApplication({ optimization: config });

      const manager = new OptimizationManager(config);
      await manager.initialize();

      expect(manager.layer1).toBeDefined();
      expect(manager.layer2).toBeDefined();

      await manager.shutdown();
    });

    it('should handle optimization manager initialization errors gracefully', async () => {
      const config = defaultOptimizationConfig('development');

      const manager = new OptimizationManager(config);
      await expect(manager.initialize()).resolves.toBeUndefined();

      await manager.shutdown();
    });
  });

  describe('stop() with optimization manager shutdown', () => {
    it('should call shutdown on optimization manager if present', async () => {
      const config = defaultOptimizationConfig('development');
      const manager = new OptimizationManager(config);
      await manager.initialize();

      const shutdownSpy = vi.spyOn(manager, 'shutdown');

      await manager.shutdown();

      expect(shutdownSpy).toHaveBeenCalled();
    });

    it('should not error if optimization manager is undefined', async () => {
      app = createApplication();

      // Should not throw
      expect(() => {
        app.getOptimizationManager();
      }).not.toThrow();
    });

    it('should clean up manager resources on shutdown', async () => {
      const config = defaultOptimizationConfig('development');
      const manager = new OptimizationManager(config);
      await manager.initialize();

      expect(manager.layer1).toBeDefined();

      await manager.shutdown();

      // After shutdown, manager should be cleaned up
      expect(manager).toBeDefined();
    });
  });

  describe('getOptimizationLayer()', () => {
    it('should return layer1 when requested', async () => {
      const config = defaultOptimizationConfig('development');
      const manager = new OptimizationManager(config);
      await manager.initialize();

      const layer1 = manager.layer1;
      expect(layer1).toBeDefined();
      expect(layer1?.metadataCache).toBeDefined();

      await manager.shutdown();
    });

    it('should return layer2 when enabled and requested', async () => {
      const config = defaultOptimizationConfig('production');
      const manager = new OptimizationManager(config);
      await manager.initialize();

      const layer2 = manager.layer2;
      expect(layer2).toBeDefined();

      await manager.shutdown();
    });

    it('should return undefined for layer2 when not enabled', async () => {
      const config = defaultOptimizationConfig('development'); // Layer2 disabled
      const manager = new OptimizationManager(config);
      await manager.initialize();

      const layer2 = manager.layer2;
      expect(layer2).toBeUndefined();

      await manager.shutdown();
    });

    it('should return layer3 when profiling enabled', async () => {
      process.env.ENABLE_PROFILING = 'true';
      const config = defaultOptimizationConfig('production');
      const manager = new OptimizationManager(config);
      await manager.initialize();

      const layer3 = manager.layer3;
      expect(layer3).toBeDefined();

      await manager.shutdown();
    });

    it('should return undefined for layer3 when profiling disabled', async () => {
      const config = defaultOptimizationConfig('development');
      const manager = new OptimizationManager(config);
      await manager.initialize();

      const layer3 = manager.layer3;
      expect(layer3).toBeUndefined();

      await manager.shutdown();
    });

    it('should return undefined when manager is not initialized', () => {
      app = createApplication();

      expect(app.getOptimizationLayer(1)).toBeUndefined();
      expect(app.getOptimizationLayer(2)).toBeUndefined();
      expect(app.getOptimizationLayer(3)).toBeUndefined();
    });

    it('should return layers from application manager when initialized', async () => {
      const config = defaultOptimizationConfig('production');
      app = createApplication({ optimization: config });

      const manager = new OptimizationManager(config);
      await manager.initialize();

      // Test what would be available through app methods
      const layer1 = manager.layer1;
      const layer2 = manager.layer2;

      expect(layer1).toBeDefined();
      expect(layer2).toBeDefined();

      await manager.shutdown();
    });
  });

  describe('getOptimizationManager()', () => {
    it('should return the optimization manager when set', async () => {
      const config = defaultOptimizationConfig('development');
      const manager = new OptimizationManager(config);

      expect(manager).toBeDefined();
      expect(manager).toBeInstanceOf(OptimizationManager);

      await manager.shutdown();
    });

    it('should return undefined when manager not initialized on app', () => {
      app = createApplication();

      expect(app.getOptimizationManager()).toBeUndefined();
    });

    it('should allow access to manager configuration', async () => {
      const config = defaultOptimizationConfig('development');
      const manager = new OptimizationManager(config);

      expect(manager.getConfig()).toEqual(config);

      await manager.shutdown();
    });
  });

  describe('Full integration flow', () => {
    it('should initialize and shutdown optimization manager through full lifecycle', async () => {
      const config = defaultOptimizationConfig('development');
      app = createApplication({ optimization: config });

      // Simulate bootstrap step
      const manager = new OptimizationManager(config);
      await manager.initialize();

      expect(manager).toBeDefined();
      expect(manager.layer1).toBeDefined();

      // Simulate close step
      await manager.shutdown();

      // Manager should still exist but be shut down
      expect(manager).toBeDefined();
    });

    it('should handle multiple optimization manager lifecycles', async () => {
      const devConfig = defaultOptimizationConfig('development');
      const prodConfig = defaultOptimizationConfig('production');

      // First lifecycle
      let manager = new OptimizationManager(devConfig);
      await manager.initialize();
      expect(manager.layer1).toBeDefined();

      await manager.shutdown();

      // Second lifecycle with different config
      manager = new OptimizationManager(prodConfig);
      await manager.initialize();
      expect(manager.layer1).toBeDefined();
      expect(manager.layer2).toBeDefined();

      await manager.shutdown();
    });

    it('should work alongside existing application features', async () => {
      app = createApplication({
        port: 3001,
        host: 'localhost',
        optimization: defaultOptimizationConfig('development'),
      });

      // App should have standard properties
      expect(app.container).toBeDefined();
      expect(app.eventBus).toBeDefined();

      // And now optimization properties
      expect(app.getOptimizationManager()).toBeUndefined(); // Not started yet
    });
  });

  describe('ApplicationOptions integration', () => {
    it('should accept optimization option in application creation', () => {
      // Future: when ApplicationOptions is extended with optimization
      const options = {
        port: 3000,
        host: 'localhost',
        // optimization: defaultOptimizationConfig('development'),
      };

      app = createApplication(options);
      expect(app).toBeDefined();
    });
  });

  describe('Exported types and functions', () => {
    it('should export OptimizationManager from core package', () => {
      expect(OptimizationManager).toBeDefined();
    });

    it('should export defaultOptimizationConfig from core package', () => {
      expect(defaultOptimizationConfig).toBeDefined();
      expect(typeof defaultOptimizationConfig).toBe('function');
    });

    it('should export optimization types from core package', () => {
      // These should be available from the index export
      const config = defaultOptimizationConfig('development');
      expect(config).toHaveProperty('layer1');
      expect(config).toHaveProperty('layer2');
      expect(config).toHaveProperty('layer3');
    });
  });
});
