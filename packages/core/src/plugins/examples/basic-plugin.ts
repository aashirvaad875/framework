import { Plugin, OnPluginLoad, OnPluginUnload } from '../decorators.js';
import type { PluginContext } from '../types.js';
import { Injectable } from '../../decorators/index.js';

/**
 * Example service demonstrating service registration in plugins
 * This service can be injected into other components
 */
@Injectable()
export class ExampleService {
  /**
   * Example method showing basic functionality
   * @returns Promise resolving to a success message
   */
  async doSomething(): Promise<string> {
    return 'Example plugin is working!';
  }
}

/**
 * Basic example plugin demonstrating all key plugin system features:
 * - Plugin decorator with metadata
 * - Lifecycle hooks (load/unload)
 * - Service registration via DI container
 * - Event emission via EventBus
 */
@Plugin({
  name: 'basic-example-plugin',
  version: '1.0.0',
  description: 'Basic example plugin demonstrating plugin system features',
  author: 'Framework Team',
  keywords: ['example', 'demo'],
  dependencies: [],
  capabilities: {
    services: ['ExampleService'],
    events: ['example:initialized'],
  },
})
export class BasicExamplePlugin {
  /**
   * Plugin load lifecycle hook
   * Runs when the plugin is initialized
   * Demonstrates:
   * - Accessing plugin context
   * - Registering services in the DI container
   * - Emitting events via the event bus
   * - Logging plugin lifecycle events
   */
  @OnPluginLoad()
  async onLoad(context: PluginContext) {
    context.logger.info(`[${context.id}] Loading plugin version ${context.version}`);

    // Register the example service in the DI container
    // This allows other components to inject ExampleService
    context.container.registerClass(ExampleService);

    // Emit an event to notify other parts of the system that this plugin has loaded
    void context.eventBus.emit('example:initialized', {
      pluginId: context.id,
      timestamp: new Date(),
    });

    context.logger.info(`[${context.id}] Plugin loaded successfully`);
  }

  /**
   * Plugin unload lifecycle hook
   * Runs when the plugin is being unloaded
   * Demonstrates:
   * - Cleanup operations
   * - Clearing plugin-scoped resources
   * - Logging plugin lifecycle events
   */
  @OnPluginUnload()
  async onUnload(context: PluginContext) {
    context.logger.info(`[${context.id}] Unloading plugin`);

    // Clear any resources stored in the plugin scope
    context.pluginScope.clear();

    context.logger.info(`[${context.id}] Plugin unloaded`);
  }
}
