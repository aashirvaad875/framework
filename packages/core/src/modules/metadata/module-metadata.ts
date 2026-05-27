import type { ModuleConfig, ModuleClass } from '../types.js';
import { InvalidModuleError } from '../errors/index.js';

export const MODULE_METADATA_KEY = Symbol('MODULE_METADATA');

export class ModuleMetadata {
  /**
   * Extract module configuration from @Module decorator.
   */
  static extract(moduleClass: ModuleClass): ModuleConfig {
    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, moduleClass) as ModuleConfig | undefined;

    if (!metadata) {
      return {
        controllers: [],
        providers: [],
        imports: [],
        exports: [],
        isGlobal: false,
      };
    }

    return {
      controllers: metadata.controllers || [],
      providers: metadata.providers || [],
      imports: metadata.imports || [],
      exports: metadata.exports || [],
      isGlobal: metadata.isGlobal || false,
      lazy: metadata.lazy,
    };
  }

  /**
   * Set module metadata (used by @Module decorator).
   */
  static set(moduleClass: ModuleClass, metadata: ModuleConfig): void {
    Reflect.defineMetadata(MODULE_METADATA_KEY, metadata, moduleClass);
  }

  /**
   * Check if a class has @Module decorator.
   */
  static has(moduleClass: any): boolean {
    return Reflect.hasMetadata(MODULE_METADATA_KEY, moduleClass);
  }

  /**
   * Validate module configuration structure.
   */
  static validate(moduleClass: ModuleClass): string[] {
    const errors: string[] = [];
    const metadata = this.extract(moduleClass);

    if (!Array.isArray(metadata.controllers)) {
      errors.push('controllers must be an array');
    }

    if (!Array.isArray(metadata.providers)) {
      errors.push('providers must be an array');
    }

    if (!Array.isArray(metadata.imports)) {
      errors.push('imports must be an array');
    }

    if (!Array.isArray(metadata.exports)) {
      errors.push('exports must be an array');
    }

    if (metadata.lazy) {
      if (!['eager', 'route-based', 'manual'].includes(metadata.lazy.strategy)) {
        errors.push(`lazy.strategy must be one of: eager, route-based, manual`);
      }
      if (metadata.lazy.strategy === 'route-based' && !Array.isArray(metadata.lazy.routes)) {
        errors.push('lazy.routes must be an array when strategy is route-based');
      }
    }

    if (errors.length > 0) {
      throw new InvalidModuleError(moduleClass, errors);
    }

    return errors;
  }

  /**
   * Get provider token from provider definition.
   */
  static getProviderToken(provider: any): string | symbol | Function {
    if (typeof provider === 'function') {
      return provider;
    }

    if (typeof provider === 'object' && provider && 'provide' in provider) {
      return (provider as any).provide;
    }

    throw new Error(`Invalid provider: ${String(provider)}`);
  }
}
