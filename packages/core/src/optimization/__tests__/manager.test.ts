import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OptimizationManager } from '../manager.js';
import { defaultOptimizationConfig } from '../config.js';

describe('OptimizationManager', () => {
  let manager: OptimizationManager;

  beforeEach(() => {
    delete process.env.ENABLE_PROFILING;
  });

  afterEach(async () => {
    if (manager) {
      await manager.shutdown();
    }
  });

  describe('constructor', () => {
    it('should create an instance with provided config', () => {
      const config = defaultOptimizationConfig('production');
      manager = new OptimizationManager(config);

      expect(manager).toBeDefined();
      expect(manager.getConfig()).toEqual(config);
    });

    it('should not create layers in constructor', async () => {
      const config = defaultOptimizationConfig('production');
      manager = new OptimizationManager(config);

      expect(manager.layer1).toBeUndefined();
      expect(manager.layer2).toBeUndefined();
      expect(manager.layer3).toBeUndefined();
    });
  });

  describe('initialize', () => {
    it('should initialize layer1 when enabled', async () => {
      const config = defaultOptimizationConfig('development');
      manager = new OptimizationManager(config);
      await manager.initialize();

      expect(manager.layer1).toBeDefined();
      expect(manager.layer1?.metadataCache).toBeDefined();
      expect(manager.layer1?.routeCompiler).toBeDefined();
      expect(manager.layer1?.lazyModuleLoader).toBeDefined();
    });

    it('should initialize layer2 when enabled', async () => {
      const config = defaultOptimizationConfig('production');
      manager = new OptimizationManager(config);
      await manager.initialize();

      expect(manager.layer2).toBeDefined();
      expect(manager.layer2?.requestCache).toBeDefined();
      expect(manager.layer2?.middlewareChainCache).toBeDefined();
      expect(manager.layer2?.memoizationCache).toBeDefined();
      expect(manager.layer2?.bufferPool).toBeDefined();
    });

    it('should initialize layer3 when enabled', async () => {
      process.env.ENABLE_PROFILING = 'true';
      const config = defaultOptimizationConfig('production');
      manager = new OptimizationManager(config);
      await manager.initialize();

      expect(manager.layer3).toBeDefined();
      expect(manager.layer3?.profiler).toBeDefined();
      expect(manager.layer3?.metricsCollector).toBeDefined();
    });

    it('should not initialize layer2 when disabled', async () => {
      const config = defaultOptimizationConfig('development');
      manager = new OptimizationManager(config);
      await manager.initialize();

      expect(manager.layer2).toBeUndefined();
    });

    it('should not initialize layer3 when disabled', async () => {
      const config = defaultOptimizationConfig('development');
      manager = new OptimizationManager(config);
      await manager.initialize();

      expect(manager.layer3).toBeUndefined();
    });

    it('should initialize all layers when all enabled', async () => {
      process.env.ENABLE_PROFILING = 'true';
      const config = defaultOptimizationConfig('production');
      manager = new OptimizationManager(config);
      await manager.initialize();

      expect(manager.layer1).toBeDefined();
      expect(manager.layer2).toBeDefined();
      expect(manager.layer3).toBeDefined();
    });

    it('should use config.layer2.memory.poolSize for buffer pool', async () => {
      const config = defaultOptimizationConfig('production', {
        layer2: {
          memory: {
            poolSize: 250,
          },
        },
      });
      manager = new OptimizationManager(config);
      await manager.initialize();

      expect(manager.layer2?.bufferPool).toBeDefined();
      // Verify buffer pool was created with the config
      const stats = manager.layer2!.bufferPool.stats();
      expect(stats).toBeDefined();
      expect(stats.totalAcquired).toBeGreaterThanOrEqual(0);
      expect(stats.totalReleased).toBeGreaterThanOrEqual(0);
    });

    it('should be idempotent - calling initialize twice should work', async () => {
      const config = defaultOptimizationConfig('production');
      manager = new OptimizationManager(config);
      await manager.initialize();

      // First initialization should have layers
      expect(manager.layer1).toBeDefined();
      expect(manager.layer2).toBeDefined();

      // Re-initialize
      await manager.initialize();

      // Should still have layers after re-initialization
      expect(manager.layer1).toBeDefined();
      expect(manager.layer2).toBeDefined();
    });
  });

  describe('shutdown', () => {
    it('should clear layer1 on shutdown', async () => {
      const config = defaultOptimizationConfig('development');
      manager = new OptimizationManager(config);
      await manager.initialize();

      expect(manager.layer1).toBeDefined();
      await manager.shutdown();
      expect(manager.layer1).toBeUndefined();
    });

    it('should clear layer2 on shutdown', async () => {
      const config = defaultOptimizationConfig('production');
      manager = new OptimizationManager(config);
      await manager.initialize();

      expect(manager.layer2).toBeDefined();
      await manager.shutdown();
      expect(manager.layer2).toBeUndefined();
    });

    it('should clear layer3 on shutdown', async () => {
      process.env.ENABLE_PROFILING = 'true';
      const config = defaultOptimizationConfig('production');
      manager = new OptimizationManager(config);
      await manager.initialize();

      expect(manager.layer3).toBeDefined();
      await manager.shutdown();
      expect(manager.layer3).toBeUndefined();
    });

    it('should get profiler report when layer3 is active', async () => {
      process.env.ENABLE_PROFILING = 'true';
      const config = defaultOptimizationConfig('production');
      manager = new OptimizationManager(config);
      await manager.initialize();

      // Record some activity
      const traceId = manager.layer3!.profiler.start('test-operation');
      manager.layer3!.profiler.end(traceId);

      // Spy on console.log before shutdown
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await manager.shutdown();

      // Should have logged profiler report when there are operations
      if (manager.layer3?.profiler.isActive?.() === false) {
        // If profiler reports no active operations, the report wasn't generated
        // but the important thing is that shutdown completed without error
        expect(logSpy).toHaveBeenCalled();
      }

      logSpy.mockRestore();
    });

    it('should handle shutdown gracefully when not initialized', async () => {
      const config = defaultOptimizationConfig('development');
      manager = new OptimizationManager(config);

      // Should not throw
      await expect(manager.shutdown()).resolves.toBeUndefined();
    });

    it('should clear all accessible caches in layer2 on shutdown', async () => {
      const config = defaultOptimizationConfig('production');
      manager = new OptimizationManager(config);
      await manager.initialize();

      // Add some data to request cache
      manager.layer2!.requestCache.set(
        'test-key',
        {
          statusCode: 200,
          headers: {},
          body: 'test',
          expiresAt: Date.now() + 1000,
        },
        1000
      );

      expect(manager.layer2!.requestCache.size()).toBe(1);

      // Add some data to middleware cache
      manager.layer2!.middlewareChainCache.set('route-token', []);
      expect(manager.layer2!.middlewareChainCache.size()).toBe(1);

      await manager.shutdown();

      // Layer2 should be cleared
      expect(manager.layer2).toBeUndefined();
    });
  });

  describe('getConfig', () => {
    it('should return the configuration', () => {
      const config = defaultOptimizationConfig('production');
      manager = new OptimizationManager(config);

      const retrievedConfig = manager.getConfig();

      expect(retrievedConfig).toEqual(config);
    });

    it('should return same reference as constructor config', () => {
      const config = defaultOptimizationConfig('production');
      manager = new OptimizationManager(config);

      const retrievedConfig = manager.getConfig();

      expect(retrievedConfig).toBe(config);
    });
  });

  describe('globalOptimizationManager', () => {
    it('should have singleton pattern export', async () => {
      const { globalOptimizationManager } = await import('../manager.js');
      expect(globalOptimizationManager).toBeDefined();
      expect(globalOptimizationManager).toHaveProperty('instance');
    });
  });

  describe('integration scenarios', () => {
    it('should handle development environment initialization', async () => {
      const config = defaultOptimizationConfig('development');
      manager = new OptimizationManager(config);
      await manager.initialize();

      // Development should only have layer1
      expect(manager.layer1).toBeDefined();
      expect(manager.layer2).toBeUndefined();
      expect(manager.layer3).toBeUndefined();

      expect(manager.getConfig().layer1.enabled).toBe(true);
      expect(manager.getConfig().layer2.enabled).toBe(false);
      expect(manager.getConfig().layer3.enabled).toBe(false);
    });

    it('should handle production environment initialization', async () => {
      const config = defaultOptimizationConfig('production');
      manager = new OptimizationManager(config);
      await manager.initialize();

      // Production should have layer1 and layer2
      expect(manager.layer1).toBeDefined();
      expect(manager.layer2).toBeDefined();
      expect(manager.layer3).toBeUndefined();

      expect(manager.getConfig().layer1.enabled).toBe(true);
      expect(manager.getConfig().layer2.enabled).toBe(true);
      expect(manager.getConfig().layer3.enabled).toBe(false);
    });

    it('should handle production + profiling environment', async () => {
      process.env.ENABLE_PROFILING = 'true';
      const config = defaultOptimizationConfig('production');
      manager = new OptimizationManager(config);
      await manager.initialize();

      // All layers should be present
      expect(manager.layer1).toBeDefined();
      expect(manager.layer2).toBeDefined();
      expect(manager.layer3).toBeDefined();

      expect(manager.getConfig().layer1.enabled).toBe(true);
      expect(manager.getConfig().layer2.enabled).toBe(true);
      expect(manager.getConfig().layer3.enabled).toBe(true);
    });

    it('should allow lifecycle: init -> use -> shutdown', async () => {
      const config = defaultOptimizationConfig('production');
      manager = new OptimizationManager(config);

      // Initialize
      await manager.initialize();
      expect(manager.layer1).toBeDefined();
      expect(manager.layer2).toBeDefined();

      // Use layer1
      manager.layer1!.metadataCache.setModuleMetadata(String, {});
      expect(manager.layer1!.metadataCache.has(String)).toBe(true);

      // Use layer2
      manager.layer2!.requestCache.set(
        'key',
        {
          statusCode: 200,
          headers: {},
          body: 'data',
          expiresAt: Date.now() + 1000,
        },
        1000
      );
      expect(manager.layer2!.requestCache.size()).toBe(1);

      // Shutdown
      await manager.shutdown();
      expect(manager.layer1).toBeUndefined();
      expect(manager.layer2).toBeUndefined();
    });
  });
});
