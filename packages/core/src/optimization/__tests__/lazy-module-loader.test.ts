import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LazyModuleLoader } from '../layer1/lazy-module-loader.js';
import type { Token } from '../../di/types.js';

describe('LazyModuleLoader', () => {
  let loader: LazyModuleLoader;

  beforeEach(() => {
    loader = new LazyModuleLoader();
  });

  afterEach(async () => {
    // Wait for all pending background loads to complete before clearing
    // This prevents unhandled rejections from setImmediate tasks
    let attempts = 0;
    while (loader.getPendingCount() > 0 && attempts < 10) {
      await new Promise(resolve => setImmediate(resolve));
      attempts++;
    }
    loader.clear();
  });

  describe('register', () => {
    it('should register a module with a factory function', () => {
      const token: Token = 'TestModule';
      const factory = vi.fn(async () => ({ name: 'test' }));

      loader.register(token, factory);

      expect(loader.has(token)).toBe(true);
    });

    it('should register multiple modules', () => {
      const token1: Token = 'Module1';
      const token2: Token = 'Module2';
      const factory1 = vi.fn(async () => ({ name: 'module1' }));
      const factory2 = vi.fn(async () => ({ name: 'module2' }));

      loader.register(token1, factory1);
      loader.register(token2, factory2);

      expect(loader.has(token1)).toBe(true);
      expect(loader.has(token2)).toBe(true);
    });

    it('should handle class tokens', () => {
      class TestModule {}
      const factory = vi.fn(async () => ({ name: 'test' }));

      loader.register(TestModule, factory);

      expect(loader.has(TestModule)).toBe(true);
    });

    it('should handle symbol tokens', () => {
      const token = Symbol('TestModule');
      const factory = vi.fn(async () => ({ name: 'test' }));

      loader.register(token, factory);

      expect(loader.has(token)).toBe(true);
    });
  });

  describe('loadCritical', () => {
    it('should load critical modules immediately', async () => {
      const token: Token = 'CriticalModule';
      const factory = vi.fn(async () => ({ name: 'critical' }));

      loader.register(token, factory);
      await loader.loadCritical([token]);

      expect(loader.isLoaded(token)).toBe(true);
      expect(factory).toHaveBeenCalled();
    });

    it('should load multiple critical modules', async () => {
      const token1: Token = 'Module1';
      const token2: Token = 'Module2';
      const factory1 = vi.fn(async () => ({ name: 'module1' }));
      const factory2 = vi.fn(async () => ({ name: 'module2' }));

      loader.register(token1, factory1);
      loader.register(token2, factory2);

      await loader.loadCritical([token1, token2]);

      expect(loader.isLoaded(token1)).toBe(true);
      expect(loader.isLoaded(token2)).toBe(true);
      expect(factory1).toHaveBeenCalled();
      expect(factory2).toHaveBeenCalled();
    });

    it('should handle empty critical list', async () => {
      await expect(loader.loadCritical([])).resolves.toBeUndefined();
    });

    it('should cache loaded instances', async () => {
      const token: Token = 'CriticalModule';
      const instance = { name: 'critical' };
      const factory = vi.fn(async () => instance);

      loader.register(token, factory);
      const result1 = await loader.ensureLoaded(token);

      expect(factory).toHaveBeenCalledTimes(1);
      expect(result1).toBe(instance);
    });
  });

  describe('loadInBackground', () => {
    it('should queue modules for background loading', () => {
      const token: Token = 'BackgroundModule';
      const factory = vi.fn(async () => ({ name: 'background' }));

      loader.register(token, factory);
      loader.loadInBackground([token]);

      expect(loader.getPendingCount()).toBeGreaterThan(0);
    });

    it('should load deferred modules asynchronously', async () => {
      const token: Token = 'BackgroundModule';
      const factory = vi.fn(async () => ({ name: 'background' }));

      loader.register(token, factory);
      loader.loadInBackground([token]);

      // Allow background task to execute
      await new Promise(resolve => setImmediate(resolve));

      expect(loader.isLoaded(token)).toBe(true);
      expect(factory).toHaveBeenCalled();
    });

    it('should queue multiple deferred modules', async () => {
      const token1: Token = 'Module1';
      const token2: Token = 'Module2';
      const factory1 = vi.fn(async () => ({ name: 'module1' }));
      const factory2 = vi.fn(async () => ({ name: 'module2' }));

      loader.register(token1, factory1);
      loader.register(token2, factory2);

      const pendingBefore = loader.getPendingCount();
      loader.loadInBackground([token1, token2]);
      const pendingAfter = loader.getPendingCount();

      expect(pendingAfter).toBeGreaterThan(pendingBefore);

      await new Promise(resolve => setImmediate(resolve));

      expect(loader.isLoaded(token1)).toBe(true);
      expect(loader.isLoaded(token2)).toBe(true);
    });

    it('should handle empty deferred list', () => {
      expect(() => loader.loadInBackground([])).not.toThrow();
    });
  });

  describe('ensureLoaded', () => {
    it('should return cached instance if already loaded', async () => {
      const token: Token = 'TestModule';
      const instance = { name: 'test' };
      const factory = vi.fn(async () => instance);

      loader.register(token, factory);
      await loader.loadCritical([token]);

      const result = await loader.ensureLoaded(token);

      expect(result).toBe(instance);
      expect(factory).toHaveBeenCalledTimes(1);
    });

    it('should load and cache module if not yet loaded', async () => {
      const token: Token = 'TestModule';
      const instance = { name: 'test' };
      const factory = vi.fn(async () => instance);

      loader.register(token, factory);
      const result = await loader.ensureLoaded(token);

      expect(result).toBe(instance);
      expect(loader.isLoaded(token)).toBe(true);
    });

    it('should deduplicate loading promises', async () => {
      const token: Token = 'TestModule';
      const factory = vi.fn(async () => {
        // Simulate slow loading
        await new Promise(resolve => setTimeout(resolve, 50));
        return { name: 'test' };
      });

      loader.register(token, factory);

      const promise1 = loader.ensureLoaded(token);
      const promise2 = loader.ensureLoaded(token);

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1).toBe(result2);
      expect(factory).toHaveBeenCalledTimes(1);
    });

    it('should block until module is loaded', async () => {
      const token: Token = 'TestModule';
      const instance = { name: 'test' };
      let resolveFactory: (() => void) | null = null;
      const factory = vi.fn(() => {
        return new Promise(resolve => {
          resolveFactory = () => resolve(instance);
        });
      });

      loader.register(token, factory);

      const ensurePromise = loader.ensureLoaded(token);
      expect(loader.isLoaded(token)).toBe(false);

      if (resolveFactory) {
        resolveFactory();
      }

      const result = await ensurePromise;
      expect(result).toBe(instance);
      expect(loader.isLoaded(token)).toBe(true);
    });
  });

  describe('isLoaded', () => {
    it('should return false for unloaded modules', () => {
      const token: Token = 'TestModule';
      const factory = vi.fn(async () => ({ name: 'test' }));

      loader.register(token, factory);

      expect(loader.isLoaded(token)).toBe(false);
    });

    it('should return true for loaded modules', async () => {
      const token: Token = 'TestModule';
      const factory = vi.fn(async () => ({ name: 'test' }));

      loader.register(token, factory);
      await loader.loadCritical([token]);

      expect(loader.isLoaded(token)).toBe(true);
    });

    it('should return false for non-existent modules', () => {
      const token: Token = 'NonExistentModule';

      expect(loader.isLoaded(token)).toBe(false);
    });
  });

  describe('has', () => {
    it('should return true for registered modules', () => {
      const token: Token = 'TestModule';
      const factory = vi.fn(async () => ({ name: 'test' }));

      loader.register(token, factory);

      expect(loader.has(token)).toBe(true);
    });

    it('should return false for unregistered modules', () => {
      const token: Token = 'NonExistentModule';

      expect(loader.has(token)).toBe(false);
    });

    it('should return true for registered but unloaded modules', () => {
      const token: Token = 'TestModule';
      const factory = vi.fn(async () => ({ name: 'test' }));

      loader.register(token, factory);

      expect(loader.has(token)).toBe(true);
      expect(loader.isLoaded(token)).toBe(false);
    });
  });

  describe('getPendingCount', () => {
    it('should return 0 initially', () => {
      expect(loader.getPendingCount()).toBe(0);
    });

    it('should return number of pending background loads', () => {
      const token1: Token = 'Module1';
      const token2: Token = 'Module2';
      const factory1 = vi.fn(async () => ({ name: 'module1' }));
      const factory2 = vi.fn(async () => ({ name: 'module2' }));

      loader.register(token1, factory1);
      loader.register(token2, factory2);

      loader.loadInBackground([token1, token2]);
      const pending = loader.getPendingCount();

      expect(pending).toBeGreaterThan(0);
    });

    it('should decrease pending count after loading', async () => {
      const token: Token = 'BackgroundModule';
      const factory = vi.fn(async () => ({ name: 'background' }));

      loader.register(token, factory);
      loader.loadInBackground([token]);

      const pendingBefore = loader.getPendingCount();
      expect(pendingBefore).toBeGreaterThan(0);

      await new Promise(resolve => setImmediate(resolve));

      const pendingAfter = loader.getPendingCount();
      expect(pendingAfter).toBe(0);
    });
  });

  describe('clear', () => {
    it('should clear all modules', () => {
      const token1: Token = 'Module1';
      const token2: Token = 'Module2';
      const factory1 = vi.fn(async () => ({ name: 'module1' }));
      const factory2 = vi.fn(async () => ({ name: 'module2' }));

      loader.register(token1, factory1);
      loader.register(token2, factory2);

      expect(loader.has(token1)).toBe(true);
      expect(loader.has(token2)).toBe(true);

      loader.clear();

      expect(loader.has(token1)).toBe(false);
      expect(loader.has(token2)).toBe(false);
    });

    it('should reset pending count on clear', async () => {
      const token: Token = 'BackgroundModule';
      const factory = vi.fn(async () => ({ name: 'background' }));

      loader.register(token, factory);
      loader.loadInBackground([token]);

      expect(loader.getPendingCount()).toBeGreaterThan(0);

      loader.clear();

      expect(loader.getPendingCount()).toBe(0);
    });

    it('should allow re-registration after clear', async () => {
      const token: Token = 'Module';
      const factory1 = vi.fn(async () => ({ name: 'v1' }));
      const factory2 = vi.fn(async () => ({ name: 'v2' }));

      loader.register(token, factory1);
      await loader.loadCritical([token]);

      expect(loader.isLoaded(token)).toBe(true);

      loader.clear();

      loader.register(token, factory2);
      expect(loader.has(token)).toBe(true);
      expect(loader.isLoaded(token)).toBe(false);
    });
  });

  describe('mixed critical and deferred loading', () => {
    it('should load critical immediately and deferred later', async () => {
      const criticalToken: Token = 'CriticalModule';
      const deferredToken: Token = 'DeferredModule';
      const criticalFactory = vi.fn(async () => ({ name: 'critical' }));
      const deferredFactory = vi.fn(async () => ({ name: 'deferred' }));

      loader.register(criticalToken, criticalFactory);
      loader.register(deferredToken, deferredFactory);

      await loader.loadCritical([criticalToken]);
      loader.loadInBackground([deferredToken]);

      expect(loader.isLoaded(criticalToken)).toBe(true);
      expect(loader.isLoaded(deferredToken)).toBe(false);

      await new Promise(resolve => setImmediate(resolve));

      expect(loader.isLoaded(deferredToken)).toBe(true);
      expect(criticalFactory).toHaveBeenCalledTimes(1);
      expect(deferredFactory).toHaveBeenCalledTimes(1);
    });

    it('should handle ensureLoaded during background loading', async () => {
      const token: Token = 'TestModule';
      const instance = { name: 'test' };
      const factory = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return instance;
      });

      loader.register(token, factory);
      loader.loadInBackground([token]);

      const result = await loader.ensureLoaded(token);

      expect(result).toBe(instance);
      expect(loader.isLoaded(token)).toBe(true);
      expect(factory).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    it('should handle factory errors gracefully', async () => {
      const token: Token = 'ErrorModule';
      const error = new Error('Factory failed');
      const factory = vi.fn(async () => {
        throw error;
      });

      loader.register(token, factory);

      await expect(loader.loadCritical([token])).rejects.toThrow('Factory failed');
    });

    it('should handle errors in background loading', async () => {
      const token: Token = 'ErrorModule';
      const error = new Error('Factory failed');
      const factory = vi.fn(async () => {
        throw error;
      });

      loader.register(token, factory);
      loader.loadInBackground([token]);

      await new Promise(resolve => setImmediate(resolve));

      await expect(loader.ensureLoaded(token)).rejects.toThrow('Factory failed');
    });

    it('should not call factory for unregistered tokens', async () => {
      const token: Token = 'UnregisteredModule';

      await expect(loader.ensureLoaded(token)).rejects.toThrow();
    });
  });
});
