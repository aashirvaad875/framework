import type { Scope } from '../di/types.js';

/**
 * ModuleProvider can be a class, factory function, or value.
 * Supports various registration patterns for module configuration.
 */
export type ModuleProvider =
  | Function
  | { provide: string | symbol; useClass: Function }
  | { provide: string | symbol; useFactory: (...args: any[]) => any; deps?: (string | symbol | Function)[] }
  | { provide: string | symbol; useValue: any };

/**
 * Type-safe module class reference.
 */
export type ModuleClass = Function & {
  $isDynamic?: boolean;
  forRoot?(config: any): DynamicModule;
  forFeature?(config: any): DynamicModule;
};

/**
 * Core module configuration matching @Module decorator.
 */
export interface ModuleConfig {
  controllers?: Function[];
  providers?: ModuleProvider[];
  imports?: ModuleClass[];
  exports?: (Function | string | symbol)[];
  isGlobal?: boolean;
  lazy?: {
    strategy: 'eager' | 'route-based' | 'manual';
    routes?: string[];
  };
}

/**
 * Return type for dynamic module methods (forRoot, forFeature).
 */
export interface DynamicModule {
  module: ModuleClass;
  providers?: ModuleProvider[];
  exports?: (Function | string | symbol)[];
  imports?: ModuleClass[];
  isGlobal?: boolean;
}

/**
 * Represents a module node in the dependency graph.
 */
export interface ModuleNode {
  module: ModuleClass;
  metadata: ModuleConfig;
  dependencies: Set<ModuleClass>;
  dependents: Set<ModuleClass>;
  exports: Set<string | symbol | Function>;
  providers: Map<string | symbol | Function, ModuleProvider>;
  isGlobal: boolean;
  isLazy: boolean;
  lazyConfig?: { strategy: 'eager' | 'route-based' | 'manual'; routes?: string[] };
}

/**
 * Loaded module instance with resolved providers.
 */
export interface LoadedModule {
  class: ModuleClass;
  metadata: ModuleConfig;
  providers: Map<string | symbol | Function, any>;
  controllers: Function[];
  imports: LoadedModule[];
  exports: Map<string | symbol | Function, any>;
  isGlobal: boolean;
  isLazy: boolean;
  loadedAt: Date;
  status: 'loading' | 'loaded' | 'failed';
  error?: Error;
  instance?: any;
}

/**
 * Validation error reported during module compilation.
 */
export interface ValidationError {
  module: ModuleClass;
  type: 'missing-decorator' | 'invalid-provider' | 'invalid-export' | 'circular-dependency' | 'duplicate-provider';
  message: string;
  severity: 'error' | 'warning';
  suggestion?: string;
}

/**
 * Result of module compilation.
 */
export interface CompileResult {
  success: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  modules: Map<ModuleClass, LoadedModule>;
  loadOrder: ModuleClass[];
}

/**
 * Lazy loading configuration for a module.
 */
export interface LazyConfig {
  strategy: 'eager' | 'route-based' | 'manual';
  routes?: string[];
  loaded: boolean;
  loadedAt?: Date;
}

/**
 * Event emitted during module loading.
 */
export interface ModuleLoadEvent {
  phase: 'validation' | 'graph-construction' | 'cycle-detection' | 'resolution' | 'provider-registration' | 'initialization' | 'ready';
  module: ModuleClass;
  timestamp: Date;
  metadata?: any;
  error?: Error;
}
