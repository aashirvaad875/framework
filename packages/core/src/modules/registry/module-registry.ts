import type { ModuleClass, LoadedModule } from '../types.js';
import { ProviderScopeManager } from './provider-scope-manager.js';
import { Logger } from '@framework/logger';

const logger = new Logger('ModuleRegistry');

/**
 * Registry that tracks all loaded modules and their state.
 */
export class ModuleRegistry {
  private loadedModules = new Map<ModuleClass, LoadedModule>();
  private loadingModules = new Set<ModuleClass>();
  private failedModules = new Set<ModuleClass>();

  /**
   * Register a loaded module.
   */
  register(module: LoadedModule): void {
    this.loadedModules.set(module.class, module);
    this.loadingModules.delete(module.class);
    logger.debug(`Module registered: ${module.class.name}`);
  }

  /**
   * Mark a module as currently loading.
   */
  markLoading(moduleClass: ModuleClass): void {
    this.loadingModules.add(moduleClass);
  }

  /**
   * Mark a module as failed.
   */
  markFailed(moduleClass: ModuleClass, error: Error): void {
    this.failedModules.add(moduleClass);
    this.loadingModules.delete(moduleClass);
    const module = this.loadedModules.get(moduleClass);
    if (module) {
      module.status = 'failed';
      module.error = error;
    }
    logger.error(`Module failed to load: ${moduleClass.name}`, error);
  }

  /**
   * Get a loaded module.
   */
  get(moduleClass: ModuleClass): LoadedModule | undefined {
    return this.loadedModules.get(moduleClass);
  }

  /**
   * Check if a module is loaded.
   */
  has(moduleClass: ModuleClass): boolean {
    return this.loadedModules.has(moduleClass);
  }

  /**
   * Check if a module is currently loading.
   */
  isLoading(moduleClass: ModuleClass): boolean {
    return this.loadingModules.has(moduleClass);
  }

  /**
   * Check if a module failed to load.
   */
  hasFailed(moduleClass: ModuleClass): boolean {
    return this.failedModules.has(moduleClass);
  }

  /**
   * Get all loaded modules.
   */
  getAll(): Map<ModuleClass, LoadedModule> {
    return new Map(this.loadedModules);
  }

  /**
   * Get load status of all modules.
   */
  getStatus(moduleClass: ModuleClass): 'pending' | 'loading' | 'loaded' | 'failed' {
    if (this.loadingModules.has(moduleClass)) return 'loading';
    if (this.failedModules.has(moduleClass)) return 'failed';
    if (this.loadedModules.has(moduleClass)) return 'loaded';
    return 'pending';
  }

  /**
   * Check if a provider is accessible from a module.
   */
  isProviderAccessible(provider: string | symbol | Function, fromModule: ModuleClass): boolean {
    const module = this.loadedModules.get(fromModule);
    if (!module) return false;

    return ProviderScopeManager.canAccess(provider, module, this.loadedModules);
  }

  /**
   * Get providers accessible from a module.
   */
  getAccessibleProviders(moduleClass: ModuleClass): Map<string | symbol | Function, any> {
    const module = this.loadedModules.get(moduleClass);
    if (!module) return new Map();

    return ProviderScopeManager.getAccessibleProviders(module, this.loadedModules);
  }

  /**
   * Clear all loaded modules (for testing).
   */
  clear(): void {
    this.loadedModules.clear();
    this.loadingModules.clear();
    this.failedModules.clear();
  }
}
