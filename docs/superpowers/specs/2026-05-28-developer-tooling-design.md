# Developer Tooling System Design Specification

## Overview

**Goal:** Provide comprehensive developer tooling for rapid iteration and debugging during local development, including hot module reloading, request/execution inspection, dependency visualization, and performance diagnostics.

**User Requirements:** Hot reload for file changes, debug mode capturing request lifecycle, error overlay, module inspector, dependency graph viewer, developer dashboard, debugging utilities, diagnostics tools.

**Architecture:** Three-tier system—Hot Reload Engine monitors files and reloads modules; Debug/Diagnostics Capture records request lifecycle automatically in development; Developer Dashboard serves a web UI at `/__dev` displaying request history, module graph, metrics, and hot reload status.

**Tech Stack:** Node.js fs/chokidar for file watching, native ES module dynamic import for reloading, AsyncLocalStorage for request-scoped data capture, EventBus for module reload events, Express embedded route, prebuilt HTML+JS UI (no framework dependencies).

---

## Core Concepts

### Three-Tier Architecture

**Tier 1: Hot Reload Engine**

- File watcher monitors source files for changes
- Module reloader dynamically imports updated modules using import.meta.url patterns
- State preservation for database connections, singletons
- Broadcasts 'module:reloaded' event on EventBus
- Automatically enabled in NODE_ENV=development
- Zero overhead when disabled (non-dev environments skip all initialization)

**Tier 2: Debug/Diagnostics Capture**

- RequestCapture middleware intercepts HTTP requests at pipeline start
- Records: method, path, query params, body, headers
- Captures middleware execution with timing via lifecycle hooks
- Records handler execution duration and result
- Stores in AsyncLocalStorage (request-scoped) during request lifetime
- On response, persists to in-memory circular buffer (last 100 requests)
- Reuses OptimizationManager profiler data if enabled

**Tier 3: Developer Dashboard**

- Express route handler mounted at `/__dev` (dev mode only, no auth required)
- Serves single-page dashboard: request inspector, module dependency graph, metrics
- WebSocket endpoint for real-time updates (optional: file changes, request events)
- Uses prebuilt HTML+JS (embedded strings, no external dependencies)
- Falls back to REST polling if WebSocket unavailable
- Accessible only in development (guards against accidental production exposure)

### Design Principles

1. **Zero production overhead** — Entire system disabled by default; only active in NODE_ENV=development
2. **No external UI dependencies** — Dashboard uses vanilla JS, prebuilt HTML (no React, Vue, etc.)
3. **Memory-bounded** — Circular request buffer (100 requests), automatic eviction prevents memory leaks
4. **Non-invasive integration** — Single middleware insertion, leverages existing EventBus, no core changes
5. **Debuggable output** — JSON API responses for request history, metrics, dependency graph

---

## Tier 1: Hot Reload Engine

### 1.1 File Watcher

**Purpose:** Monitor source files and trigger module reloads on changes.

**Components:**

```typescript
interface WatcherConfig {
  enabled: boolean;
  directories: string[];
  excludePatterns?: string[];
  debounceMs?: number; // default 300ms
}

class FileWatcher {
  private watcher: FSWatcher;
  private debounceTimers = new Map<string, NodeJS.Timeout>();

  watch(config: WatcherConfig): void;
  onFileChange(filepath: string): void;
  stop(): void;
}
```

**Behavior:**

- Uses chokidar or Node.js fs.watch (depending on platform)
- Debounces rapid changes (e.g., editor saves)
- Emits 'file:changed' event to EventBus with filepath
- Ignores non-source files (.map, .test.ts, node_modules, etc.)

**Impact:** Minimal—runs only in dev, idle when no changes occur.

### 1.2 Module Reloader

**Purpose:** Dynamically reload changed modules without full process restart.

**Components:**

```typescript
interface ModuleReloadContext {
  filepath: string;
  module: ModuleRecord;
  previousExports?: unknown;
}

class ModuleReloader {
  private loadedModules = new Map<string, ModuleReloadContext>();
  private singletonCache = new Map<string, unknown>();

  reload(filepath: string): Promise<ModuleReloadContext>;
  getModuleGraph(): ModuleDependency[];
  invalidateCache(filepath: string): void;
}
```

**Behavior:**

- Maps source file to ESM module URL using import.meta.url resolution
- Appends cache-bust query param to force reimport: `?reload=<timestamp>`
- Preserves singleton state (database connections, caches) via singletonCache
- Reloads dependent modules transitively (breadth-first)
- Broadcasts 'module:reloaded' event with module info
- Returns success/failure status

**Impact:** Enables sub-second reload cycles for modified files.

### 1.3 State Preservation

**Purpose:** Keep critical singletons (DB, cache) alive across reloads.

**Mechanism:**

- Before reload: store singleton instances by token in singletonCache
- After reload: DI container merges singletonCache with new instances
- Tokens without changes preserve references (same memory address)
- Tokens with new implementations get new instances

---

## Tier 2: Debug/Diagnostics Capture

### 2.1 Request Capture Middleware

**Purpose:** Automatically record request/response lifecycle for inspection.

**Components:**

```typescript
interface RequestSnapshot {
  id: string; // uuid
  timestamp: number; // Date.now()
  method: string;
  path: string;
  query: Record<string, unknown>;
  body: unknown;
  headers: Record<string, string>;
  status: number;
  responseTime: number; // ms
  middlewareTraces: MiddlewareTrace[];
  handlerTrace: HandlerTrace;
  errorMessage?: string;
}

interface MiddlewareTrace {
  name: string;
  duration: number;
  index: number;
}

interface HandlerTrace {
  controller: string;
  method: string;
  duration: number;
  resultSize?: number;
}

class RequestCapture implements PipeTransform {
  private buffer: RequestSnapshot[] = [];
  private maxSize = 100;

  async transform(value: unknown, metadata: any): Promise<unknown>;
  getHistory(): RequestSnapshot[];
  clear(): void;
}
```

**Behavior:**

- Installed as first middleware (highest priority) to capture earliest timing
- Stores snapshot in AsyncLocalStorage during request
- On response finish, persists to circular buffer
- Records middleware execution via LifecycleRunner hooks
- Captures handler execution duration via wrapper
- Automatic memory management: evicts oldest entry when buffer exceeds 100

**Integration Points:**

- MiddlewarePipeline: insert at priority 1000 (highest)
- LifecycleRunner: subscribe to middleware hooks
- Route handler wrapper: measure execution time
- EventBus: publish 'request:captured' event after persistence

**Impact:** ~1-2% overhead per request (snapshot creation + storage).

### 2.2 Module Dependency Graph

**Purpose:** Analyze module relationships for visualization.

**Components:**

```typescript
interface ModuleDependency {
  id: string;
  filepath: string;
  imports: string[]; // paths this module imports
  importedBy: string[]; // paths that import this module
  type: 'module' | 'controller' | 'service' | 'provider' | 'dto';
  exports: string[]; // exported symbols
}

class ModuleGraph {
  private dependencies = new Map<string, ModuleDependency>();

  analyze(moduleClass: Function): ModuleGraph;
  getDependencies(filepath: string): ModuleDependency;
  getGraph(): ModuleDependency[];
  findCircularDeps(): string[][];
}
```

**Behavior:**

- Scans loaded modules from Module.getLoadedModules()
- Infers relationships from import statements via AST or static analysis
- Marks controller/service/provider nodes by checking decorators
- Detects circular dependencies and flags them
- Caches result; invalidates on 'module:reloaded' event

**Impact:** One-time scan on dashboard load (~100ms for typical app).

---

## Tier 3: Developer Dashboard

### 3.1 Dashboard Server

**Purpose:** Serve web UI and provide API for inspection data.

**Routes:**

```
GET /__dev                          → Dashboard HTML (prebuilt)
GET /__dev/api/requests             → JSON array of RequestSnapshot[]
GET /__dev/api/requests/:id         → Single RequestSnapshot details
GET /__dev/api/modules              → ModuleDependency[] (module graph)
GET /__dev/api/metrics              → OptimizationManager metrics (if enabled)
WS  /__dev/ws                       → WebSocket for real-time updates
```

**Components:**

```typescript
class DeveloperDashboard {
  private requestCapture: RequestCapture;
  private moduleGraph: ModuleGraph;
  private optimizationManager?: OptimizationManager;

  registerRoutes(app: Express): void;
  handleRequest(req: Request, res: Response): void; // /__dev
  handleWebSocket(ws: WebSocket, req: Request): void;
}
```

**UI Features:**

- **Request Inspector** — List of last 100 requests with filter/search
  - Click to expand request details (params, body, headers)
  - Click to expand response details (status, body preview, timing)
  - Middleware execution timeline (visual bar chart)
  - Handler execution highlight
- **Module Graph** — Interactive visualization (force-directed or hierarchical)
  - Click node to highlight dependencies
  - Color code by type (controller, service, provider, dto)
  - Show circular dependency warnings
  - Display import/export symbols on hover
- **Metrics Dashboard** — If OptimizationManager enabled
  - Slowest routes (top 10)
  - Slowest providers (top 10)
  - Memory distribution pie chart
  - GC pause timeline
- **Hot Reload Status** — Real-time indicator
  - Last reload time
  - Failed reloads with error message
  - Live file change watcher status

**Prebuilt HTML:**

- Single `dev-dashboard.html` file embedded as string in code
- Vanilla JS (no build step), uses Fetch API and WebSocket
- CSS-in-JS or inline `<style>` (no external stylesheets)
- Responsive layout (mobile-friendly)
- Falls back to REST polling if WebSocket unavailable

**WebSocket Protocol:**

```typescript
// Client → Server
{ type: 'subscribe', channels: ['requests', 'reloads', 'metrics'] }

// Server → Client (events)
{ type: 'request:captured', data: RequestSnapshot }
{ type: 'module:reloaded', data: { filepath, modules: [] } }
{ type: 'metrics:updated', data: MetricsReport }
```

### 3.2 Security & Access Control

**Access Guard:**

```typescript
// Middleware on /__dev routes
(req, res, next) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ error: 'Dev tooling unavailable' });
  }
  next();
};
```

**Behavior:**

- Only accessible when NODE_ENV=development
- No authentication required (safe because dev-only)
- Returns 403 if somehow accessed in production
- Dashboard does not expose sensitive data (auth tokens, passwords)

---

## Configuration & Runtime Control

### Configuration Structure

```typescript
interface DevToolingConfig {
  enabled: boolean; // default: NODE_ENV === 'development'
  hotReload: {
    enabled: boolean; // default: true
    directories: string[]; // default: ['src']
    debounceMs: number; // default: 300
  };
  debug: {
    enabled: boolean; // default: true
    captureRequestBody: boolean; // default: true
    maxHistorySize: number; // default: 100
  };
  dashboard: {
    enabled: boolean; // default: true
    path: string; // default: '/__dev'
    wsEnabled: boolean; // default: true
  };
}
```

### Environment-Based Defaults

```typescript
const defaults: DevToolingConfig = {
  enabled: process.env.NODE_ENV === 'development',
  hotReload: {
    enabled: true,
    directories: ['src'],
    debounceMs: 300,
  },
  debug: {
    enabled: true,
    captureRequestBody: true,
    maxHistorySize: 100,
  },
  dashboard: {
    enabled: true,
    path: '/__dev',
    wsEnabled: true,
  },
};
```

### Application Integration

```typescript
import { DevTooling } from '@framework/core';

const app = new Application({
  port: 3000,
});

// Auto-initialize if NODE_ENV=development
await app.bootstrap();

// Or explicit:
if (process.env.NODE_ENV === 'development') {
  const devTooling = new DevTooling(app, {
    /* config */
  });
  await devTooling.initialize();
}
```

---

## Integration Points

### 1. Application Class

**Location:** `packages/core/src/application.ts`

**Changes:**

- In constructor: check NODE_ENV and initialize DevTooling if development
- In bootstrap(): call devTooling.initialize() if enabled
- In close(): call devTooling.shutdown()
- Expose getter: getDevTooling()

### 2. Middleware Pipeline

**Location:** `packages/core/src/http/pipeline/middleware-pipeline.ts`

**Changes:**

- Insert RequestCapture middleware at priority 1000 if dev mode
- Capture middleware execution via hooks

### 3. Module System

**Location:** `packages/core/src/module.ts`

**Changes:**

- Export getLoadedModules() for ModuleGraph analysis
- Publish 'module:loaded' events to EventBus

### 4. HTTP Adapter

**Location:** `packages/core/src/http/adapters/express.adapter.ts`

**Changes:**

- Register DeveloperDashboard routes before other routes
- Allow dynamic route registration

---

## File Structure

```
packages/core/src/dev/
├── types.ts                          — Type definitions (RequestSnapshot, ModuleDependency, etc.)
├── config.ts                         — Configuration schema and defaults
├── hot-reload/
│   ├── file-watcher.ts              — FileWatcher class
│   ├── module-reloader.ts           — ModuleReloader class
│   └── index.ts                     — Exports
├── debug/
│   ├── request-capture.ts           — RequestCapture middleware
│   ├── module-graph.ts              — ModuleGraph analyzer
│   └── index.ts                     — Exports
├── dashboard/
│   ├── server.ts                    — DeveloperDashboard server & routes
│   ├── dashboard-ui.html.ts         — Prebuilt HTML template (string)
│   ├── ws-handler.ts                — WebSocket message handler
│   └── index.ts                     — Exports
├── dev-tooling.ts                   — Main DevTooling manager orchestrator
└── index.ts                         — Barrel export
```

---

## Success Criteria

✅ Hot reload monitors file changes and reloads modules in <500ms
✅ Request capture records 100 most recent requests with full lifecycle data
✅ Module graph analyzes dependencies and detects circular imports
✅ Developer dashboard accessible at `/__dev` in dev mode only
✅ Dashboard displays request inspector, module graph, metrics
✅ WebSocket provides real-time updates; graceful fallback to polling
✅ Zero overhead when NODE_ENV !== 'development'
✅ Singleton state preserved across module reloads
✅ Prebuilt HTML UI (no external dependencies)
✅ TypeScript strict mode compliance
✅ All features independently toggleable via config

---

## Out of Scope (Future Work)

- Breakpoint-based step-through debugging (too complex for MVP)
- APM integration (Datadog, New Relic)
- Time-travel debugging / request replay
- Source map integration for transpiled code
- Custom hot reload strategies per module type
- Distributed dev tooling across multiple processes
- IDE plugin (VS Code, IntelliJ)
