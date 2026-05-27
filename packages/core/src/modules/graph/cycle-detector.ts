/**
 * Detect cycles in a directed graph using DFS.
 */
export function detectCycle<T>(
  nodes: T[],
  getDependencies: (node: T) => T[],
): T[][] {
  const visited = new Set<T>();
  const recursionStack = new Set<T>();
  const cycles: T[][] = [];
  const path: T[] = [];

  function dfs(node: T): void {
    visited.add(node);
    recursionStack.add(node);
    path.push(node);

    for (const dep of getDependencies(node)) {
      if (!visited.has(dep)) {
        dfs(dep);
      } else if (recursionStack.has(dep)) {
        // Found a cycle
        const cycleStart = path.indexOf(dep);
        const cycle = path.slice(cycleStart).concat([dep]);
        cycles.push(cycle);
      }
    }

    path.pop();
    recursionStack.delete(node);
  }

  for (const node of nodes) {
    if (!visited.has(node)) {
      dfs(node);
    }
  }

  return cycles;
}

/**
 * Check if a graph has cycles.
 */
export function hasCycle<T>(
  nodes: T[],
  getDependencies: (node: T) => T[],
): boolean {
  return detectCycle(nodes, getDependencies).length > 0;
}
