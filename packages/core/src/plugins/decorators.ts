import 'reflect-metadata';
import type { PluginManifest, PluginLifecycleHook, PluginConfig } from './types.js';
import { PLUGIN_METADATA_KEY, PLUGIN_LOAD_HOOK_KEY, PLUGIN_UNLOAD_HOOK_KEY } from './types.js';

export interface PluginDecoratorOptions {
  name: string;
  version: string;
  description?: string;
  author?: string;
  keywords?: string[];
  dependencies?: string[];
  capabilities?: Record<string, any>;
  config?: PluginConfig;
}

export interface PluginEventMetadata {
  eventName: string;
  handler: Function;
}

/**
 * Class decorator for marking and configuring a plugin class
 * Stores plugin metadata using reflect-metadata
 */
export function Plugin(options: PluginDecoratorOptions) {
  return function (target: Function) {
    const manifest: Partial<PluginManifest> = {
      name: options.name,
      version: options.version,
      description: options.description || '',
      author: options.author || '',
      keywords: options.keywords || [],
      dependencies: options.dependencies || [],
      capabilities: options.capabilities || {},
      config: options.config,
    };

    Reflect.defineMetadata(PLUGIN_METADATA_KEY, manifest, target);
  };
}

/**
 * Method decorator for marking a plugin load hook
 * Stores metadata on the method itself
 */
export function OnPluginLoad() {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const fn = descriptor.value as PluginLifecycleHook;
    Reflect.defineMetadata(PLUGIN_LOAD_HOOK_KEY, true, fn);
  };
}

/**
 * Method decorator for marking a plugin unload hook
 * Stores metadata on the method itself
 */
export function OnPluginUnload() {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const fn = descriptor.value as PluginLifecycleHook;
    Reflect.defineMetadata(PLUGIN_UNLOAD_HOOK_KEY, true, fn);
  };
}

/**
 * Method decorator for marking a plugin event handler
 * Stores event metadata on the class prototype
 */
export function PluginEvent(eventName: string) {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const metadata: PluginEventMetadata[] = Reflect.getOwnMetadata('plugin:events', target) || [];
    metadata.push({ eventName, handler: descriptor.value });
    Reflect.defineMetadata('plugin:events', metadata, target);
  };
}
