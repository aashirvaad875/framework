import type { Token } from '../../di/types.js';

/**
 * Factory function for creating module instances
 */
export type ModuleFactory = () => Promise<unknown>;

/**
 * Internal entry for tracking module state
 */
interface ModuleEntry {
  factory: ModuleFactory;
  instance?: unknown;
  loading?: Promise<unknown>;
}

/**
 * LazyModuleLoader defers initialization of non-critical modules to background.
 *
 * Features:
 * - Register modules with factory functions
 * - Load critical modules immediately
 * - Queue non-critical modules for background loading via setImmediate
 * - Deduplicate loading promises to avoid redundant initialization
 * - Ensure modules are loaded before access
 *
 * Usage:
 * ```typescript
 * const loader = new LazyModuleLoader();
 *
 * loader.register('AuthModule', async () => new AuthService());
 * loader.register('CacheModule', async () => new CacheService());
 *
 * // Load critical modules first
 * await loader.loadCritical(['AuthModule']);
 *
 * // Queue non-critical modules for background loading
 * loader.loadInBackground(['CacheModule']);
 *
 * // Wait for a specific module to load
 * const module = await loader.ensureLoaded('CacheModule');
 * ```
 */
export class LazyModuleLoader {
  private modules: Map<Token, ModuleEntry> = new Map();
  private pendingCount: number = 0;

  /**
   * Register a module with a factory function.
   *
   * @param token - Unique identifier for the module
   * @param factory - Async factory function that creates the module instance
   */
  register(token: Token, factory: ModuleFactory): void {
    this.modules.set(token, { factory });
  }

  /**
   * Load critical modules immediately in parallel.
   *
   * @param tokens - Array of module tokens to load
   * @returns Promise that resolves when all modules are loaded
   */
  async loadCritical(tokens: Token[]): Promise<void> {
    if (tokens.length === 0) {
      return;
    }

    const promises = tokens.map(token => this.loadModule(token));
    await Promise.all(promises);
  }

  /**
   * Queue non-critical modules for background loading.
   * Uses setImmediate to defer loading to the next event loop tick.
   *
   * @param tokens - Array of module tokens to load in background
   */
  loadInBackground(tokens: Token[]): void {
    if (tokens.length === 0) {
      return;
    }

    for (const token of tokens) {
      this.pendingCount++;
      setImmediate(async () => {
        try {
          // Check if module still exists before loading
          if (this.modules.has(token)) {
            await this.loadModule(token);
          }
        } catch {
          // Silently ignore errors in background loading
          // The module can still be accessed via ensureLoaded() which will propagate the error
        } finally {
          this.pendingCount--;
        }
      });
    }
  }

  /**
   * Ensure a module is loaded. Blocks until the module is available.
   *
   * If the module is already loaded, returns the cached instance.
   * If the module is currently loading, returns the same promise.
   * Otherwise, loads the module immediately.
   *
   * @param token - Module token
   * @returns Promise that resolves to the module instance
   * @throws Error if the module is not registered
   */
  async ensureLoaded(token: Token): Promise<unknown> {
    const entry = this.modules.get(token);
    if (!entry) {
      throw new Error(`Module not found: ${String(token)}`);
    }

    return this.loadModule(token);
  }

  /**
   * Check if a module has been loaded.
   *
   * @param token - Module token
   * @returns True if the module instance is cached, false otherwise
   */
  isLoaded(token: Token): boolean {
    const entry = this.modules.get(token);
    return entry ? 'instance' in entry && entry.instance !== undefined : false;
  }

  /**
   * Check if a module has been registered.
   *
   * @param token - Module token
   * @returns True if the module is registered, false otherwise
   */
  has(token: Token): boolean {
    return this.modules.has(token);
  }

  /**
   * Get the number of modules currently pending background loading.
   *
   * @returns Count of pending background load operations
   */
  getPendingCount(): number {
    return this.pendingCount;
  }

  /**
   * Clear all registered modules and reset state.
   */
  clear(): void {
    this.modules.clear();
    this.pendingCount = 0;
  }

  /**
   * Internal: Load a module and cache the result.
   *
   * Returns cached instance if available.
   * Returns existing promise if currently loading (deduplicates).
   * Otherwise executes factory and caches the result.
   *
   * @param token - Module token
   * @returns Promise that resolves to the module instance
   */
  private async loadModule(token: Token): Promise<unknown> {
    const entry = this.modules.get(token);
    if (!entry) {
      throw new Error(`Module not found: ${String(token)}`);
    }

    // Return cached instance if already loaded
    if ('instance' in entry && entry.instance !== undefined) {
      return entry.instance;
    }

    // Return existing promise if currently loading (deduplication)
    if (entry.loading) {
      return entry.loading;
    }

    // Execute factory and cache the promise
    const loadPromise = (async () => {
      const instance = await entry.factory();
      entry.instance = instance;
      delete entry.loading;
      return instance;
    })();

    entry.loading = loadPromise;
    return loadPromise;
  }
}
