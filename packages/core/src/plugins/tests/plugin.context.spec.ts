import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PluginContextImpl } from '../plugin.context.js';
import type { PluginManifest } from '../types.js';

describe('PluginContext', () => {
  let mockApp: any;
  let mockContainer: any;
  let mockEventBus: any;
  let mockLogger: any;
  const manifest: PluginManifest = {
    name: 'test-plugin',
    version: '1.0.0',
    description: 'Test',
    author: 'Test',
    keywords: [],
    dependencies: [],
    capabilities: {}
  };

  beforeEach(() => {
    mockApp = {};
    mockContainer = {};
    mockEventBus = {};
    mockLogger = {};
  });

  it('should store and retrieve plugin scope values', () => {
    const context = new PluginContextImpl(
      'test-id',
      manifest,
      mockApp,
      mockContainer,
      mockEventBus,
      mockLogger
    );

    context.pluginScope.set('cache', { clear: () => {} });

    expect(context.pluginScope.has('cache')).toBe(true);
    expect(context.pluginScope.get('cache')).toBeDefined();
  });

  it('should allow registering lifecycle hooks', () => {
    const context = new PluginContextImpl(
      'test-id',
      manifest,
      mockApp,
      mockContainer,
      mockEventBus,
      mockLogger
    );

    const loadFn = vi.fn();

    context.onLoad(loadFn);

    expect(context['onLoadHooks']).toHaveLength(1);
    expect(context['onLoadHooks'][0]).toBe(loadFn);
  });

  it('should store plugin configuration', () => {
    const config = {
      jwtSecret: 'secret-key',
      jwtExpiry: 3600
    };

    const context = new PluginContextImpl(
      'test-id',
      manifest,
      mockApp,
      mockContainer,
      mockEventBus,
      mockLogger,
      config
    );

    expect(context.config.jwtSecret).toBe('secret-key');
    expect(context.config.jwtExpiry).toBe(3600);
  });

  it('should execute load hooks', async () => {
    const context = new PluginContextImpl(
      'test-id',
      manifest,
      mockApp,
      mockContainer,
      mockEventBus,
      mockLogger
    );

    const hook1 = vi.fn();
    const hook2 = vi.fn();

    context.onLoad(hook1);
    context.onLoad(hook2);

    await context.executeLoadHooks();

    expect(hook1).toHaveBeenCalledWith(context);
    expect(hook2).toHaveBeenCalledWith(context);
  });

  it('should execute unload hooks', async () => {
    const context = new PluginContextImpl(
      'test-id',
      manifest,
      mockApp,
      mockContainer,
      mockEventBus,
      mockLogger
    );

    const hook1 = vi.fn();
    const hook2 = vi.fn();

    context.onUnload(hook1);
    context.onUnload(hook2);

    await context.executeUnloadHooks();

    expect(hook1).toHaveBeenCalledWith(context);
    expect(hook2).toHaveBeenCalledWith(context);
  });

  it('should store and retrieve plugin metadata', () => {
    const context = new PluginContextImpl(
      'test-id',
      manifest,
      mockApp,
      mockContainer,
      mockEventBus,
      mockLogger
    );

    expect(context.id).toBe('test-id');
    expect(context.manifest).toBe(manifest);
    expect(context.version).toBe('1.0.0');
    expect(context.app).toBe(mockApp);
    expect(context.container).toBe(mockContainer);
    expect(context.eventBus).toBe(mockEventBus);
    expect(context.logger).toBe(mockLogger);
  });
});
