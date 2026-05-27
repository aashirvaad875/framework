import type { ModuleClass, ValidationError } from '../types.js';
import { ModuleMetadata } from '../metadata/index.js';
import { DependencyGraph } from '../graph/index.js';

export class ModuleValidator {
  /**
   * Validate all modules in the graph.
   */
  static validateAll(graph: DependencyGraph, modules: ModuleClass[]): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const module of modules) {
      errors.push(...this.validateModule(module, graph));
    }

    return errors;
  }

  /**
   * Validate a single module.
   */
  static validateModule(moduleClass: ModuleClass, graph: DependencyGraph): ValidationError[] {
    const errors: ValidationError[] = [];

    // Check @Module decorator exists
    if (!ModuleMetadata.has(moduleClass)) {
      errors.push({
        module: moduleClass,
        type: 'missing-decorator',
        message: `Module ${moduleClass.name} must have @Module decorator`,
        severity: 'error',
        suggestion: `Add @Module({ controllers: [...], providers: [...] }) to ${moduleClass.name}`,
      });
      return errors;
    }

    // Validate metadata structure
    try {
      ModuleMetadata.validate(moduleClass);
    } catch (error) {
      if (error instanceof Error) {
        errors.push({
          module: moduleClass,
          type: 'invalid-provider',
          message: error.message,
          severity: 'error',
        });
      }
    }

    // Validate exports
    const metadata = ModuleMetadata.extract(moduleClass);
    const node = graph.getNode(moduleClass);

    if (node) {
      for (const exported of metadata.exports || []) {
        if (!node.providers.has(exported) && typeof exported !== 'function') {
          errors.push({
            module: moduleClass,
            type: 'invalid-export',
            message: `Exported provider ${String(exported)} is not registered in ${moduleClass.name}`,
            severity: 'error',
            suggestion: `Add provider to the providers array or remove from exports`,
          });
        }
      }
    }

    return errors;
  }

  /**
   * Validate all imports exist.
   */
  static validateImports(moduleClass: ModuleClass, allModules: Set<ModuleClass>): ValidationError[] {
    const errors: ValidationError[] = [];
    const metadata = ModuleMetadata.extract(moduleClass);

    for (const imported of metadata.imports || []) {
      if (!allModules.has(imported)) {
        errors.push({
          module: moduleClass,
          type: 'missing-decorator',
          message: `Module ${imported.name} imported by ${moduleClass.name} is not registered`,
          severity: 'error',
          suggestion: `Add ${imported.name} to root module imports or register it`,
        });
      }
    }

    return errors;
  }

  /**
   * Check for duplicate provider registrations across modules.
   */
  static checkDuplicateProviders(
    modules: ModuleClass[],
    graph: DependencyGraph,
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const providerRegistry = new Map<string | symbol | Function, ModuleClass>();

    for (const module of modules) {
      const node = graph.getNode(module);
      if (!node) continue;

      for (const [token] of node.providers) {
        const existing = providerRegistry.get(token);
        if (existing && existing !== module && !graph.getNode(module)?.isGlobal) {
          errors.push({
            module,
            type: 'duplicate-provider',
            message: `Provider ${String(token)} is already registered by ${existing.name}`,
            severity: 'warning',
            suggestion: `Mark one module as global or explicitly control provider visibility`,
          });
        }
        providerRegistry.set(token, module);
      }
    }

    return errors;
  }
}
