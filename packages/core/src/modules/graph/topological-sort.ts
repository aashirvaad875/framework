/**
 * Topologically sort nodes based on their dependencies.
 * Implements Kahn's algorithm.
 */
export function topologicalSort<T>(
  nodes: T[],
  getDependencies: (node: T) => T[],
): T[] {
  const inDegree = new Map<T, number>();
  const adjacencyList = new Map<T, T[]>();

  // Initialize
  for (const node of nodes) {
    inDegree.set(node, 0);
    adjacencyList.set(node, []);
  }

  // Build graph
  for (const node of nodes) {
    const deps = getDependencies(node);
    for (const dep of deps) {
      if (adjacencyList.has(dep)) {
        adjacencyList.get(dep)!.push(node);
        inDegree.set(node, (inDegree.get(node) || 0) + 1);
      }
    }
  }

  // Kahn's algorithm
  const queue: T[] = [];
  for (const node of nodes) {
    if (inDegree.get(node) === 0) {
      queue.push(node);
    }
  }

  const sorted: T[] = [];
  while (queue.length > 0) {
    const node = queue.shift()!;
    sorted.push(node);

    for (const neighbor of adjacencyList.get(node) || []) {
      inDegree.set(neighbor, (inDegree.get(neighbor) || 0) - 1);
      if (inDegree.get(neighbor) === 0) {
        queue.push(neighbor);
      }
    }
  }

  return sorted;
}
