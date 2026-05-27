import { MODULE_METADATA_KEY } from './decorators/index.js';
import { di } from './container.js';

export interface ModuleConfig {
  controllers?: Function[];
  providers?: Function[];
  imports?: Function[];
  exports?: Function[];
}

export class Module {
  private static loadedModules = new Set<Function>();

  static getMetadata(moduleClass: Function): ModuleConfig {
    return Reflect.getMetadata(MODULE_METADATA_KEY, moduleClass) || {
      controllers: [],
      providers: [],
      imports: [],
      exports: [],
    };
  }

  static async load(moduleClass: Function): Promise<void> {
    if (Module.loadedModules.has(moduleClass)) {
      return;
    }

    const metadata = this.getMetadata(moduleClass);

    // Load imported modules first
    if (metadata.imports) {
      for (const importedModule of metadata.imports) {
        await Module.load(importedModule);
      }
    }

    // Register providers
    if (metadata.providers) {
      for (const provider of metadata.providers) {
        if (typeof provider === 'function') {
          di.registerClass(provider, provider);
        }
      }
    }

    // Register controllers
    if (metadata.controllers) {
      for (const controller of metadata.controllers) {
        di.registerClass(controller, controller);
      }
    }

    Module.loadedModules.add(moduleClass);
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
    Module.loadedModules.clear();
  }
}
