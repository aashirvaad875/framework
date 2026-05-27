import type { ModuleClass, LoadedModule } from '../types.js';
import { ProviderAccessError } from '../errors/index.js';

/**
 * Manages which modules can access which providers.
 * Enforces module boundaries and export restrictions.
 */
export class ProviderScopeManager {
  /**
   * Check if a module can access a provider.
   */
  static canAccess(
    provider: string | symbol | Function,
    fromModule: LoadedModule,
    loadedModules: Map<ModuleClass, LoadedModule>,
  ): boolean {
    // Module can access its own providers
    if (fromModule.providers.has(provider)) {
      return true;
    }

    // Module can access exported providers from imports
    for (const imported of fromModule.imports) {
      if (imported.exports.has(provider)) {
        return true;
      }
    }

    // Global modules are accessible everywhere
    for (const module of loadedModules.values()) {
      if (module.isGlobal && module.providers.has(provider)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Assert that a module can access a provider, throw if not.
   */
  static assertAccess(
    provider: string | symbol | Function,
    fromModule: LoadedModule,
    loadedModules: Map<ModuleClass, LoadedModule>,
    sourceModule: ModuleClass,
  ): void {
    if (!this.canAccess(provider, fromModule, loadedModules)) {
      throw new ProviderAccessError(fromModule.class, provider, sourceModule);
    }
  }

  /**
   * Get all providers accessible from a module.
   */
  static getAccessibleProviders(
    module: LoadedModule,
    loadedModules: Map<ModuleClass, LoadedModule>,
  ): Map<string | symbol | Function, any> {
    const accessible = new Map<string | symbol | Function, any>();

    // Own providers
    for (const [token, provider] of module.providers) {
      accessible.set(token, provider);
    }

    // Imported modules' exported providers
    for (const imported of module.imports) {
      for (const [token, provider] of imported.exports) {
        accessible.set(token, provider);
      }
    }

    // Global modules
    for (const loaded of loadedModules.values()) {
      if (loaded.isGlobal) {
        for (const [token, provider] of loaded.providers) {
          accessible.set(token as string | symbol | Function, provider);
        }
      }
    }

    return accessible;
  }
}
