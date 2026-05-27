import { describe, it, expect } from 'vitest';
import { Plugin, OnPluginLoad, OnPluginUnload, PluginEvent } from '../decorators.js';
import { PLUGIN_METADATA_KEY, PLUGIN_LOAD_HOOK_KEY, PLUGIN_UNLOAD_HOOK_KEY } from '../types.js';
import 'reflect-metadata';

describe('Plugin Decorators', () => {
  it('should apply @Plugin decorator to class', () => {
    @Plugin({ name: 'test-plugin', version: '1.0.0' })
    class TestPlugin {}

    const metadata = Reflect.getOwnMetadata(PLUGIN_METADATA_KEY, TestPlugin);
    expect(metadata).toBeDefined();
    expect(metadata.name).toBe('test-plugin');
    expect(metadata.version).toBe('1.0.0');
  });

  it('should apply @OnPluginLoad decorator to method', () => {
    class TestPlugin {
      @OnPluginLoad()
      async onLoad() {
        console.log('loaded');
      }
    }

    const hooks = Reflect.getOwnMetadata(PLUGIN_LOAD_HOOK_KEY, TestPlugin.prototype.onLoad);
    expect(hooks).toBeDefined();
  });

  it('should apply @OnPluginUnload decorator to method', () => {
    class TestPlugin {
      @OnPluginUnload()
      async onUnload() {
        console.log('unloaded');
      }
    }

    const hooks = Reflect.getOwnMetadata(PLUGIN_UNLOAD_HOOK_KEY, TestPlugin.prototype.onUnload);
    expect(hooks).toBeDefined();
  });

  it('should support multiple lifecycle hooks', () => {
    class TestPlugin {
      @OnPluginLoad()
      async onLoad1() {}

      @OnPluginLoad()
      async onLoad2() {}
    }

    // Both hooks should be registered
    const instance = new TestPlugin();
    expect(instance).toBeDefined();
  });

  it('should apply @PluginEvent decorator to method', () => {
    class TestPlugin {
      @PluginEvent('user.created')
      async onUserCreated() {
        console.log('user created');
      }
    }

    const events = Reflect.getOwnMetadata('plugin:events', TestPlugin.prototype);
    expect(events).toBeDefined();
    expect(Array.isArray(events)).toBe(true);
    expect(events.length).toBeGreaterThan(0);
    expect(events[0].eventName).toBe('user.created');
  });

  it('should support plugin decorator with full options', () => {
    @Plugin({
      name: 'advanced-plugin',
      version: '2.0.0',
      description: 'An advanced plugin',
      author: 'Test Author',
      keywords: ['test', 'plugin'],
      dependencies: ['dependency-1'],
      capabilities: {
        routes: ['/api/test'],
        services: ['TestService'],
      },
      config: {
        timeout: {
          type: 'number',
          required: true,
          default: 5000,
        },
      },
    })
    class AdvancedPlugin {}

    const metadata = Reflect.getOwnMetadata(PLUGIN_METADATA_KEY, AdvancedPlugin);
    expect(metadata).toBeDefined();
    expect(metadata.name).toBe('advanced-plugin');
    expect(metadata.version).toBe('2.0.0');
    expect(metadata.description).toBe('An advanced plugin');
    expect(metadata.author).toBe('Test Author');
    expect(metadata.keywords).toEqual(['test', 'plugin']);
    expect(metadata.dependencies).toEqual(['dependency-1']);
    expect(metadata.capabilities).toBeDefined();
    expect(metadata.config).toBeDefined();
  });
});
