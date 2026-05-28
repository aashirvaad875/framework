import type { ModuleDependency } from '../types.js';

export class ModuleGraph {
  private dependencies: Map<string, ModuleDependency> = new Map();
  private filepathToId: Map<string, string> = new Map();

  addDependency(dep: ModuleDependency): void {
    this.dependencies.set(dep.id, dep);
    this.filepathToId.set(dep.filepath, dep.id);
  }

  getDependency(id: string): ModuleDependency | undefined {
    return this.dependencies.get(id);
  }

  getDependencyByFilepath(filepath: string): ModuleDependency | undefined {
    const id = this.filepathToId.get(filepath);
    return id ? this.dependencies.get(id) : undefined;
  }

  getGraph(): ModuleDependency[] {
    return Array.from(this.dependencies.values());
  }

  findCircularDeps(): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const visit = (id: string, path: string[]): void => {
      visited.add(id);
      recursionStack.add(id);
      path.push(id);

      const dep = this.dependencies.get(id);
      if (!dep) {
        path.pop();
        return;
      }

      for (const importPath of dep.imports) {
        const importId = this.filepathToId.get(importPath);
        if (!importId) {
          continue;
        }

        if (!visited.has(importId)) {
          visit(importId, path);
        } else if (recursionStack.has(importId)) {
          const cycleStartIdx = path.indexOf(importId);
          const cycle = path.slice(cycleStartIdx).concat([importId]);
          cycles.push(cycle);
        }
      }

      path.pop();
      recursionStack.delete(id);
    };

    for (const id of this.dependencies.keys()) {
      if (!visited.has(id)) {
        visit(id, []);
      }
    }

    return cycles;
  }

  clear(): void {
    this.dependencies.clear();
    this.filepathToId.clear();
  }
}
