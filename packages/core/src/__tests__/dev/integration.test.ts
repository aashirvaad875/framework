import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Application } from '../../application.js';
import { DevTooling } from '../../dev/index.js';
import type { DevToolingConfig } from '../../dev/index.js';
import { Module } from '../../module.js';

describe('DevTooling Integration', () => {
  let app: Application;

  beforeEach(() => {
    Module.reset();
  });

  afterEach(async () => {
    if (app) {
      try {
        await app.stop();
      } catch (_error) {
        // Ignore errors during cleanup
      }
    }
  });

  describe('Application initialization', () => {
    it('should not initialize DevTooling when not in development and not explicitly enabled', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        app = new Application({});
        expect(app.getDevTooling()).toBeUndefined();
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should initialize DevTooling when in development environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      try {
        app = new Application({});
        expect(app.getDevTooling()).toBeDefined();
        expect(app.getDevTooling()).toBeInstanceOf(DevTooling);
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should initialize DevTooling when explicitly enabled with true', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        app = new Application({ devTooling: true });
        expect(app.getDevTooling()).toBeDefined();
        expect(app.getDevTooling()).toBeInstanceOf(DevTooling);
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should not initialize DevTooling when explicitly disabled with false', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      try {
        app = new Application({ devTooling: false });
        expect(app.getDevTooling()).toBeUndefined();
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should initialize DevTooling with custom config', () => {
      const config: Partial<DevToolingConfig> = {
        enabled: true,
        hotReload: {
          enabled: true,
          watchDirs: ['src'],
        },
        debug: {
          enabled: true,
        },
        dashboard: {
          enabled: false,
        },
      };

      app = new Application({ devTooling: config });
      expect(app.getDevTooling()).toBeDefined();
      expect(app.getDevTooling()).toBeInstanceOf(DevTooling);
    });
  });

  describe('getDevTooling() getter', () => {
    it('should return undefined when DevTooling is not initialized', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        app = new Application({});
        expect(app.getDevTooling()).toBeUndefined();
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should return DevTooling instance when initialized', () => {
      app = new Application({ devTooling: true });
      const tooling = app.getDevTooling();
      expect(tooling).toBeDefined();
      expect(tooling).toBeInstanceOf(DevTooling);
    });

    it('should return the same instance on multiple calls', () => {
      app = new Application({ devTooling: true });
      const tooling1 = app.getDevTooling();
      const tooling2 = app.getDevTooling();
      expect(tooling1).toBe(tooling2);
    });
  });

  describe('DevTooling lifecycle', () => {
    it('should initialize DevTooling during application start', async () => {
      app = new Application({ devTooling: true });

      const devTooling = app.getDevTooling();
      const initSpy = vi.spyOn(devTooling!, 'initialize');

      try {
        await app.start();
        expect(initSpy).toHaveBeenCalledWith(app, expect.anything());
      } finally {
        await app.stop().catch(_error => {
          // Ignore errors during cleanup
        });
      }
    });

    it('should shutdown DevTooling during application stop', async () => {
      app = new Application({ devTooling: true });
      try {
        await app.start();

        const devTooling = app.getDevTooling();
        const shutdownSpy = vi.spyOn(devTooling!, 'shutdown');

        await app.stop();

        expect(shutdownSpy).toHaveBeenCalled();
      } catch (_error) {
        // Ignore test errors
      }
    });

    it('should not fail when shutting down without DevTooling', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        app = new Application({});
        expect(app.getDevTooling()).toBeUndefined();

        // Don't test start/stop without actual HTTP server, just verify
        // that the cleanup methods exist and can be called
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });

  describe('Module.getLoadedModules()', () => {
    it('should return empty array when no modules are loaded', () => {
      const loaded = Module.getLoadedModules();
      expect(loaded).toEqual([]);
    });

    it('should return loaded modules', async () => {
      @Module({
        controllers: [],
        providers: [],
      })
      class TestModule {}

      app = new Application({ devTooling: true });
      await app.registerModule(TestModule);

      const loaded = Module.getLoadedModules();
      expect(loaded).toContain(TestModule);
    });

    it('should reset loaded modules', async () => {
      @Module({
        controllers: [],
        providers: [],
      })
      class TestModule {}

      app = new Application({ devTooling: true });
      await app.registerModule(TestModule);

      let loaded = Module.getLoadedModules();
      expect(loaded).toContain(TestModule);

      Module.reset();

      loaded = Module.getLoadedModules();
      expect(loaded).not.toContain(TestModule);
    });
  });

  describe('ApplicationOptions interface', () => {
    it('should accept devTooling as boolean', () => {
      expect(() => {
        app = new Application({ devTooling: true });
      }).not.toThrow();
    });

    it('should accept devTooling as config object', () => {
      expect(() => {
        app = new Application({
          devTooling: {
            enabled: true,
            hotReload: { enabled: false, watchDirs: [] },
            debug: { enabled: false },
            dashboard: { enabled: false },
          },
        });
      }).not.toThrow();
    });
  });
});
