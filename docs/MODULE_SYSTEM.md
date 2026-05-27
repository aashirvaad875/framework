# Enterprise Module System

## Overview

The enterprise module system is the core of application organization in the framework. Modules are classes decorated with `@Module()` that group related controllers, services, and other providers into self-contained units.

## Core Concepts

### Modules

A module is a class decorated with `@Module()` that encapsulates related functionality:

```typescript
import { Module, Controller, Injectable } from '@framework/core';

@Injectable()
class UserService {
  getUsers() { /* ... */ }
}

@Controller('/users')
class UserController {
  constructor(private userService: UserService) {}
}

@Module({
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
```

### Module Configuration

The `@Module()` decorator accepts a configuration object:

```typescript
interface ModuleConfig {
  controllers?: Function[];          // Route handlers
  providers?: Provider[];             // Services, repositories, factories
  imports?: ModuleClass[];            // Modules this module depends on
  exports?: (Function | string)[];   // What this module shares with others
  isGlobal?: boolean;                 // Accessible everywhere
  lazy?: {                            // Defer loading
    strategy: 'eager' | 'route-based' | 'manual';
    routes?: string[];                // For route-based lazy loading
  };
}
```

### Provider Types

Providers can be registered as:

```typescript
// Class provider
@Module({
  providers: [UserService],
})

// Factory provider
@Module({
  providers: [
    { provide: 'USER_SERVICE', useFactory: () => new UserService() },
  ],
})

// Value provider
@Module({
  providers: [
    { provide: 'CONFIG', useValue: { apiUrl: 'http://localhost' } },
  ],
})
```

## Module Relationships

### Imports

Modules can import other modules to access their exported providers:

```typescript
@Module({
  imports: [UserModule, DatabaseModule],
  controllers: [PostController],
  providers: [PostService],
})
export class PostModule {}
```

### Exports

Providers are private by default. Use `exports` to make them accessible:

```typescript
@Module({
  providers: [UserService, UserRepository],
  exports: [UserService],  // Only UserService is accessible
})
export class UserModule {}
```

### Global Modules

Global modules make their providers available to all modules without explicit imports:

```typescript
@Module({
  providers: [LoggerService, ConfigService],
  isGlobal: true,
})
export class CoreModule {}
```

## Dynamic Modules

Dynamic modules support runtime configuration via `forRoot()` and `forFeature()` patterns:

### forRoot Pattern

Use for application-level, singleton configuration:

```typescript
@Module({
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {
  static forRoot(config: DatabaseConfig): DynamicModule {
    return {
      module: DatabaseModule,
      providers: [
        { provide: 'DB_CONFIG', useValue: config },
        DatabaseService,
      ],
      exports: [DatabaseService],
    };
  }
}

// Usage in AppModule
@Module({
  imports: [
    DatabaseModule.forRoot({
      host: 'localhost',
      port: 5432,
      database: 'myapp',
    }),
  ],
})
export class AppModule {}
```

### forFeature Pattern

Use for feature-specific configuration:

```typescript
export class AuthModule {
  static forFeature(options: AuthOptions): DynamicModule {
    return {
      module: AuthModule,
      providers: [
        { provide: 'AUTH_OPTIONS', useValue: options },
        AuthService,
      ],
      exports: [AuthService],
    };
  }
}

// Usage in FeatureModule
@Module({
  imports: [AuthModule.forFeature({ strategy: 'jwt' })],
})
export class AdminModule {}
```

## Lazy Loading

Load modules only when needed:

### Route-Based Lazy Loading

```typescript
@Module({
  controllers: [AdminController],
  lazy: {
    strategy: 'route-based',
    routes: ['/admin/*', '/dashboard/*'],
  },
})
export class AdminModule {}
```

The `AdminModule` loads automatically when routes matching `/admin/*` or `/dashboard/*` are accessed.

### Manual Lazy Loading

```typescript
@Module({
  lazy: { strategy: 'manual' },
})
export class HeavyModule {}

// Load manually when needed
await app.lazyLoadModule(HeavyModule);
```

## Lifecycle Hooks

Modules can implement lifecycle hooks:

```typescript
import { OnModuleInit, OnApplicationBootstrap, OnApplicationShutdown } from '@framework/core';

@Module({
  providers: [DatabaseService],
})
export class DatabaseModule implements OnModuleInit, OnApplicationBootstrap, OnApplicationShutdown {
  constructor(private db: DatabaseService) {}

  async onModuleInit() {
    // Called when module is loaded
    await this.db.connect();
  }

  async onApplicationBootstrap() {
    // Called when app has finished bootstrapping
    await this.db.initializeSchema();
  }

  async onApplicationShutdown(signal?: string) {
    // Called during application shutdown
    await this.db.close();
  }
}
```

## Module Compilation & Validation

The module system validates your configuration at startup:

```typescript
const compiler = new ModuleCompiler();
const result = await compiler.compile([AppModule]);

if (!result.success) {
  console.error('Compilation errors:', result.errors);
  process.exit(1);
}
```

### Validation Checks

- ✓ All modules have `@Module()` decorator
- ✓ Exports reference actual providers
- ✓ Imported modules exist
- ✓ No circular dependencies
- ✓ Duplicate provider warnings

## Dependency Graph & Circular Dependencies

The system detects circular module dependencies at compile time:

```typescript
// This will fail at compile time:
@Module({ imports: [ModuleB] })
class ModuleA {}

@Module({ imports: [ModuleA] })
class ModuleB {}

// Error: Circular module dependency detected: ModuleA → ModuleB → ModuleA
```

To fix circular dependencies, extract shared providers to a third module:

```typescript
// Extract common functionality
@Module({
  providers: [SharedService],
  exports: [SharedService],
})
class SharedModule {}

@Module({ imports: [SharedModule] })
class ModuleA {}

@Module({ imports: [SharedModule] })
class ModuleB {}
```

## Provider Access Control

The system enforces module boundaries. Providers are only accessible if:

1. They're in your module
2. They're exported by an imported module
3. They're in a global module

```typescript
@Module({
  providers: [PublicService, PrivateService],
  exports: [PublicService],  // Only PublicService is accessible
})
class MyModule {}

@Module({
  imports: [MyModule],
})
class OtherModule {
  // ✓ Can access PublicService
  // ✗ Cannot access PrivateService
}
```

## Best Practices

### 1. Organize by Feature

Group related functionality into feature modules:

```typescript
// users/user.module.ts
@Module({
  controllers: [UserController],
  providers: [UserService, UserRepository],
  exports: [UserService],
})
export class UserModule {}
```

### 2. Use Explicit Exports

Always explicitly export what other modules need:

```typescript
@Module({
  providers: [AuthService, AuthRepository, TokenService],
  exports: [AuthService],  // Only the service, not internal details
})
export class AuthModule {}
```

### 3. Keep Global Modules Minimal

Avoid overusing global modules. Use them sparingly for truly cross-cutting concerns:

```typescript
// ✓ Good: Used by everything
@Module({ providers: [LoggerService], isGlobal: true })
export class CoreModule {}

// ✗ Avoid: Creates hidden dependencies
@Module({ providers: [UserService], isGlobal: true })
export class UserModule {}
```

### 4. Use forRoot/forFeature for Configuration

Separate application-level and feature-level configuration:

```typescript
// In AppModule
@Module({
  imports: [
    DatabaseModule.forRoot({ host: 'localhost' }),
    AuthModule.forFeature({ method: 'jwt' }),
  ],
})
export class AppModule {}
```

### 5. Extract Shared Logic

When modules need the same providers, extract to a shared module:

```typescript
@Module({
  providers: [CommonValidator, CommonUtils],
  exports: [CommonValidator, CommonUtils],
})
export class CommonModule {}

@Module({ imports: [CommonModule] })
export class UserModule {}

@Module({ imports: [CommonModule] })
export class PostModule {}
```

## API Reference

### ModuleCompiler

```typescript
const compiler = new ModuleCompiler();
const result = await compiler.compile([AppModule, ...otherModules]);

// result.success: boolean
// result.errors: ValidationError[]
// result.warnings: ValidationError[]
// result.modules: Map<ModuleClass, LoadedModule>
// result.loadOrder: ModuleClass[]
```

### DependencyGraph

```typescript
const graph = new DependencyGraph();
graph.build(modules);

graph.detectCycles();           // ModuleClass[][]
graph.getLoadOrder();           // ModuleClass[]
graph.isProviderAccessible(token, fromModule);  // boolean
```

### ModuleRegistry

```typescript
const registry = new ModuleRegistry();

registry.register(loadedModule);
registry.get(moduleClass);
registry.has(moduleClass);
registry.isProviderAccessible(provider, fromModule);
```

## Troubleshooting

### "Circular module dependency detected"

Extract shared providers to a separate module:

```typescript
// ✓ Fixed
@Module({ providers: [SharedService], exports: [SharedService] })
class SharedModule {}

@Module({ imports: [SharedModule] })
class ModuleA {}

@Module({ imports: [SharedModule] })
class ModuleB {}
```

### "Provider X is not exported"

Import the module that exports the provider:

```typescript
// ✗ Error: UserService not exported
@Module({ providers: [UserService] })
class UserModule {}

// ✓ Fixed
@Module({
  providers: [UserService],
  exports: [UserService],  // Export it!
})
class UserModule {}

@Module({ imports: [UserModule] })
class AppModule {}
```

### "Module X not found"

Ensure all imported modules are available:

```typescript
// ✗ Error: NonExistentModule not found
@Module({ imports: [NonExistentModule] })
class AppModule {}

// ✓ Fixed: Create the module first
@Module({})
class NonExistentModule {}

@Module({ imports: [NonExistentModule] })
class AppModule {}
```

## See Also

- [Dependency Injection](./DI_SYSTEM.md)
- [HTTP Engine](./HTTP_ENGINE.md)
- [Architecture Guide](./ARCHITECTURE.md)
