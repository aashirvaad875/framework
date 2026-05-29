import type { ModuleClass, CompileResult, LoadedModule } from '../types.js';
import { ModuleMetadata } from '../metadata/index.js';
import { DependencyGraph } from '../graph/index.js';
import { ModuleRegistry } from '../registry/index.js';
import { ModuleValidator } from './module-validator.js';
import { Logger } from '@dancha/logger';

const logger = new Logger('ModuleCompiler');

/**
 * Orchestrates the compilation of modules into a loadable graph.
 */
export class ModuleCompiler {
  private graph: DependencyGraph;
  private registry: ModuleRegistry;

  constructor() {
    this.graph = new DependencyGraph();
    this.registry = new ModuleRegistry();
  }

  /**
   * Compile modules: validate, build graph, check cycles, organize load order.
   */
  async compile(rootModules: ModuleClass[]): Promise<CompileResult> {
    logger.info(`Starting compilation of ${rootModules.length} root modules`);

    const result: CompileResult = {
      success: true,
      errors: [],
      warnings: [],
      modules: new Map(),
      loadOrder: [],
    };

    // Step 1: Collect all modules (including transitive imports)
    const allModules = this.collectAllModules(rootModules);
    logger.debug(`Collected ${allModules.size} modules (including transitive imports)`);

    // Step 2: Build dependency graph
    this.graph.build(Array.from(allModules));

    // Step 3: Validate module structure
    const validationErrors = ModuleValidator.validateAll(this.graph, Array.from(allModules));
    const errors = validationErrors.filter(e => e.severity === 'error');
    const warnings = validationErrors.filter(e => e.severity === 'warning');

    result.errors = errors;
    result.warnings = warnings;

    if (errors.length > 0) {
      result.success = false;
      logger.error(`Compilation failed with ${errors.length} validation errors`);
      return result;
    }

    // Step 4: Check for circular dependencies
    try {
      this.graph.validateNoCycles();
    } catch (error) {
      if (error instanceof Error) {
        result.errors.push({
          module: rootModules[0],
          type: 'circular-dependency',
          message: error.message,
          severity: 'error',
        });
        result.success = false;
        logger.error(`Circular dependency detected: ${error.message}`);
        return result;
      }
    }

    // Step 5: Get load order
    const loadOrder = this.graph.getLoadOrder();
    result.loadOrder = loadOrder;

    // Step 6: Create loaded module instances
    for (const module of loadOrder) {
      const metadata = ModuleMetadata.extract(module);
      const node = this.graph.getNode(module)!;

      const loadedModule: LoadedModule = {
        class: module,
        metadata,
        providers: new Map(node.providers),
        controllers: metadata.controllers || [],
        imports: [],
        exports: new Map(),
        isGlobal: metadata.isGlobal || false,
        isLazy: metadata.lazy?.strategy !== 'eager',
        loadedAt: new Date(),
        status: 'loaded',
      };

      // Populate imports with loaded module instances
      for (const imported of node.dependencies) {
        const importedLoaded = result.modules.get(imported);
        if (importedLoaded) {
          loadedModule.imports.push(importedLoaded);
        }
      }

      // Populate exports
      for (const exported of node.exports) {
        if (node.providers.has(exported)) {
          loadedModule.exports.set(exported, node.providers.get(exported));
        }
      }

      result.modules.set(module, loadedModule);
      this.registry.register(loadedModule);
    }

    logger.info(`Compilation successful: ${result.modules.size} modules`);
    return result;
  }

  /**
   * Collect all modules including transitive imports.
   */
  private collectAllModules(
    modules: ModuleClass[],
    visited = new Set<ModuleClass>()
  ): Set<ModuleClass> {
    const collected = new Set<ModuleClass>(visited);

    for (const module of modules) {
      if (collected.has(module)) {
        continue;
      }
      collected.add(module);

      const metadata = ModuleMetadata.extract(module);
      if (metadata.imports) {
        this.collectAllModules(metadata.imports, collected);
      }
    }

    return collected;
  }

  /**
   * Get the dependency graph (for inspection).
   */
  getGraph(): DependencyGraph {
    return this.graph;
  }

  /**
   * Get the module registry.
   */
  getRegistry(): ModuleRegistry {
    return this.registry;
  }
}
