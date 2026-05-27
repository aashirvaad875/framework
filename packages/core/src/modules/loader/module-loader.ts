import type { ModuleClass, LoadedModule } from '../types.js';
import { ModuleRegistry } from '../registry/index.js';
import { ModuleInitializer } from './module-initializer.js';
import { di } from '../../container.js';
import { Logger } from '@framework/logger';

const logger = new Logger('ModuleLoader');

/**
 * Loads modules in correct dependency order and resolves providers.
 */
export class ModuleLoader {
  constructor(private registry: ModuleRegistry) {}

  /**
   * Load all modules in the order provided.
   */
  async loadModules(modules: LoadedModule[]): Promise<void> {
    for (const module of modules) {
      await this.loadModule(module);
    }

    // Call onModuleInit after all modules loaded
    await ModuleInitializer.onModuleInit(modules);
  }

  /**
   * Load a single module and register its providers with DI.
   */
  private async loadModule(module: LoadedModule): Promise<void> {
    this.registry.markLoading(module.class);

    try {
      logger.debug(`Loading module: ${module.class.name}`);

      // Register providers with DI container
      for (const [token, provider] of module.providers) {
        if (typeof provider === 'function') {
          di.registerClass(token as any, provider);
        } else if (typeof provider === 'object' && provider !== null) {
          const providerObj = provider as any;
          if ('useClass' in providerObj) {
            di.registerClass(providerObj.provide, providerObj.useClass);
          } else if ('useFactory' in providerObj) {
            di.registerFactory(providerObj.provide, providerObj.useFactory);
          } else if ('useValue' in providerObj) {
            di.register(providerObj.provide, providerObj.useValue);
          }
        }
      }

      // Try to instantiate the module if it's a class
      if (typeof module.class === 'function' && module.class.length === 0) {
        try {
          module.instance = new (module.class as any)();
        } catch {
          // Module doesn't need instantiation
        }
      }

      this.registry.register(module);
      logger.debug(`Module loaded: ${module.class.name}`);
    } catch (error) {
      this.registry.markFailed(module.class, error as Error);
      throw error;
    }
  }

  /**
   * Call bootstrap hooks on all modules.
   */
  async onApplicationBootstrap(modules: LoadedModule[]): Promise<void> {
    await ModuleInitializer.onApplicationBootstrap(modules);
  }

  /**
   * Call shutdown hooks on all modules.
   */
  async onApplicationShutdown(modules: LoadedModule[], signal?: string): Promise<void> {
    await ModuleInitializer.onApplicationShutdown(modules, signal);
  }
}
