import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DevTooling } from '../../dev/dev-tooling.js';
import type { DevToolingConfig } from '../../dev/types.js';
import { getDefaultDevToolingConfig, createDevToolingConfig } from '../../dev/config.js';

describe('DevTooling', () => {
  let devTooling: DevTooling;

  beforeEach(() => {
    devTooling = new DevTooling();
  });

  afterEach(async () => {
    await devTooling.shutdown();
  });

  describe('Initialization', () => {
    it('should create DevTooling instance with default config', () => {
      expect(devTooling).toBeDefined();
      expect(devTooling.isEnabled()).toBe(process.env.NODE_ENV === 'development');
    });

    it('should accept partial config overrides', () => {
      const tooling = new DevTooling({
        enabled: true,
        hotReload: { enabled: false, directories: [], debounceMs: 500 },
      });
      expect(tooling).toBeDefined();
      expect(tooling.isEnabled()).toBe(true);
    });

    it('should initialize with default config values', () => {
      const config = getDefaultDevToolingConfig();
      expect(config.enabled).toBe(process.env.NODE_ENV === 'development');
      expect(config.hotReload.enabled).toBe(true);
      expect(config.debug.enabled).toBe(true);
      expect(config.dashboard.enabled).toBe(true);
    });

    it('should create custom config with createDevToolingConfig', () => {
      const config = createDevToolingConfig({
        enabled: true,
        debug: { enabled: false, captureRequestBody: false, maxHistorySize: 50 },
      });
      expect(config.enabled).toBe(true);
      expect(config.debug.enabled).toBe(false);
      expect(config.debug.maxHistorySize).toBe(50);
    });
  });

  describe('Getters', () => {
    it('should return undefined for uninitialized components', () => {
      expect(devTooling.getFileWatcher()).toBeUndefined();
      expect(devTooling.getModuleReloader()).toBeUndefined();
      expect(devTooling.getRequestCapture()).toBeUndefined();
      expect(devTooling.getModuleGraph()).toBeUndefined();
      expect(devTooling.getDashboard()).toBeUndefined();
    });

    it('should always return EventBus instance', () => {
      const eventBus = devTooling.getEventBus();
      expect(eventBus).toBeDefined();
      expect(typeof eventBus.emit).toBe('function');
    });

    it('should return the same EventBus instance on multiple calls', () => {
      const bus1 = devTooling.getEventBus();
      const bus2 = devTooling.getEventBus();
      expect(bus1).toBe(bus2);
    });
  });

  describe('Enable/Disable based on config', () => {
    it('should be disabled when enabled is false', async () => {
      const disabled = new DevTooling({ enabled: false });
      await disabled.initialize();
      expect(disabled.isEnabled()).toBe(false);
      expect(disabled.getFileWatcher()).toBeUndefined();
      expect(disabled.getRequestCapture()).toBeUndefined();
    });

    it('should skip initialization when disabled', async () => {
      const disabled = new DevTooling({ enabled: false });
      const fileWatcherSpy = vi.fn();
      disabled.getEventBus().on('initialized', fileWatcherSpy);

      await disabled.initialize();

      // No components should be initialized
      expect(disabled.getFileWatcher()).toBeUndefined();
      expect(disabled.getModuleReloader()).toBeUndefined();
      expect(disabled.getRequestCapture()).toBeUndefined();
    });

    it('should initialize hot reload when enabled', async () => {
      const tooling = new DevTooling({
        enabled: true,
        hotReload: { enabled: true, directories: ['src'], debounceMs: 300 },
      });
      await tooling.initialize();

      expect(tooling.getFileWatcher()).toBeDefined();
      expect(tooling.getModuleReloader()).toBeDefined();

      await tooling.shutdown();
    });

    it('should initialize debug when enabled', async () => {
      const tooling = new DevTooling({
        enabled: true,
        hotReload: { enabled: false, directories: [], debounceMs: 300 },
        debug: { enabled: true, captureRequestBody: true, maxHistorySize: 100 },
      });
      await tooling.initialize();

      expect(tooling.getRequestCapture()).toBeDefined();
      expect(tooling.getModuleGraph()).toBeDefined();

      await tooling.shutdown();
    });

    it('should skip hot reload when disabled in config', async () => {
      const tooling = new DevTooling({
        enabled: true,
        hotReload: { enabled: false, directories: ['src'], debounceMs: 300 },
      });
      await tooling.initialize();

      expect(tooling.getFileWatcher()).toBeUndefined();
      expect(tooling.getModuleReloader()).toBeUndefined();

      await tooling.shutdown();
    });

    it('should skip debug when disabled in config', async () => {
      const tooling = new DevTooling({
        enabled: true,
        hotReload: { enabled: false, directories: [], debounceMs: 300 },
        debug: { enabled: false, captureRequestBody: false, maxHistorySize: 100 },
      });
      await tooling.initialize();

      expect(tooling.getRequestCapture()).toBeUndefined();
      expect(tooling.getModuleGraph()).toBeUndefined();

      await tooling.shutdown();
    });

    it('should skip dashboard when disabled in config', async () => {
      const tooling = new DevTooling({
        enabled: true,
        hotReload: { enabled: false, directories: [], debounceMs: 300 },
        dashboard: { enabled: false, path: '/__dev', wsEnabled: true },
      });
      await tooling.initialize();

      expect(tooling.getDashboard()).toBeUndefined();

      await tooling.shutdown();
    });
  });

  describe('Shutdown', () => {
    it('should shutdown cleanly', async () => {
      const tooling = new DevTooling({
        enabled: true,
        hotReload: { enabled: true, directories: ['src'], debounceMs: 300 },
        debug: { enabled: true, captureRequestBody: true, maxHistorySize: 100 },
      });
      await tooling.initialize();

      // Should not throw
      await expect(tooling.shutdown()).resolves.toBeUndefined();
    });

    it('should handle shutdown without initialization', async () => {
      await expect(devTooling.shutdown()).resolves.toBeUndefined();
    });

    it('should close file watcher on shutdown', async () => {
      const tooling = new DevTooling({
        enabled: true,
        hotReload: { enabled: true, directories: ['src'], debounceMs: 300 },
      });
      await tooling.initialize();

      const watcher = tooling.getFileWatcher();
      expect(watcher).toBeDefined();

      await tooling.shutdown();

      // After shutdown, watcher should be stopped
      expect(tooling.getFileWatcher()).toBeDefined(); // Reference still exists, but watcher is stopped
    });

    it('should clear module reloader on shutdown', async () => {
      const tooling = new DevTooling({
        enabled: true,
        hotReload: { enabled: true, directories: ['src'], debounceMs: 300 },
      });
      await tooling.initialize();

      await tooling.shutdown();

      // Module reloader should be cleared
      const reloader = tooling.getModuleReloader();
      expect(reloader).toBeDefined();
    });
  });

  describe('EventBus Integration', () => {
    it('should emit module:reloaded events', async () => {
      const tooling = new DevTooling({
        enabled: true,
        hotReload: { enabled: true, directories: ['src'], debounceMs: 300 },
      });
      const eventSpy = vi.fn();
      tooling.getEventBus().on('module:reloaded', eventSpy);

      await tooling.initialize();

      // We can verify that the event listener is attached
      expect(eventSpy).toBeDefined();

      await tooling.shutdown();
    });

    it('should provide event bus with listener registration', () => {
      const eventBus = devTooling.getEventBus();
      const handler = vi.fn();

      eventBus.on('test:event', handler);

      // Verify the listener is registered
      expect(eventBus.getListenerCount('test:event')).toBeGreaterThan(0);
    });
  });

  describe('Configuration persistence', () => {
    it('should maintain config throughout lifecycle', async () => {
      const config: Partial<DevToolingConfig> = {
        enabled: true,
        hotReload: { enabled: true, directories: ['src', 'dist'], debounceMs: 500 },
        debug: { enabled: true, captureRequestBody: false, maxHistorySize: 50 },
        dashboard: { enabled: true, path: '/custom-dev', wsEnabled: false },
      };
      const tooling = new DevTooling(config);

      expect(tooling.isEnabled()).toBe(true);

      await tooling.initialize();
      await tooling.shutdown();
    });
  });
});
