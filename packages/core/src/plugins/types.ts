import type { Container } from '../di/index.js';
import type { EventBus } from '../events/index.js';
import type { Application } from '../application.js';
import type { Logger } from '@dancha/logger';

export type PluginLifecycleState = 'loading' | 'loaded' | 'unloading' | 'unloaded' | 'error';

export interface PluginCapabilities {
  routes?: string[];
  middleware?: string[];
  guards?: string[];
  interceptors?: string[];
  services?: string[];
  events?: string[];
  adapters?: string[];
}

export interface PluginConfig {
  [key: string]: {
    type: string;
    required?: boolean;
    default?: unknown;
  };
}

export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  keywords: string[];
  dependencies: string[];
  peerDependencies?: Record<string, string>;
  capabilities: PluginCapabilities;
  config?: PluginConfig;
}

export interface PluginMetadata {
  id: string;
  manifest: PluginManifest;
  instance: unknown;
  lifecycleState: PluginLifecycleState;
  loadedAt?: Date;
  unloadedAt?: Date;
  error?: Error;
}

export interface PluginContext {
  id: string;
  manifest: PluginManifest;
  version: string;
  app: Application;
  container: Container;
  eventBus: EventBus;
  logger: Logger;
  pluginScope: Map<string, unknown>;
  config: Record<string, unknown>;
  onLoad(fn: () => void | Promise<void>): void;
  onUnload(fn: () => void | Promise<void>): void;
}

export type PluginLifecycleHook = (context: PluginContext) => void | Promise<void>;

export const PLUGIN_METADATA_KEY = Symbol('plugin:metadata');
export const PLUGIN_LOAD_HOOK_KEY = Symbol('plugin:load-hook');
export const PLUGIN_UNLOAD_HOOK_KEY = Symbol('plugin:unload-hook');
