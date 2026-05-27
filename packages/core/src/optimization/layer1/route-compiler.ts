import type { HttpMethod, RouteEntry, TrieNode } from '../types.js';

/**
 * Helper function to create a new TrieNode
 */
function createTrieNode(): TrieNode {
  return {
    children: new Map(),
    isParam: false,
  };
}

/**
 * RouteCompiler pre-compiles HTTP routes into a trie-based lookup structure.
 * Provides O(path length) lookup performance instead of O(routes count).
 *
 * The compiler builds a trie tree indexed by HTTP method first, then path segments.
 * Each segment becomes a node in the trie. Parameter segments (like :id) become
 * parameter nodes. Handlers are stored at leaf nodes.
 *
 * Example trie structure for routes [GET /users, GET /users/:id, POST /users]:
 * GET -> users -> [handler for GET /users, :id -> [handler for GET /users/:id]]
 * POST -> users -> [handler for POST /users]
 */
export class RouteCompiler {
  /**
   * Root trie nodes for each HTTP method
   * Each method has its own tree for O(1) method lookup
   */
  private routeTrees = new Map<HttpMethod, TrieNode>();

  /**
   * Cache of routes indexed by method:path for O(1) direct lookups
   * This serves as a quick lookup cache for compiled routes
   */
  private routeCache = new Map<string, RouteEntry>();

  /**
   * Compiles an array of route entries into a trie-based lookup structure.
   * For each route, creates necessary nodes in the trie and stores the handler
   * at the leaf node. Routes are cached by method:path key for fast retrieval.
   *
   * @param routes Array of route entries to compile
   */
  compile(routes: RouteEntry[]): void {
    for (const route of routes) {
      const { method, path, handler } = route;

      // Get or create the root trie node for this HTTP method
      let root = this.routeTrees.get(method);
      if (!root) {
        root = createTrieNode();
        this.routeTrees.set(method, root);
      }

      // Split path by '/' and filter empty segments
      // e.g., '/users/123' -> ['', 'users', '123'] -> ['users', '123']
      const segments = path.split('/').filter(seg => seg.length > 0);

      // Navigate/build the trie for each segment
      let current = root;
      for (const segment of segments) {
        // Check if this segment is a parameter (starts with ':')
        const isParam = segment.startsWith(':');
        const nodeKey = isParam ? ':param' : segment;

        // Get or create the child node
        if (!current.children.has(nodeKey)) {
          const newNode = createTrieNode();
          if (isParam) {
            newNode.isParam = true;
            newNode.paramName = segment.substring(1); // Remove ':' prefix
          }
          current.children.set(nodeKey, newNode);
        }

        current = current.children.get(nodeKey)!;
      }

      // Store the handler and full route entry at the leaf node
      current.handler = handler;
      current.route = route;

      // Cache the route by method:path key for quick retrieval
      const cacheKey = `${method}:${path}`;
      this.routeCache.set(cacheKey, route);
    }
  }

  /**
   * Performs O(path length) lookup of a route by HTTP method and path.
   * First attempts exact segment matches, then falls back to parameter nodes.
   * Returns the RouteEntry directly from the trie without cache iteration.
   *
   * @param method The HTTP method (GET, POST, etc.)
   * @param path The request path (e.g., '/users/123')
   * @returns The matched RouteEntry or null if no match found
   */
  lookup(method: HttpMethod, path: string): RouteEntry | null {
    // Get the trie root for this HTTP method
    const tree = this.routeTrees.get(method);
    if (!tree) {
      return null;
    }

    // Split path by '/' and filter empty segments
    const segments = path.split('/').filter(Boolean);

    // Navigate the trie, trying exact matches first, then parameter nodes
    let node = tree;
    for (const segment of segments) {
      // Try exact match first
      let nextNode = node.children.get(segment);
      // Fall back to parameter node (:param)
      if (!nextNode) {
        nextNode = node.children.get(':param');
      }
      // No match found
      if (!nextNode) {
        return null;
      }
      node = nextNode;
    }

    // Return the stored route directly from trie
    return node.route ?? null;
  }

  /**
   * Returns all root trie nodes (one per HTTP method)
   * @returns Array of root TrieNode objects
   */
  getCompiledRoutes(): TrieNode[] {
    return Array.from(this.routeTrees.values());
  }

  /**
   * Clears all compiled routes, caches, and trees
   * Allows for recompilation or cleanup
   */
  clear(): void {
    this.routeTrees.clear();
    this.routeCache.clear();
  }
}
