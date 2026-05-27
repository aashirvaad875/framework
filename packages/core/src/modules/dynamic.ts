import type { ModuleClass, DynamicModule, ModuleProvider } from './types.js';

/**
 * Utilities for creating dynamic modules.
 */
export class DynamicModuleBuilder {
  /**
   * Create a dynamic module for forRoot pattern.
   */
  static forRoot(
    moduleClass: ModuleClass,
    providers: any[] = [],
    exports: (Function | string | symbol)[] = [],
  ): DynamicModule {
    return {
      module: moduleClass,
      providers,
      exports,
    };
  }

  /**
   * Create a dynamic module for forFeature pattern.
   */
  static forFeature(
    moduleClass: ModuleClass,
    providers: any[] = [],
    exports: (Function | string | symbol)[] = [],
  ): DynamicModule {
    return {
      module: moduleClass,
      providers,
      exports,
    };
  }

  /**
   * Merge multiple dynamic modules.
   */
  static merge(...modules: DynamicModule[]): DynamicModule {
    const merged: DynamicModule = {
      module: modules[0].module,
      providers: [],
      exports: [],
      imports: [],
    };

    for (const mod of modules) {
      merged.providers?.push(...(mod.providers || []));
      merged.exports?.push(...(mod.exports || []));
      merged.imports?.push(...(mod.imports || []));
    }

    return merged;
  }
}
