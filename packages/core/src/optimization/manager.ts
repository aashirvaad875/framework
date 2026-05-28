import { MetadataCache } from './layer1/metadata-cache.js';
import { RouteCompiler } from './layer1/route-compiler.js';
import { LazyModuleLoader } from './layer1/lazy-module-loader.js';
import { RequestCache } from './layer2/request-cache.js';
import { MiddlewareChainCache } from './layer2/middleware-chain-cache.js';
import { MemoizationCache } from './layer2/memoization-cache.js';
import { BufferPool } from './layer2/buffer-pool.js';
import { Profiler } from './layer3/profiler.js';
import { MetricsCollector } from './layer3/metrics-collector.js';
import type { OptimizationConfig } from './types.js';

/**
 * Layer 1 interface - Always-on optimization (metadata caching, routing, lazy loading)
 */
export interface Layer1 {
  metadataCache: MetadataCache;
  routeCompiler: RouteCompiler;
  lazyModuleLoader: LazyModuleLoader;
}

/**
 * Layer 2 interface - Production caching and memory optimization
 */
export interface Layer2 {
  requestCache: RequestCache;
  middlewareChainCache: MiddlewareChainCache;
  memoizationCache: MemoizationCache;
  bufferPool: BufferPool;
}

/**
 * Layer 3 interface - Observability and profiling
 */
export interface Layer3 {
  profiler: Profiler;
  metricsCollector: MetricsCollector;
}

/**
 * OptimizationManager orchestrates all three optimization layers based on configuration.
 *
 * This class is responsible for:
 * - Creating and initializing optimization layers based on configuration
 * - Managing the lifecycle of all layers
 * - Providing access to layer instances
 *
 * Usage:
 * ```typescript
 * const config = defaultOptimizationConfig('production');
 * const manager = new OptimizationManager(config);
 * await manager.initialize();
 *
 * // Use the layers
 * manager.layer1?.metadataCache.setModuleMetadata(...);
 * manager.layer2?.requestCache.set(...);
 * manager.layer3?.profiler.start(...);
 *
 * // Clean up
 * await manager.shutdown();
 * ```
 */
export class OptimizationManager {
  /**
   * Layer 1 instance (always-on optimization)
   */
  layer1?: Layer1;

  /**
   * Layer 2 instance (production caching and memory optimization)
   */
  layer2?: Layer2;

  /**
   * Layer 3 instance (observability and profiling)
   */
  layer3?: Layer3;

  /**
   * Configuration for this manager
   */
  private config: OptimizationConfig;

  /**
   * Creates a new OptimizationManager instance
   * @param config - The optimization configuration
   */
  constructor(config: OptimizationConfig) {
    this.config = config;
  }

  /**
   * Initialize optimization layers based on configuration.
   *
   * This method creates instances of enabled layers:
   * - Layer 1: MetadataCache, RouteCompiler, LazyModuleLoader
   * - Layer 2: RequestCache, MiddlewareChainCache, MemoizationCache, BufferPool
   * - Layer 3: Profiler, MetricsCollector
   *
   * @returns Promise that resolves when initialization is complete
   */
  async initialize(): Promise<void> {
    // Initialize Layer 1 if enabled
    if (this.config.layer1.enabled) {
      this.layer1 = {
        metadataCache: new MetadataCache(),
        routeCompiler: new RouteCompiler(),
        lazyModuleLoader: new LazyModuleLoader(),
      };
    }

    // Initialize Layer 2 if enabled
    if (this.config.layer2.enabled) {
      this.layer2 = {
        requestCache: new RequestCache(),
        middlewareChainCache: new MiddlewareChainCache(),
        memoizationCache: new MemoizationCache(),
        bufferPool: new BufferPool(this.config.layer2.memory.poolSize),
      };
    }

    // Initialize Layer 3 if enabled
    if (this.config.layer3.enabled) {
      this.layer3 = {
        profiler: new Profiler(),
        metricsCollector: new MetricsCollector(),
      };
    }
  }

  /**
   * Shut down all optimization layers and clean up resources.
   *
   * This method:
   * - Clears all caches in Layer 2
   * - Clears all modules in Layer 1
   * - Generates and logs profiler report from Layer 3 if active
   * - Resets all layer instances to undefined
   *
   * @returns Promise that resolves when shutdown is complete
   */
  async shutdown(): Promise<void> {
    // Clear Layer 2 caches if layer2 is initialized
    if (this.layer2) {
      this.layer2.bufferPool.clear();
      this.layer2.requestCache.clear();
      this.layer2.middlewareChainCache.clear();
      // Note: MemoizationCache.clear() requires an active scope,
      // so we don't call it here. Scopes are isolated per async context.
    }

    // Clear Layer 1 if initialized
    if (this.layer1) {
      this.layer1.lazyModuleLoader.clear();
      this.layer1.metadataCache.clear();
      this.layer1.routeCompiler.clear();
    }

    // Generate profiler report from Layer 3 if initialized
    if (this.layer3) {
      if (this.layer3.profiler.isActive()) {
        const report = this.layer3.profiler.report();
        console.error('Profiler Report:', report);
      }
    }

    // Reset all layer instances
    this.layer1 = undefined;
    this.layer2 = undefined;
    this.layer3 = undefined;
  }

  /**
   * Get the current optimization configuration
   * @returns The OptimizationConfig used by this manager
   */
  getConfig(): OptimizationConfig {
    return this.config;
  }
}

/**
 * Global singleton instance holder for OptimizationManager
 * Use this for application-wide optimization management
 *
 * Example:
 * ```typescript
 * const { globalOptimizationManager } = await import('./manager.js');
 * globalOptimizationManager.instance = new OptimizationManager(config);
 * await globalOptimizationManager.instance.initialize();
 * ```
 */
export const globalOptimizationManager: { instance?: OptimizationManager } = {
  instance: undefined,
};
