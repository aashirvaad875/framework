import { describe, it, expect, beforeEach } from 'vitest';
import { ModuleGraph } from '../../dev/debug/module-graph.js';
import type { ModuleDependency } from '../../dev/types.js';

describe('ModuleGraph', () => {
  let graph: ModuleGraph;

  beforeEach(() => {
    graph = new ModuleGraph();
  });

  describe('addDependency', () => {
    it('should add a dependency to the graph', () => {
      const dep: ModuleDependency = {
        id: 'mod-1',
        filepath: '/src/services/user.ts',
        imports: [],
        importedBy: [],
        type: 'service',
        exports: ['UserService'],
      };

      graph.addDependency(dep);
      const retrieved = graph.getDependency('mod-1');

      expect(retrieved).toEqual(dep);
    });

    it('should map filepath to id', () => {
      const dep: ModuleDependency = {
        id: 'mod-1',
        filepath: '/src/services/user.ts',
        imports: [],
        importedBy: [],
        type: 'service',
        exports: ['UserService'],
      };

      graph.addDependency(dep);
      const retrieved = graph.getDependencyByFilepath('/src/services/user.ts');

      expect(retrieved).toEqual(dep);
    });

    it('should overwrite existing dependency with same id', () => {
      const dep1: ModuleDependency = {
        id: 'mod-1',
        filepath: '/src/services/user.ts',
        imports: [],
        importedBy: [],
        type: 'service',
        exports: ['UserService'],
      };

      const dep2: ModuleDependency = {
        id: 'mod-1',
        filepath: '/src/services/user.ts',
        imports: ['/src/database.ts'],
        importedBy: [],
        type: 'service',
        exports: ['UserService', 'UserRepository'],
      };

      graph.addDependency(dep1);
      graph.addDependency(dep2);

      const retrieved = graph.getDependency('mod-1');
      expect(retrieved?.imports).toEqual(['/src/database.ts']);
      expect(retrieved?.exports).toHaveLength(2);
    });
  });

  describe('getDependency', () => {
    it('should return dependency by id', () => {
      const dep: ModuleDependency = {
        id: 'mod-1',
        filepath: '/src/services/user.ts',
        imports: [],
        importedBy: [],
        type: 'service',
        exports: ['UserService'],
      };

      graph.addDependency(dep);
      const retrieved = graph.getDependency('mod-1');

      expect(retrieved).toEqual(dep);
    });

    it('should return undefined for non-existent id', () => {
      const retrieved = graph.getDependency('non-existent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('getDependencyByFilepath', () => {
    it('should return dependency by filepath', () => {
      const dep: ModuleDependency = {
        id: 'mod-1',
        filepath: '/src/services/user.ts',
        imports: [],
        importedBy: [],
        type: 'service',
        exports: ['UserService'],
      };

      graph.addDependency(dep);
      const retrieved = graph.getDependencyByFilepath('/src/services/user.ts');

      expect(retrieved).toEqual(dep);
    });

    it('should return undefined for non-existent filepath', () => {
      const retrieved = graph.getDependencyByFilepath('/non/existent/path.ts');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('getGraph', () => {
    it('should return empty array for empty graph', () => {
      const deps = graph.getGraph();
      expect(deps).toEqual([]);
    });

    it('should return all dependencies', () => {
      const dep1: ModuleDependency = {
        id: 'mod-1',
        filepath: '/src/services/user.ts',
        imports: [],
        importedBy: [],
        type: 'service',
        exports: ['UserService'],
      };

      const dep2: ModuleDependency = {
        id: 'mod-2',
        filepath: '/src/services/auth.ts',
        imports: ['/src/services/user.ts'],
        importedBy: [],
        type: 'service',
        exports: ['AuthService'],
      };

      graph.addDependency(dep1);
      graph.addDependency(dep2);

      const deps = graph.getGraph();
      expect(deps).toHaveLength(2);
      expect(deps).toContainEqual(dep1);
      expect(deps).toContainEqual(dep2);
    });
  });

  describe('findCircularDeps', () => {
    it('should return empty array for graph with no cycles', () => {
      const dep1: ModuleDependency = {
        id: 'mod-1',
        filepath: '/src/a.ts',
        imports: ['/src/b.ts'],
        importedBy: ['mod-2'],
        type: 'module',
        exports: ['A'],
      };

      const dep2: ModuleDependency = {
        id: 'mod-2',
        filepath: '/src/b.ts',
        imports: [],
        importedBy: ['mod-1'],
        type: 'module',
        exports: ['B'],
      };

      graph.addDependency(dep1);
      graph.addDependency(dep2);

      const cycles = graph.findCircularDeps();
      expect(cycles).toEqual([]);
    });

    it('should detect simple circular dependency A -> B -> A', () => {
      const dep1: ModuleDependency = {
        id: 'mod-1',
        filepath: '/src/a.ts',
        imports: ['/src/b.ts'],
        importedBy: ['mod-2'],
        type: 'module',
        exports: ['A'],
      };

      const dep2: ModuleDependency = {
        id: 'mod-2',
        filepath: '/src/b.ts',
        imports: ['/src/a.ts'],
        importedBy: ['mod-1'],
        type: 'module',
        exports: ['B'],
      };

      graph.addDependency(dep1);
      graph.addDependency(dep2);

      const cycles = graph.findCircularDeps();
      expect(cycles.length).toBeGreaterThan(0);
      expect(cycles[0]).toContain('mod-1');
      expect(cycles[0]).toContain('mod-2');
    });

    it('should detect complex circular dependency A -> B -> C -> A', () => {
      const dep1: ModuleDependency = {
        id: 'mod-1',
        filepath: '/src/a.ts',
        imports: ['/src/b.ts'],
        importedBy: ['mod-3'],
        type: 'module',
        exports: ['A'],
      };

      const dep2: ModuleDependency = {
        id: 'mod-2',
        filepath: '/src/b.ts',
        imports: ['/src/c.ts'],
        importedBy: ['mod-1'],
        type: 'module',
        exports: ['B'],
      };

      const dep3: ModuleDependency = {
        id: 'mod-3',
        filepath: '/src/c.ts',
        imports: ['/src/a.ts'],
        importedBy: ['mod-2'],
        type: 'module',
        exports: ['C'],
      };

      graph.addDependency(dep1);
      graph.addDependency(dep2);
      graph.addDependency(dep3);

      const cycles = graph.findCircularDeps();
      expect(cycles.length).toBeGreaterThan(0);
    });

    it('should detect self-referential circular dependency', () => {
      const dep: ModuleDependency = {
        id: 'mod-1',
        filepath: '/src/a.ts',
        imports: ['/src/a.ts'],
        importedBy: [],
        type: 'module',
        exports: ['A'],
      };

      graph.addDependency(dep);

      const cycles = graph.findCircularDeps();
      expect(cycles.length).toBeGreaterThan(0);
    });
  });

  describe('clear', () => {
    it('should clear all dependencies', () => {
      const dep: ModuleDependency = {
        id: 'mod-1',
        filepath: '/src/services/user.ts',
        imports: [],
        importedBy: [],
        type: 'service',
        exports: ['UserService'],
      };

      graph.addDependency(dep);
      expect(graph.getGraph()).toHaveLength(1);

      graph.clear();

      expect(graph.getGraph()).toHaveLength(0);
      expect(graph.getDependency('mod-1')).toBeUndefined();
      expect(graph.getDependencyByFilepath('/src/services/user.ts')).toBeUndefined();
    });

    it('should allow adding dependencies after clear', () => {
      const dep1: ModuleDependency = {
        id: 'mod-1',
        filepath: '/src/a.ts',
        imports: [],
        importedBy: [],
        type: 'module',
        exports: ['A'],
      };

      const dep2: ModuleDependency = {
        id: 'mod-2',
        filepath: '/src/b.ts',
        imports: [],
        importedBy: [],
        type: 'module',
        exports: ['B'],
      };

      graph.addDependency(dep1);
      graph.clear();
      graph.addDependency(dep2);

      expect(graph.getGraph()).toHaveLength(1);
      expect(graph.getDependency('mod-2')).toEqual(dep2);
      expect(graph.getDependency('mod-1')).toBeUndefined();
    });
  });
});
