import { describe, it, expect } from 'vitest';
import { PluginRegistry } from '../plugin.registry.js';
import type { PluginManifest } from '../types.js';

describe('PluginRegistry', () => {
  const testManifest: PluginManifest = {
    name: 'test-plugin',
    version: '1.0.0',
    description: 'Test',
    author: 'Test',
    keywords: [],
    dependencies: [],
    capabilities: {},
  };

  it('should register and retrieve plugin metadata', () => {
    const registry = new PluginRegistry();
    const instance = { onLoad: () => {} };

    registry.register(testManifest, instance);
    const metadata = registry.get('test-plugin');

    expect(metadata).toBeDefined();
    expect(metadata?.manifest.name).toBe('test-plugin');
    expect(metadata?.instance).toBe(instance);
  });

  it('should return undefined for unregistered plugin', () => {
    const registry = new PluginRegistry();
    const metadata = registry.get('nonexistent');
    expect(metadata).toBeUndefined();
  });

  it('should check if plugin exists', () => {
    const registry = new PluginRegistry();
    const instance = { onLoad: () => {} };

    registry.register(testManifest, instance);
    expect(registry.has('test-plugin')).toBe(true);
    expect(registry.has('nonexistent')).toBe(false);
  });

  it('should return all registered plugins', () => {
    const registry = new PluginRegistry();
    const manifest1: PluginManifest = { ...testManifest, name: 'plugin-1' };
    const manifest2: PluginManifest = { ...testManifest, name: 'plugin-2' };

    registry.register(manifest1, {});
    registry.register(manifest2, {});

    const all = registry.getAll();
    expect(all).toHaveLength(2);
    expect(all.map(m => m.id)).toContain('plugin-1');
    expect(all.map(m => m.id)).toContain('plugin-2');
  });

  it('should set and get lifecycle state', () => {
    const registry = new PluginRegistry();
    registry.register(testManifest, {});

    registry.setLifecycleState('test-plugin', 'loaded');
    expect(registry.getLifecycleState('test-plugin')).toBe('loaded');

    registry.setLifecycleState('test-plugin', 'unloaded');
    expect(registry.getLifecycleState('test-plugin')).toBe('unloaded');
  });

  it('should remove plugin', () => {
    const registry = new PluginRegistry();
    registry.register(testManifest, {});

    expect(registry.has('test-plugin')).toBe(true);
    registry.remove('test-plugin');
    expect(registry.has('test-plugin')).toBe(false);
  });

  it('should clear all plugins', () => {
    const registry = new PluginRegistry();
    const manifest1: PluginManifest = { ...testManifest, name: 'plugin-1' };
    const manifest2: PluginManifest = { ...testManifest, name: 'plugin-2' };

    registry.register(manifest1, {});
    registry.register(manifest2, {});
    expect(registry.getAll()).toHaveLength(2);

    registry.clear();
    expect(registry.getAll()).toHaveLength(0);
  });
});
