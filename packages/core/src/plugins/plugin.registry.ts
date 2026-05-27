import type { PluginManifest, PluginMetadata, PluginLifecycleState } from './types.js';

export class PluginRegistry {
  private plugins = new Map<string, PluginMetadata>();

  register(manifest: PluginManifest, instance: unknown): void {
    const metadata: PluginMetadata = {
      id: manifest.name,
      manifest,
      instance,
      lifecycleState: 'loading',
    };
    this.plugins.set(manifest.name, metadata);
  }

  get(pluginId: string): PluginMetadata | undefined {
    return this.plugins.get(pluginId);
  }

  getAll(): PluginMetadata[] {
    return Array.from(this.plugins.values());
  }

  has(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }

  remove(pluginId: string): void {
    this.plugins.delete(pluginId);
  }

  clear(): void {
    this.plugins.clear();
  }

  setLifecycleState(pluginId: string, state: PluginLifecycleState): void {
    const metadata = this.plugins.get(pluginId);
    if (metadata) {
      metadata.lifecycleState = state;
      if (state === 'loaded') {
        metadata.loadedAt = new Date();
      } else if (state === 'unloaded') {
        metadata.unloadedAt = new Date();
      }
    }
  }

  getLifecycleState(pluginId: string): PluginLifecycleState {
    return this.plugins.get(pluginId)?.lifecycleState ?? 'unloaded';
  }

  setError(pluginId: string, error: Error): void {
    const metadata = this.plugins.get(pluginId);
    if (metadata) {
      metadata.lifecycleState = 'error';
      metadata.error = error;
    }
  }
}
