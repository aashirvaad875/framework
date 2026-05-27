export type {
  PluginManifest,
  PluginContext,
  PluginMetadata,
  PluginLifecycleState,
  PluginCapabilities,
  PluginConfig,
  PluginLifecycleHook,
} from './types.js';

export { PLUGIN_METADATA_KEY, PLUGIN_LOAD_HOOK_KEY, PLUGIN_UNLOAD_HOOK_KEY } from './types.js';

export {
  PluginException,
  PluginNotFoundError,
  PluginLoadError,
  PluginUnloadError,
  CircularDependencyError,
  PluginDependencyError,
  InvalidPluginManifestError,
} from './exceptions.js';

export { PluginRegistry } from './plugin.registry.js';
export { PluginLoader } from './plugin.loader.js';
export { PluginManager } from './plugin.manager.js';
export {
  PluginContextImpl,
  type PluginContextImpl as PluginContextType,
} from './plugin.context.js';
export {
  Plugin,
  OnPluginLoad,
  OnPluginUnload,
  PluginEvent,
  type PluginDecoratorOptions,
} from './decorators.js';
