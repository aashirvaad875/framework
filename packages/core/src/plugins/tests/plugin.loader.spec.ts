import { describe, it, expect } from 'vitest';
import { PluginLoader } from '../plugin.loader.js';
import type { PluginManifest } from '../types.js';

describe('PluginLoader', () => {
  const loader = new PluginLoader();

  it('should validate plugin manifest with required fields', () => {
    const validManifest: PluginManifest = {
      name: 'test-plugin',
      version: '1.0.0',
      description: 'Test',
      author: 'Test',
      keywords: [],
      dependencies: [],
      capabilities: {},
    };

    expect(() => loader.validateManifest(validManifest)).not.toThrow();
  });

  it('should reject manifest without required name field', () => {
    const invalidManifest = {
      version: '1.0.0',
      description: 'Test',
      author: 'Test',
      keywords: [],
      dependencies: [],
      capabilities: {},
    } as any;

    expect(() => loader.validateManifest(invalidManifest)).toThrow('name');
  });

  it('should reject manifest without required version field', () => {
    const invalidManifest = {
      name: 'test-plugin',
      description: 'Test',
      author: 'Test',
      keywords: [],
      dependencies: [],
      capabilities: {},
    } as any;

    expect(() => loader.validateManifest(invalidManifest)).toThrow('version');
  });

  it('should load manifest from JSON', () => {
    const manifest: PluginManifest = {
      name: 'test-plugin',
      version: '1.0.0',
      description: 'Test',
      author: 'Test',
      keywords: [],
      dependencies: [],
      capabilities: {},
    };

    const json = JSON.stringify(manifest);
    const loaded = loader.parseManifestJson(json);

    expect(loaded.name).toBe('test-plugin');
    expect(loaded.version).toBe('1.0.0');
  });

  it('should handle invalid JSON gracefully', () => {
    expect(() => loader.parseManifestJson('{ invalid json }')).toThrow();
  });
});
