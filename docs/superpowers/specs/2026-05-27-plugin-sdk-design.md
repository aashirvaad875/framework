# Plugin SDK Design Specification

## Overview

**Goal:** Build a comprehensive plugin system for the framework that enables third-party developers to extend the framework at multiple levels: HTTP routes/features, infrastructure (transports, adapters, middleware), and core systems.

**User Requirements:** Plugin registration (explicit + auto-discovery), lifecycle hooks (event-based), plugin metadata (code-based decorators + manifest files), moderate isolation (API boundaries, shared DI, same process), and DI access for plugins.

**Architecture:** Three-layer system with Application Layer (core framework), Plugin SDK & APIs (public interfaces for extension), and Plugin Runtime (loader, manager, registry, lifecycle handling).

**Tech Stack:** TypeScript decorators for metadata, JSON manifests for discovery, reflect-metadata for introspection, EventBus for inter-plugin communication, topological sorting for dependency resolution.

---

## Core Concepts

### Plugin System Overview

A **plugin** is a self-contained module that extends the framework's functionality. Plugins:
- Load after the core framework initializes
- Register routes, services, middleware, and event listeners
- Access the core DI container for dependencies
- Communicate with other plugins via EventBus
- Have isolated lifecycle management (can be loaded/unloaded independently)

### Three-Layer Architecture

**Layer 1: Application Layer (Core Framework)**
- `Application` class — entry point, orchestrates plugin loading
- Core modules and services (database, auth, logging, etc.)
- LifecycleRunner for app lifecycle events (onModuleInit, onApplicationBootstrap, etc.)
- EventBus for inter-plugin communication

**Layer 2: Plugin SDK & APIs**
- `PluginManager` — orchestrates plugin loading, resolution, lifecycle
- `PluginRegistry` — stores plugin metadata and instances
- `PluginManifest` — describes plugin capabilities and dependencies
- `PluginContext` — interface provided to plugins for framework access
- Decorators: `@Plugin`, `@OnPluginLoad`, `@OnPluginUnload`, `@PluginEvent`

**Layer 3: Plugin Runtime**
- PluginLoader — discovers and loads plugin code
- Dependency resolver — topological sort of plugin dependencies
- Isolation boundaries — API-based (not runtime sandboxing)
- Plugin scope — per-plugin storage for isolated singletons

---

## Core Components

### 1. PluginManifest

**Purpose:** Declarative metadata about a plugin.

**Format:** JSON file (`plugin.json` in plugin root)

```json
{
  "name": "auth-plugin",
  "version": "1.0.0",
  "description": "Authentication and authorization services",
  "author": "Acme Corp",
  "keywords": ["auth", "jwt", "rbac"],
  "dependencies": [],
  "peerDependencies": {
    "@framework/core": "^2.0.0"
  },
  "capabilities": {
    "routes": ["POST /auth/login", "POST /auth/logout"],
    "middleware": ["AuthMiddleware"],
    "guards": ["RoleGuard"],
    "services": ["AuthService", "JwtService"],
    "events": ["auth:user-logged-in", "auth:user-logged-out"]
  },
  "config": {
    "jwtSecret": { "type": "string", "required": true },
    "jwtExpiry": { "type": "number", "required": false, "default": 3600 }
  }
}
```

### 2. PluginRegistry

**Purpose:** Central storage for plugin metadata and instances.

**Responsibilities:**
- Store plugin manifests and metadata
- Track loaded plugin instances
- Maintain plugin lifecycle state (loading, loaded, unloading, unloaded)
- Provide query methods for discovery

**Key Methods:**
```typescript
class PluginRegistry {
  register(manifest: PluginManifest, instance: any): void
  get(pluginId: string): PluginMetadata | undefined
  getAll(): PluginMetadata[]
  getByCapability(capability: string): PluginMetadata[]
  has(pluginId: string): boolean
  remove(pluginId: string): void
  setLifecycleState(pluginId: string, state: PluginLifecycleState): void
  getLifecycleState(pluginId: string): PluginLifecycleState
}
```

### 3. PluginManager

**Purpose:** Orchestrates plugin discovery, resolution, loading, and lifecycle management.

**Responsibilities:**
- Discover plugins from multiple sources (explicit registration, filesystem, npm packages)
- Resolve plugin dependencies using topological sorting
- Load plugins in dependency order
- Manage plugin lifecycle events
- Provide EventBus for inter-plugin communication
- Handle errors and dependency conflicts

**Key Methods:**
```typescript
class PluginManager {
  constructor(app: Application, container: Container)
  
  registerPlugin(manifest: PluginManifest, pluginModule: any): void
  registerPluginDir(dirPath: string): void
  registerPluginPackages(packageNames: string[]): void
  
  async loadPlugins(): Promise<void>
  async unloadPlugin(pluginId: string): Promise<void>
  
  getPlugin(pluginId: string): PluginMetadata | undefined
  getLoadedPlugins(): PluginMetadata[]
  
  resolvePluginDependencies(): PluginMetadata[]  // topologically sorted
}
```

### 4. PluginLoader

**Purpose:** Discovers and loads plugin code from various sources.

**Responsibilities:**
- Read `plugin.json` manifest from plugin directory
- Load plugin entry point (index.ts/index.js)
- Extract metadata from decorators and manifest
- Validate plugin structure

**Supported Sources:**
- Explicit registration: `app.registerPlugin(pluginModule)`
- Filesystem: `app.registerPluginDir('./plugins')`
- NPM packages: `app.registerPluginPackages(['@org/plugin-name'])`

### 5. PluginContext

**Purpose:** Interface provided to each plugin for accessing framework features.

```typescript
interface PluginContext {
  id: string;                          // Unique plugin ID
  manifest: PluginManifest;            // Plugin metadata
  version: string;                     // Plugin version
  
  // Framework access
  app: Application;                    // Access to Application instance
  container: Container;                // Shared DI container
  eventBus: EventBus;                  // Event communication
  logger: Logger;                      // Structured logging
  
  // Plugin isolation
  pluginScope: Map<string, any>;       // Plugin-local storage for singletons
  
  // Configuration
  config: Record<string, any>;         // Plugin configuration from app
  
  // Lifecycle
  onLoad(fn: () => void | Promise<void>): void;
  onUnload(fn: () => void | Promise<void>): void;
}
```

---

## Lifecycle & Events

### Plugin Lifecycle States

```
Loading → Loaded → Unloading → Unloaded
  ↓                   ↓
  Error             Error
```

**States:**
- **Loading** — Plugin code is being loaded and initialized
- **Loaded** — Plugin has completed initialization and is active
- **Unloading** — Plugin is being shut down
- **Unloaded** — Plugin has been shut down and removed
- **Error** — Plugin load or initialization failed

### Lifecycle Hooks

Plugins can register hooks via decorator or context methods:

```typescript
// Option 1: Decorators on class methods
@Plugin({ id: 'my-plugin' })
class MyPlugin {
  @OnPluginLoad()
  async onLoad(context: PluginContext) {
    // Initialize plugin, register routes, services, etc.
  }

  @OnPluginUnload()
  async onUnload(context: PluginContext) {
    // Clean up resources, close connections
  }
}

// Option 2: Context callbacks (for functional plugins)
export function setupPlugin(context: PluginContext) {
  context.onLoad(async () => {
    // Initialize
  });
  
  context.onUnload(async () => {
    // Clean up
  });
}
```

### Event-Based Communication

Plugins communicate via EventBus:

```typescript
// Emit event
context.eventBus.emit('user-authenticated', { userId: '123', email: 'user@example.com' });

// Listen for events
context.eventBus.on('user-authenticated', (data) => {
  console.log(`User ${data.userId} logged in`);
});

// Remove listener
context.eventBus.off('user-authenticated', handler);
```

**Built-in Framework Events:**
- `app:bootstrap` — Application fully initialized
- `app:shutdown` — Application shutting down
- `plugin:loaded` — Plugin loaded successfully
- `plugin:error` — Plugin failed to load

---

## Plugin Discovery & Loading

### Discovery Methods

**1. Explicit Registration**
```typescript
import { MyPlugin } from './plugins/my-plugin';

app.registerPlugin({
  name: 'my-plugin',
  version: '1.0.0',
  dependencies: [],
  capabilities: {}
}, MyPlugin);
```

**2. Filesystem Auto-Discovery**
```typescript
// Scans ./plugins directory for plugin.json files
app.registerPluginDir('./plugins');
```

**Directory Structure:**
```
plugins/
├── auth-plugin/
│   ├── plugin.json
│   ├── index.ts
│   ├── src/
│   │   ├── auth.module.ts
│   │   ├── services/
│   │   │   └── auth.service.ts
│   │   └── controllers/
│   │       └── auth.controller.ts
│   └── package.json
├── database-plugin/
│   ├── plugin.json
│   └── index.ts
└── ...
```

**3. NPM Package Auto-Discovery**
```typescript
// Registers plugins from npm packages
// Looks for plugin.json in package root
app.registerPluginPackages([
  '@org/auth-plugin',
  '@org/cache-plugin'
]);
```

### Plugin Resolution Algorithm

```
1. Scan all discovery sources (explicit, filesystem, npm)
2. Read plugin.json from each source
3. Extract manifest and dependencies
4. Build dependency graph
5. Topologically sort plugins by dependencies
6. Validate no circular dependencies
7. Load plugins in sorted order
8. Execute onLoad hooks
```

**Dependency Resolution:**
```typescript
interface PluginManifest {
  name: string;
  version: string;
  dependencies: string[];  // Other plugin IDs
  capabilities: { ... };
  config: { ... };
}

// If plugin A depends on plugin B:
// - plugin B must be loaded before plugin A
// - PluginManager ensures this via topological sort
// - Error thrown if circular dependency detected
```

---

## DI Integration & Plugin Isolation

### Container Access

Each plugin gets access to the shared `Container` via `PluginContext`:

```typescript
// In plugin onLoad hook
@OnPluginLoad()
async onLoad(context: PluginContext) {
  // Register a service
  context.container.registerClass(MyService);
  
  // Resolve a service
  const db = context.container.resolve(Database);
  
  // Resolve multiple implementations
  const caches = context.container.resolveAll(CacheAdapter);
}
```

### Isolation Strategy

**Moderate Isolation — API Boundaries, Shared DI:**

1. **Trust-based boundaries** — plugins can access any core service, but documentation marks APIs as "public" or "@internal"
2. **Exported APIs** — only types/classes exported from `@framework/core` are considered public contract
3. **Plugin scope** — each plugin has `pluginScope` Map for plugin-local singletons that don't leak to core
4. **No runtime sandboxing** — plugins run in the same process and can access all services (performance/simplicity tradeoff)

### Service Registration Patterns

**Pattern 1: Plugin registers its own services**
```typescript
@OnPluginLoad()
async onLoad(context: PluginContext) {
  // Services automatically resolve to this plugin's module
  context.container.registerClass(AuthService);
  context.container.registerClass(JwtTokenizer);
}
```

**Pattern 2: Plugin uses core services**
```typescript
@OnPluginLoad()
async onLoad(context: PluginContext) {
  const database = context.container.resolve(Database);
  const logger = context.container.resolve(Logger);
  
  // Now authService can inject both
  context.container.registerClass(AuthService);
}
```

**Pattern 3: Plugin-scoped singletons**
```typescript
@OnPluginLoad()
async onLoad(context: PluginContext) {
  // Store instances that live as long as the plugin
  const cache = new PluginCache();
  context.pluginScope.set('cache', cache);
}

@OnPluginUnload()
async onUnload(context: PluginContext) {
  // Clean up plugin-scoped resources
  const cache = context.pluginScope.get('cache') as PluginCache;
  cache.clear();
}
```

---

## Extension Points

Plugins can extend the framework at these specific points:

### 1. HTTP Routes & Controllers
```typescript
@OnPluginLoad()
async onLoad(context: PluginContext) {
  // Register a new module with controllers
  const authModule = await context.app.registerModule({
    controllers: [AuthController],
    providers: [AuthService],
    imports: [],
    exports: []
  });
}
```

### 2. Middleware
```typescript
// Register custom middleware
context.app.use((req, res, next) => {
  // Custom middleware logic
  next();
});
```

### 3. Guards & Interceptors
```typescript
// Used via @UseGuard and @UseInterceptor decorators
// Plugins can inject custom guards/interceptors into controllers
context.container.registerClass(CustomGuard);
context.container.registerClass(CustomInterceptor);
```

### 4. Services & DI
```typescript
// Register services that can be injected
context.container.registerClass(AnalyticsService);
context.container.registerFactory(
  'custom-adapter',
  () => new CustomAdapter(context.config)
);
```

### 5. Event Listeners
```typescript
// Subscribe to framework and plugin events
context.eventBus.on('user:created', (user) => {
  // React to user creation
});

context.eventBus.on('plugin:loaded', ({ pluginId }) => {
  // React to other plugins loading
});
```

### 6. Transport Adapters
```typescript
// Register custom transports for microservices
context.container.registerClass(CustomTransport);
```

### 7. Cache Adapters
```typescript
// Register custom cache backends
context.container.registerClass(CustomCacheAdapter);
```

---

## Configuration & Best Practices

### Plugin Configuration

Plugins receive configuration via `context.config`:

```typescript
// In app bootstrap
const pluginConfig = {
  'auth-plugin': {
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiry: 3600
  },
  'analytics-plugin': {
    apiKey: process.env.ANALYTICS_KEY,
    sampleRate: 0.1
  }
};

app.registerPlugins(pluginConfig);
```

**In plugin:**
```typescript
@OnPluginLoad()
async onLoad(context: PluginContext) {
  const jwtSecret = context.config.jwtSecret;
  const jwtExpiry = context.config.jwtExpiry || 3600;
}
```

### Versioning & Compatibility

**package.json:**
```json
{
  "name": "@org/my-plugin",
  "version": "1.0.0",
  "peerDependencies": {
    "@framework/core": "^2.0.0"
  }
}
```

**plugin.json:**
```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "frameworkVersion": "^2.0.0"
}
```

### Error Handling

```typescript
@OnPluginLoad()
async onLoad(context: PluginContext) {
  try {
    // Load plugin resources
    const db = context.container.resolve(Database);
    await db.connect();
  } catch (error) {
    context.logger.error(`Failed to load plugin: ${error.message}`);
    // Re-throw to mark plugin as failed
    throw error;
  }
}
```

### Hot Reload Considerations

Plugins can be unloaded and reloaded:
```typescript
// Unload
await pluginManager.unloadPlugin('my-plugin');

// Remove from registry and clean up resources
// Reload
await pluginManager.loadPlugins();
```

For hot reload support:
1. Plugins must clean up all resources in onUnload hook
2. No long-lived references should be held by other plugins
3. Event listeners must be properly unsubscribed
4. Database connections must be closed

---

## Success Criteria

✅ Plugin registration works (explicit, filesystem, npm packages)
✅ Lifecycle hooks execute in correct order (onLoad → onUnload)
✅ Event-based communication functional (EventBus)
✅ Plugin dependency resolution correct (topological sort, cycle detection)
✅ PluginContext provides all required framework access
✅ Plugins can register services, routes, middleware
✅ Configuration loading from app to plugins works
✅ Error handling doesn't crash application
✅ Manifest validation enforces required fields
✅ Plugin isolation via API boundaries respected
✅ DI container access from plugins functional
✅ Examples demonstrate all extension points

---

## Out of Scope (Future Work)

- Runtime sandboxing (plugins in isolated V8 contexts) — complexity vs. benefit
- Plugin hot reload (system-level support) — plugins can be designed for it but not enforced
- Plugin marketplace/registry — can be built later on top of this SDK
- Plugin versioning constraints (semver ranges) — pin to exact versions for now
- Inter-plugin permissions model — trust-based for now
