import type { Application } from '../application.js';
import type { Container } from '../di/index.js';
import type { EventBus } from '../events/index.js';
import type { Logger } from '@dancha/logger';
import type { PluginManifest, PluginLifecycleHook, PluginContext } from './types.js';

export class PluginContextImpl implements PluginContext {
  id: string;
  manifest: PluginManifest;
  version: string;
  app: Application;
  container: Container;
  eventBus: EventBus;
  logger: Logger;
  pluginScope: Map<string, unknown>;
  config: Record<string, unknown>;

  private onLoadHooks: PluginLifecycleHook[] = [];
  private onUnloadHooks: PluginLifecycleHook[] = [];

  constructor(
    id: string,
    manifest: PluginManifest,
    app: Application,
    container: Container,
    eventBus: EventBus,
    logger: Logger,
    config: Record<string, unknown> = {}
  ) {
    this.id = id;
    this.manifest = manifest;
    this.version = manifest.version;
    this.app = app;
    this.container = container;
    this.eventBus = eventBus;
    this.logger = logger;
    this.pluginScope = new Map();
    this.config = config;
  }

  onLoad(fn: PluginLifecycleHook): void {
    this.onLoadHooks.push(fn);
  }

  onUnload(fn: PluginLifecycleHook): void {
    this.onUnloadHooks.push(fn);
  }

  async executeLoadHooks(): Promise<void> {
    for (const hook of this.onLoadHooks) {
      await Promise.resolve(hook(this));
    }
  }

  async executeUnloadHooks(): Promise<void> {
    for (const hook of this.onUnloadHooks) {
      await Promise.resolve(hook(this));
    }
  }
}
