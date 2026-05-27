import { describe, it, expect } from 'vitest';
import { PluginManager } from '../plugin.manager.js';
import { CircularDependencyError } from '../exceptions.js';
import type { PluginManifest } from '../types.js';

describe('PluginManager - Dependency Resolution', () => {
  it('should topologically sort plugins without dependencies', () => {
    const manager = new PluginManager(null as any, null as any);

    const manifest1: PluginManifest = {
      name: 'plugin-a',
      version: '1.0.0',
      description: 'A',
      author: 'Test',
      keywords: [],
      dependencies: [],
      capabilities: {},
    };

    const manifest2: PluginManifest = {
      name: 'plugin-b',
      version: '1.0.0',
      description: 'B',
      author: 'Test',
      keywords: [],
      dependencies: [],
      capabilities: {},
    };

    manager.registerPlugin(manifest1, {});
    manager.registerPlugin(manifest2, {});

    const sorted = manager.resolveDependencies();
    expect(sorted).toHaveLength(2);
    expect(sorted.map(p => p.id)).toContain('plugin-a');
    expect(sorted.map(p => p.id)).toContain('plugin-b');
  });

  it('should topologically sort plugins with dependencies', () => {
    const manager = new PluginManager(null as any, null as any);

    const manifestA: PluginManifest = {
      name: 'plugin-a',
      version: '1.0.0',
      description: 'A',
      author: 'Test',
      keywords: [],
      dependencies: [],
      capabilities: {},
    };

    const manifestB: PluginManifest = {
      name: 'plugin-b',
      version: '1.0.0',
      description: 'B',
      author: 'Test',
      keywords: [],
      dependencies: ['plugin-a'],
      capabilities: {},
    };

    const manifestC: PluginManifest = {
      name: 'plugin-c',
      version: '1.0.0',
      description: 'C',
      author: 'Test',
      keywords: [],
      dependencies: ['plugin-b'],
      capabilities: {},
    };

    manager.registerPlugin(manifestA, {});
    manager.registerPlugin(manifestB, {});
    manager.registerPlugin(manifestC, {});

    const sorted = manager.resolveDependencies();
    const ids = sorted.map(p => p.id);

    expect(ids.indexOf('plugin-a')).toBeLessThan(ids.indexOf('plugin-b'));
    expect(ids.indexOf('plugin-b')).toBeLessThan(ids.indexOf('plugin-c'));
  });

  it('should detect circular dependencies', () => {
    const manager = new PluginManager(null as any, null as any);

    const manifestA: PluginManifest = {
      name: 'plugin-a',
      version: '1.0.0',
      description: 'A',
      author: 'Test',
      keywords: [],
      dependencies: ['plugin-c'],
      capabilities: {},
    };

    const manifestB: PluginManifest = {
      name: 'plugin-b',
      version: '1.0.0',
      description: 'B',
      author: 'Test',
      keywords: [],
      dependencies: ['plugin-a'],
      capabilities: {},
    };

    const manifestC: PluginManifest = {
      name: 'plugin-c',
      version: '1.0.0',
      description: 'C',
      author: 'Test',
      keywords: [],
      dependencies: ['plugin-b'],
      capabilities: {},
    };

    manager.registerPlugin(manifestA, {});
    manager.registerPlugin(manifestB, {});
    manager.registerPlugin(manifestC, {});

    expect(() => manager.resolveDependencies()).toThrow(CircularDependencyError);
  });
});
