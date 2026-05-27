import { describe, it, expect } from 'vitest';
import type { PluginManifest, PluginLifecycleState } from '../types.js';

describe('PluginManifest', () => {
  it('should define required fields', () => {
    const manifest: PluginManifest = {
      name: 'test-plugin',
      version: '1.0.0',
      description: 'Test plugin',
      author: 'Test Author',
      keywords: ['test'],
      dependencies: [],
      capabilities: {
        routes: [],
        services: [],
      },
    };
    expect(manifest.name).toBe('test-plugin');
    expect(manifest.version).toBe('1.0.0');
  });

  it('should support optional fields', () => {
    const manifest: PluginManifest = {
      name: 'test-plugin',
      version: '1.0.0',
      description: 'Test plugin',
      author: 'Test Author',
      keywords: [],
      dependencies: [],
      capabilities: {},
    };
    expect(manifest.peerDependencies).toBeUndefined();
    expect(manifest.config).toBeUndefined();
  });
});

describe('PluginLifecycleState', () => {
  it('should support all lifecycle states', () => {
    const states: PluginLifecycleState[] = ['loading', 'loaded', 'unloading', 'unloaded', 'error'];
    expect(states).toHaveLength(5);
  });
});
