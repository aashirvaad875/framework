# Plugin System Guide

## Overview

The framework's plugin system allows you to extend functionality at multiple levels:

- HTTP routes and controllers
- Services and dependency injection
- Middleware and interceptors
- Events and messaging
- Transport adapters

## Quick Start

### 1. Create a Plugin Manifest

Create `plugin.json` in your plugin directory:

```json
{
  "name": "my-awesome-plugin",
  "version": "1.0.0",
  "description": "My awesome plugin",
  "author": "Your Name",
  "keywords": ["awesome"],
  "dependencies": [],
  "capabilities": {
    "services": ["MyService"],
    "routes": ["GET /awesome"]
  }
}
```

### 2. Implement Plugin

Create `index.ts`:

```typescript
import { Plugin, OnPluginLoad, OnPluginUnload } from '@framework/core';
import type { PluginContext } from '@framework/core';

@Plugin({
  name: 'my-awesome-plugin',
  version: '1.0.0',
  description: 'My awesome plugin',
  author: 'Your Name',
  keywords: ['awesome'],
  dependencies: [],
  capabilities: { services: ['MyService'], routes: [] },
})
export class MyAwesomePlugin {
  @OnPluginLoad()
  async onLoad(context: PluginContext) {
    console.log('Plugin loaded!');
  }

  @OnPluginUnload()
  async onUnload(context: PluginContext) {
    console.log('Plugin unloaded!');
  }
}
```

### 3. Register Plugin

In your application bootstrap:

```typescript
import { MyAwesomePlugin } from './plugins/my-awesome-plugin/index.js';

const app = new Application();
app.registerPlugin(
  {
    name: 'my-awesome-plugin',
    version: '1.0.0',
    description: 'My awesome plugin',
    author: 'Your Name',
    keywords: [],
    dependencies: [],
    capabilities: {},
  },
  MyAwesomePlugin
);

await app.loadPlugins();
```

## Lifecycle Hooks

Plugins support two lifecycle hooks:

- `@OnPluginLoad()` - Executes when plugin loads (register services, routes, etc.)
- `@OnPluginUnload()` - Executes when plugin unloads (clean up resources)

## Plugin Context

Each plugin receives a `PluginContext` providing access to:

- `app` - Application instance
- `container` - DI container
- `eventBus` - Event communication
- `logger` - Structured logging
- `pluginScope` - Plugin-local storage
- `config` - Plugin configuration

## Example: Creating a Service Plugin

```typescript
@Injectable()
export class AnalyticsService {
  async track(event: string, data: any) {
    // Track event
  }
}

@Plugin({...})
export class AnalyticsPlugin {
  @OnPluginLoad()
  async onLoad(context: PluginContext) {
    context.container.registerClass(AnalyticsService);
    context.eventBus.emit('analytics:ready');
  }
}
```

See `plugin-development.md` for more detailed examples.
