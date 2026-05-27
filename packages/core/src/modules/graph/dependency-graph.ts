import type { ModuleClass, ModuleNode } from '../types.js';
import { ModuleMetadata } from '../metadata/index.js';
import { detectCycle } from './cycle-detector.js';
import { topologicalSort } from './topological-sort.js';
import { CircularDependencyError } from '../errors/index.js';

export class DependencyGraph {
  private graph = new Map<ModuleClass, ModuleNode>();

  /**
   * Build the dependency graph from module metadata.
   */
  build(modules: ModuleClass[]): Map<ModuleClass, ModuleNode> {
    this.graph.clear();

    // Create nodes for all modules
    for (const module of modules) {
      const metadata = ModuleMetadata.extract(module);
      this.graph.set(module, {
        module,
        metadata,
        dependencies: new Set(),
        dependents: new Set(),
        exports: new Set(metadata.exports || []),
        providers: new Map(),
        isGlobal: metadata.isGlobal || false,
        isLazy: metadata.lazy?.strategy !== 'eager',
        lazyConfig: metadata.lazy,
      });
    }

    // Build dependency relationships
    for (const [module, node] of this.graph) {
      const metadata = ModuleMetadata.extract(module);

      for (const importedModule of metadata.imports || []) {
        if (this.graph.has(importedModule)) {
          node.dependencies.add(importedModule);
          const importedNode = this.graph.get(importedModule)!;
          importedNode.dependents.add(module);
        }
      }

      // Register providers
      for (const provider of metadata.providers || []) {
        const token = ModuleMetadata.getProviderToken(provider);
        node.providers.set(token, provider);
      }
    }

    return this.graph;
  }

  /**
   * Detect circular dependencies in the graph.
   */
  detectCycles(): ModuleClass[][] {
    const modules = Array.from(this.graph.keys());
    const cycles = detectCycle(modules, (module) => {
      const node = this.graph.get(module);
      return node ? Array.from(node.dependencies) : [];
    });

    return cycles;
  }

  /**
   * Check for cycles and throw if any exist.
   */
  validateNoCycles(): void {
    const cycles = this.detectCycles();
    if (cycles.length > 0) {
      throw new CircularDependencyError(cycles[0]);
    }
  }

  /**
   * Get modules in load order (topological sort).
   */
  getLoadOrder(): ModuleClass[] {
    const modules = Array.from(this.graph.keys());
    return topologicalSort(modules, (module) => {
      const node = this.graph.get(module);
      return node ? Array.from(node.dependencies) : [];
    });
  }

  /**
   * Get the node for a module.
   */
  getNode(module: ModuleClass): ModuleNode | undefined {
    return this.graph.get(module);
  }

  /**
   * Get all nodes.
   */
  getNodes(): Map<ModuleClass, ModuleNode> {
    return new Map(this.graph);
  }

  /**
   * Check if module A depends on module B (transitively).
   */
  dependsOn(moduleA: ModuleClass, moduleB: ModuleClass): boolean {
    const visited = new Set<ModuleClass>();

    const dfs = (module: ModuleClass): boolean => {
      if (module === moduleB) return true;
      if (visited.has(module)) return false;

      visited.add(module);
      const node = this.graph.get(module);
      if (!node) return false;

      for (const dep of node.dependencies) {
        if (dfs(dep)) return true;
      }

      return false;
    };

    return dfs(moduleA);
  }

  /**
   * Get providers accessible from a module (considering exports).
   */
  getAccessibleProviders(module: ModuleClass): Map<string | symbol | Function, any> {
    const accessible = new Map();
    const node = this.graph.get(module);
    if (!node) return accessible;

    // Own providers
    for (const [token, provider] of node.providers) {
      accessible.set(token, provider);
    }

    // Imported modules' exported providers
    for (const imported of node.dependencies) {
      const importedNode = this.graph.get(imported);
      if (!importedNode) continue;

      for (const [token, provider] of importedNode.providers) {
        if (importedNode.exports.has(token)) {
          accessible.set(token, provider);
        }
      }

      // Global modules are accessible to all
      if (importedNode.isGlobal) {
        for (const [token, provider] of importedNode.providers) {
          accessible.set(token, provider);
        }
      }
    }

    return accessible;
  }

  /**
   * Check if a provider is accessible from a module.
   */
  isProviderAccessible(token: string | symbol | Function, fromModule: ModuleClass): boolean {
    return this.getAccessibleProviders(fromModule).has(token);
  }
}
