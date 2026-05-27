# Plugin Development Guide

## Registering Services

Use the container to register services:

```typescript
@OnPluginLoad()
async onLoad(context: PluginContext) {
  // Class provider
  context.container.registerClass(MyService);

  // Factory provider
  context.container.registerFactory(
    'my-service',
    () => new MyService()
  );

  // Value provider
  context.container.registerValue('config', myConfig);
}
```

## Registering Routes

Create a module and register it:

```typescript
@Module({
  controllers: [MyController],
  providers: [MyService]
})
export class MyModule {}

@OnPluginLoad()
async onLoad(context: PluginContext) {
  await context.app.registerModule(MyModule);
}
```

## Event Communication

Plugins communicate via EventBus:

```typescript
@OnPluginLoad()
async onLoad(context: PluginContext) {
  // Emit event
  context.eventBus.emit('plugin:ready', { pluginId: context.id });

  // Listen for events
  context.eventBus.on('user:created', (user) => {
    console.log('User created:', user);
  });
}
```

## Plugin Configuration

Pass configuration when registering plugins:

```typescript
app.setPluginConfig({
  'my-plugin': {
    apiKey: 'secret',
    enableFeature: true
  }
});

// In plugin
@OnPluginLoad()
async onLoad(context: PluginContext) {
  const apiKey = context.config.apiKey;
}
```

## Plugin Scope

Store plugin-local singletons:

```typescript
@OnPluginLoad()
async onLoad(context: PluginContext) {
  const cache = new LRUCache();
  context.pluginScope.set('cache', cache);
}

@OnPluginUnload()
async onUnload(context: PluginContext) {
  const cache = context.pluginScope.get('cache');
  cache?.clear();
}
```

## Best Practices

1. **Always clean up on unload** - Close connections, clear caches, unsubscribe from events
2. **Use plugin scope for singletons** - Don't pollute the shared DI container
3. **Document dependencies** - List required plugins in manifest
4. **Handle configuration errors** - Validate config in onLoad
5. **Use logging** - Log plugin lifecycle events for debugging
