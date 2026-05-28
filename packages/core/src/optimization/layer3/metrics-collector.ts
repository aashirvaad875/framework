import type { Token } from '../../di/types.js';
import type { RouteStats, ProviderStats, MiddlewareStats } from '../types.js';

/**
 * Metrics report with route, provider, and middleware statistics
 */
export interface MetricsReport {
  routes: RouteStats[];
  providers: ProviderStats[];
  middleware: MiddlewareStats[];
  timestamp: number;
}

/**
 * Internal data structure for tracking route metrics
 */
interface RouteMetric {
  path: string;
  times: number[];
  memories: number[];
}

/**
 * Internal data structure for tracking provider metrics
 */
interface ProviderMetric {
  token: Token;
  times: number[];
}

/**
 * Internal data structure for tracking middleware metrics
 */
interface MiddlewareMetric {
  name: string;
  times: number[];
}

/**
 * Statistics aggregator for collecting and reporting performance metrics
 */
export class MetricsCollector {
  private routes: Map<string, RouteMetric> = new Map();
  private providers: Map<Token, ProviderMetric> = new Map();
  private middleware: Map<string, MiddlewareMetric> = new Map();

  /**
   * Record a route metric
   * @param path - Route path
   * @param duration - Execution duration in milliseconds
   * @param memory - Memory usage in bytes
   */
  recordRoute(path: string, duration: number, memory: number): void {
    if (!this.routes.has(path)) {
      this.routes.set(path, { path, times: [], memories: [] });
    }

    const metric = this.routes.get(path)!;
    metric.times.push(duration);
    metric.memories.push(memory);
  }

  /**
   * Record a provider metric
   * @param token - Provider token
   * @param duration - Execution duration in milliseconds
   */
  recordProvider(token: Token, duration: number): void {
    if (!this.providers.has(token)) {
      this.providers.set(token, { token, times: [] });
    }

    const metric = this.providers.get(token)!;
    metric.times.push(duration);
  }

  /**
   * Record a middleware metric
   * @param name - Middleware name
   * @param duration - Execution duration in milliseconds
   */
  recordMiddleware(name: string, duration: number): void {
    if (!this.middleware.has(name)) {
      this.middleware.set(name, { name, times: [] });
    }

    const metric = this.middleware.get(name)!;
    metric.times.push(duration);
  }

  /**
   * Get metrics for a specific route
   * @param path - Route path
   * @returns Route statistics or undefined if not found
   */
  getRouteMetrics(path: string): RouteStats | undefined {
    const metric = this.routes.get(path);
    if (!metric) {
      return undefined;
    }

    return this.calculateRouteStats(metric);
  }

  /**
   * Get metrics for a specific provider
   * @param token - Provider token
   * @returns Provider statistics or undefined if not found
   */
  getProviderMetrics(token: Token): ProviderStats | undefined {
    const metric = this.providers.get(token);
    if (!metric) {
      return undefined;
    }

    return this.calculateProviderStats(metric);
  }

  /**
   * Generate a metrics report and clear metrics
   * @returns Metrics report with all collected statistics
   */
  report(): MetricsReport {
    const routes = Array.from(this.routes.values())
      .map(metric => this.calculateRouteStats(metric))
      .sort((a, b) => b.avgTime - a.avgTime);

    const providers = Array.from(this.providers.values())
      .map(metric => this.calculateProviderStats(metric))
      .sort((a, b) => b.avgTime - a.avgTime);

    const middleware = Array.from(this.middleware.values())
      .map(metric => this.calculateMiddlewareStats(metric))
      .sort((a, b) => b.avgTime - a.avgTime);

    const report: MetricsReport = {
      routes,
      providers,
      middleware,
      timestamp: Date.now(),
    };

    // Clear metrics after report
    this.clear();

    return report;
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.routes.clear();
    this.providers.clear();
    this.middleware.clear();
  }

  /**
   * Calculate route statistics from raw metric data
   */
  private calculateRouteStats(metric: RouteMetric): RouteStats {
    const count = metric.times.length;
    const totalTime = metric.times.reduce((sum, t) => sum + t, 0);
    const totalMemory = metric.memories.reduce((sum, m) => sum + m, 0);

    return {
      path: metric.path,
      count,
      totalTime,
      avgTime: count > 0 ? totalTime / count : 0,
      minTime: count > 0 ? Math.min(...metric.times) : 0,
      maxTime: count > 0 ? Math.max(...metric.times) : 0,
      p99Time: count > 0 ? Math.max(...metric.times) * 0.99 : 0,
      totalMemory,
    };
  }

  /**
   * Calculate provider statistics from raw metric data
   */
  private calculateProviderStats(metric: ProviderMetric): ProviderStats {
    const count = metric.times.length;
    const totalTime = metric.times.reduce((sum, t) => sum + t, 0);
    const maxTime = count > 0 ? Math.max(...metric.times) : 0;

    return {
      token: metric.token,
      count,
      totalTime,
      avgTime: count > 0 ? totalTime / count : 0,
      minTime: count > 0 ? Math.min(...metric.times) : 0,
      maxTime,
      slowestTime: maxTime,
    };
  }

  /**
   * Calculate middleware statistics from raw metric data
   */
  private calculateMiddlewareStats(metric: MiddlewareMetric): MiddlewareStats {
    const count = metric.times.length;
    const totalTime = metric.times.reduce((sum, t) => sum + t, 0);

    return {
      name: metric.name,
      count,
      totalTime,
      avgTime: count > 0 ? totalTime / count : 0,
      minTime: count > 0 ? Math.min(...metric.times) : 0,
      maxTime: count > 0 ? Math.max(...metric.times) : 0,
    };
  }
}
