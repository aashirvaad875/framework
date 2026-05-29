import type { ModuleClass, LoadedModule } from '../types.js';
import { ModuleRegistry } from '../registry/index.js';
import { Logger } from '@dancha/logger';

const logger = new Logger('LazyModuleLoader');

/**
 * Handles lazy loading of modules (route-based, manual, deferred).
 */
export class LazyModuleLoader {
  private loadedLazyModules = new Set<ModuleClass>();
  private routeModuleMap = new Map<string, ModuleClass[]>();

  constructor(private registry: ModuleRegistry) {}

  /**
   * Register route-to-module mappings for lazy loading.
   */
  registerRoutes(module: ModuleClass, routes: string[]): void {
    for (const route of routes) {
      if (!this.routeModuleMap.has(route)) {
        this.routeModuleMap.set(route, []);
      }
      this.routeModuleMap.get(route)!.push(module);
    }
  }

  /**
   * Load a module on-demand.
   */
  async load(module: LoadedModule): Promise<void> {
    if (this.loadedLazyModules.has(module.class)) {
      logger.debug(`Module already lazy-loaded: ${module.class.name}`);
      return;
    }

    logger.info(`Lazy loading module: ${module.class.name}`);
    this.loadedLazyModules.add(module.class);
    module.loadedAt = new Date();
  }

  /**
   * Load modules for a specific route.
   */
  async loadForRoute(path: string): Promise<ModuleClass[]> {
    const modulesToLoad: ModuleClass[] = [];

    // Check for exact match
    const exactMatch = this.routeModuleMap.get(path);
    if (exactMatch) {
      modulesToLoad.push(...exactMatch);
    }

    // Check for wildcard matches
    for (const [route, modules] of this.routeModuleMap) {
      if (route.includes('*')) {
        const regex = new RegExp(`^${route.replace(/\*/g, '.*')}$`);
        if (regex.test(path)) {
          modulesToLoad.push(...modules);
        }
      }
    }

    for (const module of modulesToLoad) {
      const loaded = this.registry.get(module);
      if (loaded && !this.loadedLazyModules.has(module)) {
        await this.load(loaded);
      }
    }

    return modulesToLoad;
  }

  /**
   * Check if a module is lazy loaded.
   */
  isLoaded(moduleClass: ModuleClass): boolean {
    return this.loadedLazyModules.has(moduleClass);
  }

  /**
   * Check if a module is lazy.
   */
  isLazy(moduleClass: ModuleClass): boolean {
    const module = this.registry.get(moduleClass);
    return module?.isLazy || false;
  }
}
