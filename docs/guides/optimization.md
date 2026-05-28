# Framework Optimization System

The framework provides a comprehensive three-layer optimization system designed to improve both startup time and request latency while minimizing memory overhead. Each layer is independently configurable and targets different aspects of application performance.

## Overview

The optimization system consists of three distinct layers:

- **Layer 1: Core Optimizations** (Always-on) - Fundamental performance improvements through metadata caching, route compilation, and lazy module loading
- **Layer 2: Enterprise Optimizations** (Production) - Advanced caching and memory management for high-throughput scenarios
- **Layer 3: Observability** (Optional) - Performance profiling and metrics collection for monitoring and analysis

Each layer builds upon the previous one, and can be individually configured based on your environment and requirements.

### Layer Architecture

```
┌─────────────────────────────────────────┐
│    Layer 3: Observability & Profiling   │
│  (Profiler, Metrics Collection, CLI)    │
├─────────────────────────────────────────┤
│  Layer 2: Enterprise Optimizations      │
│  (Request Cache, Middleware Cache,      │
│   DI Memoization, Buffer Pooling)       │
├─────────────────────────────────────────┤
│  Layer 1: Core Optimizations            │
│  (Metadata Cache, Route Compiler,       │
│   Lazy Module Loader)                   │
└─────────────────────────────────────────┘
```

## Quick Start

### Basic Configuration

The simplest way to enable optimizations is using the default configuration:

```typescript
import { Application, defaultOptimizationConfig } from '@framework/core';

const app = new Application();

// Enable optimizations with environment-based defaults
const optimizationConfig = defaultOptimizationConfig(process.env.NODE_ENV);

app.configure({
  optimization: optimizationConfig,
});

await app.bootstrap();

// Verify optimization system is active
const manager = app.getOptimizationManager();
if (manager) {
  console.log('[Optimization] Framework optimizations enabled');
  console.log('Configuration:', manager.getConfig());
}
```

### Environment-Based Defaults

The framework automatically applies different optimization profiles based on the environment:

**Development Mode:**

```
- Layer 1: ENABLED (Core optimizations always active)
- Layer 2: DISABLED (Memory efficiency preferred over throughput)
- Layer 3: DISABLED (No overhead unless explicitly enabled)
```

**Production Mode:**

```
- Layer 1: ENABLED (Core optimizations)
- Layer 2: ENABLED (Request/middleware caching, DI optimization, buffer pooling)
- Layer 3: DISABLED (Enabled only with ENABLE_PROFILING=true)
```

## Layer 1: Core Optimizations

Layer 1 provides fundamental performance improvements that are always active (in production). These optimizations focus on reducing redundant work during startup and routing.

### Metadata Cache

The metadata cache stores computed module metadata (providers, imports, exports) to avoid recalculation on subsequent module registrations.

**Impact:** 20-30% reduction in module registration overhead

**Configuration:**

```typescript
const config = defaultOptimizationConfig('production', {
  layer1: {
    enabled: true,
  },
});
```

**Usage:**

```typescript
const layer1 = app.getOptimizationLayer(1);
if (layer1?.metadataCache) {
  const metadata = layer1.metadataCache.get(MyModule);
}
```

### Route Compiler with Trie Lookup

Routes are compiled into an optimized trie structure for O(path-segments) lookup instead of O(n) linear search.

**Features:**

- Automatic trie construction from registered routes
- Parameter extraction with minimal overhead
- Wildcard and regex pattern support
- Built-in conflict resolution

**Impact:** 15-25% faster route resolution

**Example Route Compilation:**

```
/users/:id/posts/:postId →
  users → :id (param) → posts → :postId (param)
```

### Lazy Module Loader

Modules can be loaded asynchronously in the background, decoupling startup time from module initialization.

**Configuration:**

```typescript
const config = defaultOptimizationConfig('production', {
  layer1: {
    enabled: true,
  },
});
```

**Features:**

- Background module initialization
- Dependency-aware loading order
- Graceful degradation for unmounted modules
- Progress tracking

**Usage:**

```typescript
// Modules start loading in the background during bootstrap
await app.bootstrap();

// Verify initialization status
const layer1 = app.getOptimizationLayer(1);
if (layer1?.lazyModuleLoader) {
  const status = layer1.lazyModuleLoader.getLoadingStatus();
}
```

## Layer 2: Enterprise Optimizations

Layer 2 optimizations are typically enabled in production and focus on throughput and memory efficiency for high-traffic scenarios.

### Request Caching

Responses for cacheable requests (based on method, path, and TTL) are cached and served directly without processing.

**Configuration:**

```typescript
const config = defaultOptimizationConfig('production', {
  layer2: {
    enabled: true,
    caching: {
      enabled: true,
      ttl: 300, // Cache TTL in seconds (default 5 minutes)
    },
  },
});
```

**Cacheable Methods:** GET, HEAD, OPTIONS

**Impact:** 50-80% latency reduction for cacheable requests

**Cache Key Generation:**

```
${method}:${path}:${serialized_query_params}
```

### Middleware Chain Caching

Computed middleware chains are cached after first execution, avoiding re-evaluation on subsequent requests with the same pattern.

**Configuration:**

```typescript
const config = defaultOptimizationConfig('production', {
  layer2: {
    enabled: true,
    middlewareChain: true,
  },
});
```

**Impact:** 30-40% reduction in middleware resolution overhead

**How It Works:**

1. First request: Middleware chain is computed and stored
2. Subsequent requests: Pre-computed chain is reused
3. Invalidation: Cache is cleared when middleware stack changes

### Dependency Injection Memoization

DI provider resolution results are cached, reducing provider instantiation overhead.

**Configuration:**

```typescript
const config = defaultOptimizationConfig('production', {
  layer2: {
    enabled: true,
    di: {
      memoization: true,
    },
  },
});
```

**Impact:** 25-35% reduction in DI resolution time

**Memoization Targets:**

- Singleton provider instances
- Factory function results
- Computed provider dependencies

### Buffer Pooling

Memory buffers for request/response handling are pooled and reused, reducing garbage collection pressure.

**Configuration:**

```typescript
const config = defaultOptimizationConfig('production', {
  layer2: {
    enabled: true,
    memory: {
      pooling: true,
      poolSize: 100, // Number of pre-allocated buffers
    },
  },
});
```

**Impact:** 10-15% GC pause reduction, improved memory stability

**Pool Management:**

- Pre-allocated buffers on startup
- Automatic buffer release after request completion
- Overflow handling for high-concurrency scenarios

## Layer 3: Observability

Layer 3 provides comprehensive performance monitoring and profiling capabilities for deep performance analysis.

### Enable Layer 3

Layer 3 is disabled by default. Enable it via environment variable:

```bash
ENABLE_PROFILING=true node src/main.js
```

Or in code:

```typescript
const config = defaultOptimizationConfig('production', {
  layer3: {
    enabled: true,
    metricsPort: 9090, // Port for metrics HTTP server
    sampleSize: 100, // Sample every Nth request
  },
});
```

### Profiler

Tracks detailed execution times and memory usage for:

- Route handlers
- Middleware execution
- DI provider resolution
- GC pauses

**CLI Access:**

```bash
# View performance report (requires Layer 3 enabled)
npx @framework/cli optimization:profile

# Output includes:
# - Slowest routes (top 10)
# - Slowest providers (top 10)
# - Slowest middleware (top 10)
# - Memory usage trends
# - GC pause analysis
```

### Metrics Collection

Real-time metrics are exposed via HTTP endpoint (default: `http://localhost:9090/metrics`):

```json
{
  "routes": [
    {
      "path": "/api/users",
      "method": "GET",
      "count": 1250,
      "avgTime": 12.5,
      "p99Time": 45.2
    }
  ],
  "providers": [...],
  "middleware": [...],
  "memory": {
    "heapUsed": 45000000,
    "gcPauses": [
      { "type": "MarkSweep", "duration": 150 }
    ]
  }
}
```

### CLI Integration

Layer 3 adds a new CLI flag for startup diagnostics:

```bash
# Show optimization status at startup
node src/main.js --show-optimizations

# Output:
# [Optimization] Layer 1 enabled (Core)
# [Optimization] Layer 2 enabled (Enterprise: caching, DI, memory)
# [Optimization] Layer 3 enabled (Observability)
# [Optimization] Framework startup complete - 234ms
```

## Performance Targets

The three-layer system is designed to achieve the following improvements:

### Startup Time

- **Layer 1 Only:** 20-30% improvement
- **Layer 1 + 2:** 30-40% improvement
- **Layer 1 + 2 + 3:** 25-35% improvement (Layer 3 adds monitoring overhead)

### Request Latency

- **Layer 1:** 5-10% improvement
- **Layer 1 + 2:** 15-25% improvement (with caching)
- **Cache Hits:** 50-80% latency reduction

### Memory Impact

- **Layer 1:** Negligible overhead (shared metadata)
- **Layer 2:** 5-10MB additional (buffer pool, caches)
- **Layer 3:** 2-5MB additional (metrics collection)

### Conditions for Best Results

- Warm caches (after ~1000 requests)
- Consistent request patterns (higher cache hit ratio)
- Production environment with full optimization layers enabled
- Stable provider dependencies (less cache invalidation)

## API Reference

### Application Methods

#### `getOptimizationManager(): OptimizationManager | undefined`

Returns the optimization manager instance, or `undefined` if optimizations are not configured.

**Usage:**

```typescript
const manager = app.getOptimizationManager();
if (manager) {
  const config = manager.getConfig();
  console.log('Optimizations enabled:', config);
}
```

#### `getOptimizationLayer(layer: 1 | 2 | 3): Layer1 | Layer2 | Layer3 | undefined`

Returns a specific optimization layer instance.

**Parameters:**

- `layer`: Layer number (1, 2, or 3)

**Returns:** Layer-specific interface, or `undefined` if not initialized

**Layer 1 Interface:**

```typescript
interface Layer1 {
  metadataCache: MetadataCache;
  routeCompiler: RouteCompiler;
  lazyModuleLoader: LazyModuleLoader;
}
```

**Layer 2 Interface:**

```typescript
interface Layer2 {
  requestCache: RequestCache;
  middlewareChainCache: MiddlewareChainCache;
  memoizationCache: MemoizationCache;
  bufferPool: BufferPool;
}
```

**Layer 3 Interface:**

```typescript
interface Layer3 {
  profiler: Profiler;
  metricsCollector: MetricsCollector;
}
```

**Usage Examples:**

```typescript
// Access Layer 1
const layer1 = app.getOptimizationLayer(1);
if (layer1) {
  const metadata = layer1.metadataCache.get(UserModule);
}

// Access Layer 2
const layer2 = app.getOptimizationLayer(2);
if (layer2) {
  layer2.requestCache.clear();
}

// Access Layer 3
const layer3 = app.getOptimizationLayer(3);
if (layer3) {
  const report = layer3.profiler.generateReport();
}
```

### Configuration Examples

#### Development Environment

```typescript
import { defaultOptimizationConfig } from '@framework/core';

const config = defaultOptimizationConfig('development');

// Result:
// {
//   layer1: { enabled: true },
//   layer2: { enabled: false, ... },
//   layer3: { enabled: false, ... }
// }
```

#### Production with Full Optimization

```typescript
const config = defaultOptimizationConfig('production');

// Result:
// {
//   layer1: { enabled: true },
//   layer2: {
//     enabled: true,
//     caching: { enabled: true, ttl: 300 },
//     middlewareChain: true,
//     di: { memoization: true },
//     memory: { pooling: true, poolSize: 100 }
//   },
//   layer3: { enabled: false, ... }
// }
```

#### Production with Monitoring

```typescript
const config = defaultOptimizationConfig('production', {
  layer3: {
    enabled: true,
    metricsPort: 9090,
    sampleSize: 100,
  },
});
```

#### Custom Configuration

```typescript
const config = defaultOptimizationConfig('production', {
  layer2: {
    caching: {
      ttl: 600, // Increase cache TTL to 10 minutes
    },
    memory: {
      poolSize: 200, // Increase buffer pool size
    },
  },
});
```

## Best Practices

### Monitoring Optimization Impact

1. **Use Layer 3 in development** to identify slow routes and providers
2. **Monitor cache hit rates** to validate Layer 2 effectiveness
3. **Track GC pause times** to validate buffer pooling benefits
4. **Compare startup times** before and after enabling optimizations

### Cache Invalidation Strategy

- Request cache is invalidated automatically based on TTL
- Middleware chain cache is invalidated when middleware stack changes
- DI memoization cache is cleared when providers are re-registered
- Manual invalidation available via Layer API if needed

### Memory Management

- Set `poolSize` based on your expected concurrency level
- Monitor heap usage with `--max-old-space-size` flag if needed
- Use Layer 3 profiling to identify memory leaks
- Clear caches manually in long-running processes if needed

### Production Deployment Checklist

- [ ] Enable Layer 1 (always on in production)
- [ ] Enable Layer 2 for high-traffic services (>1000 req/s)
- [ ] Configure appropriate cache TTLs for your data patterns
- [ ] Set `poolSize` to handle peak concurrency
- [ ] Enable Layer 3 during load testing
- [ ] Monitor metrics endpoint for anomalies
- [ ] Tune based on actual performance data

## Troubleshooting

### Cache Hit Rate is Low

**Symptoms:** Layer 2 caching enabled but minimal latency improvement

**Possible Causes:**

1. Request patterns are too diverse (different paths/params)
2. Cache TTL too short for your workload
3. High variation in query parameters

**Solutions:**

```typescript
// Increase cache TTL
const config = defaultOptimizationConfig('production', {
  layer2: {
    caching: {
      ttl: 600, // 10 minutes instead of 5
    },
  },
});

// Or implement custom cache key strategy
const layer2 = app.getOptimizationLayer(2);
if (layer2) {
  layer2.requestCache.setKeyStrategy(customKeyFn);
}
```

### High Memory Usage

**Symptoms:** Memory increases significantly after enabling optimizations

**Possible Causes:**

1. Cache is storing too many responses
2. Buffer pool size too large
3. Memory leak in profiling/metrics collection

**Solutions:**

```typescript
// Reduce cache TTL or buffer pool size
const config = defaultOptimizationConfig('production', {
  layer2: {
    caching: { ttl: 60 }, // 1 minute
    memory: { poolSize: 50 }, // Fewer buffers
  },
});

// Use Layer 3 to profile memory usage
const layer3 = app.getOptimizationLayer(3);
if (layer3) {
  const report = layer3.profiler.generateReport();
  console.log('Memory stats:', report.memoryUsage);
}
```

### Optimization Manager Undefined

**Symptoms:** `app.getOptimizationManager()` returns undefined

**Possible Causes:**

1. Optimizations not configured before bootstrap
2. Configuration syntax error

**Solutions:**

```typescript
// Ensure optimization config is passed before bootstrap
const app = new Application();

app.configure({
  optimization: defaultOptimizationConfig(process.env.NODE_ENV),
});

await app.bootstrap();

const manager = app.getOptimizationManager();
// Should now be defined
```

## Migration Guide

### From Legacy Application (No Optimizations)

1. **Import optimization utilities:**

   ```typescript
   import { defaultOptimizationConfig } from '@framework/core';
   ```

2. **Add configuration:**

   ```typescript
   app.configure({
     optimization: defaultOptimizationConfig(process.env.NODE_ENV),
   });
   ```

3. **Update bootstrap:**

   ```typescript
   await app.bootstrap();
   ```

4. **Verify:**

   ```typescript
   const manager = app.getOptimizationManager();
   if (manager) {
     console.log('[Optimization] Enabled:', manager.getConfig());
   }
   ```

5. **Test:** Run your test suite to ensure compatibility

### Gradual Layer Enablement

```typescript
// Phase 1: Layer 1 only (low risk)
let config = defaultOptimizationConfig('production', {
  layer2: { enabled: false },
  layer3: { enabled: false },
});

// Phase 2: Add Layer 2 after validation (medium risk)
config = defaultOptimizationConfig('production', {
  layer2: { enabled: true },
  layer3: { enabled: false },
});

// Phase 3: Add Layer 3 for monitoring (no risk)
config = defaultOptimizationConfig('production', {
  layer3: { enabled: true },
});
```

## See Also

- [Performance Profiling](../IMPLEMENTATION_SUMMARY.md)
- [Configuration Guide](../QUICK_REFERENCE.md)
- [Module System](../MODULE_SYSTEM.md)
