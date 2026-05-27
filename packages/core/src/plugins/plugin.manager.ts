import type { Application } from '../application.js';
import type { Container } from '../di/index.js';
import type {
  PluginManifest,
  PluginMetadata,
  PluginContext,
  PluginLifecycleHook,
} from './types.js';
import { PluginRegistry } from './plugin.registry.js';
import { CircularDependencyError, PluginDependencyError } from './exceptions.js';

export class PluginManager {
  private registry: PluginRegistry;

  constructor(
    private app: Application,
    private container: Container
  ) {
    this.registry = new PluginRegistry();
  }

  registerPlugin(manifest: PluginManifest, instance: any): void {
    this.registry.register(manifest, instance);
  }

  getPlugin(pluginId: string): PluginMetadata | undefined {
    return this.registry.get(pluginId);
  }

  getLoadedPlugins(): PluginMetadata[] {
    return this.registry.getAll().filter(p => p.lifecycleState === 'loaded');
  }

  resolveDependencies(): PluginMetadata[] {
    const plugins = this.registry.getAll();
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const sorted: PluginMetadata[] = [];

    const visit = (pluginId: string, path: string[]): void => {
      if (visited.has(pluginId)) {
        return;
      }

      if (visiting.has(pluginId)) {
        const cycle = [...path, pluginId];
        throw new CircularDependencyError(cycle);
      }

      visiting.add(pluginId);

      const plugin = this.registry.get(pluginId);
      if (!plugin) {
        throw new PluginDependencyError(path[path.length - 1] ?? 'unknown', pluginId);
      }

      for (const dep of plugin.manifest.dependencies) {
        visit(dep, [...path, pluginId]);
      }

      visiting.delete(pluginId);
      visited.add(pluginId);
      sorted.push(plugin);
    };

    for (const plugin of plugins) {
      visit(plugin.id, []);
    }

    return sorted;
  }

  async loadPlugins(): Promise<void> {
    const sortedPlugins = this.resolveDependencies();

    for (const pluginMetadata of sortedPlugins) {
      await this.loadPlugin(pluginMetadata);
    }
  }

  private async loadPlugin(metadata: PluginMetadata): Promise<void> {
    try {
      this.registry.setLifecycleState(metadata.id, 'loading');

      const context = this.createPluginContext(metadata);
      const instance = metadata.instance;

      if (typeof instance.onLoad === 'function') {
        await Promise.resolve(instance.onLoad(context));
      }

      this.registry.setLifecycleState(metadata.id, 'loaded');
    } catch (error) {
      this.registry.setError(metadata.id, error as Error);
      throw error;
    }
  }

  private createPluginContext(metadata: PluginMetadata): PluginContext {
    const onLoadHooks: PluginLifecycleHook[] = [];
    const onUnloadHooks: PluginLifecycleHook[] = [];

    const context: PluginContext = {
      id: metadata.id,
      manifest: metadata.manifest,
      version: metadata.manifest.version,
      app: this.app,
      container: this.container,
      eventBus: (this.app as any).eventBus,
      logger: (this.app as any).logger,
      pluginScope: new Map(),
      config: (this.app as any).pluginConfig?.[metadata.id] ?? {},
      onLoad: fn => onLoadHooks.push(fn),
      onUnload: fn => onUnloadHooks.push(fn),
    };

    return context;
  }
}
