import { MODULE_METADATA_KEY, ModuleDecorator } from './decorators/index.js';
import { di } from './container.js';

export interface ModuleConfig {
  controllers?: Function[];
  providers?: Function[];
  imports?: Function[];
  exports?: Function[];
}

class ModuleLoader {
  private static loadedModules = new Set<Function>();

  static getMetadata(moduleClass: Function): ModuleConfig {
    return (
      Reflect.getMetadata(MODULE_METADATA_KEY, moduleClass) || {
        controllers: [],
        providers: [],
        imports: [],
        exports: [],
      }
    );
  }

  static async load(moduleClass: Function): Promise<void> {
    if (ModuleLoader.loadedModules.has(moduleClass)) {
      return;
    }

    const metadata = this.getMetadata(moduleClass);

    // Load imported modules first
    if (metadata.imports) {
      for (const importedModule of metadata.imports) {
        await ModuleLoader.load(importedModule);
      }
    }

    // Register providers
    if (metadata.providers) {
      for (const provider of metadata.providers) {
        if (typeof provider === 'function') {
          di.registerClass(
            provider as new (...args: any[]) => any,
            provider as new (...args: any[]) => any
          );
        }
      }
    }

    // Register controllers
    if (metadata.controllers) {
      for (const controller of metadata.controllers) {
        di.registerClass(
          controller as new (...args: any[]) => any,
          controller as new (...args: any[]) => any
        );
      }
    }

    ModuleLoader.loadedModules.add(moduleClass);
  }

  static getControllers(moduleClass: Function): Function[] {
    const metadata = this.getMetadata(moduleClass);
    return metadata.controllers || [];
  }

  static getProviders(moduleClass: Function): Function[] {
    const metadata = this.getMetadata(moduleClass);
    return metadata.providers || [];
  }

  static getImports(moduleClass: Function): Function[] {
    const metadata = this.getMetadata(moduleClass);
    return metadata.imports || [];
  }

  static reset(): void {
    ModuleLoader.loadedModules.clear();
  }
}

// Export both the decorator and the loader as Module
export const Module = Object.assign(ModuleDecorator, {
  load: ModuleLoader.load.bind(ModuleLoader),
  getMetadata: ModuleLoader.getMetadata.bind(ModuleLoader),
  getControllers: ModuleLoader.getControllers.bind(ModuleLoader),
  getProviders: ModuleLoader.getProviders.bind(ModuleLoader),
  getImports: ModuleLoader.getImports.bind(ModuleLoader),
  reset: ModuleLoader.reset.bind(ModuleLoader),
  getLoadedModules: () => Array.from(ModuleLoader.loadedModules.values()),
});
