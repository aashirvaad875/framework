# Dynamic Modules Guide

Dynamic modules allow you to configure modules at runtime using the `forRoot()` and `forFeature()` patterns, inspired by NestJS and Angular.

## Concepts

### Static vs Dynamic Modules

**Static Modules:**
```typescript
@Module({ providers: [UserService] })
export class UserModule {}
```
No configuration, same providers always.

**Dynamic Modules:**
```typescript
@Module({ providers: [UserService] })
export class UserModule {
  static forRoot(config: Config): DynamicModule {
    return {
      module: UserModule,
      providers: [{ provide: 'CONFIG', useValue: config }],
    };
  }
}

// Usage
@Module({
  imports: [UserModule.forRoot({ /* config */ })],
})
export class AppModule {}
```

## forRoot Pattern

`forRoot()` creates a singleton module with application-level configuration. Call it once in your root module.

### Database Module Example

```typescript
export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

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
      username: 'admin',
      password: 'secret',
      database: 'myapp',
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}
```

### Configuration Service Example

```typescript
export interface AppConfig {
  port: number;
  environment: 'development' | 'production';
  apiUrl: string;
}

@Module({
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {
  static forRoot(config: AppConfig): DynamicModule {
    return {
      module: ConfigModule,
      providers: [
        { provide: 'APP_CONFIG', useValue: config },
        ConfigService,
        {
          provide: 'LOG_LEVEL',
          useFactory: (config: AppConfig) => {
            return config.environment === 'development' ? 'debug' : 'info';
          },
          deps: ['APP_CONFIG'],
        },
      ],
      exports: [ConfigService, 'LOG_LEVEL'],
    };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      port: 3000,
      environment: process.env.NODE_ENV as any,
      apiUrl: 'https://api.example.com',
    }),
  ],
})
export class AppModule {}
```

## forFeature Pattern

`forFeature()` creates feature-specific configuration that depends on `forRoot()` configuration. Call it in feature modules.

### Authentication Module Example

```typescript
export type AuthStrategy = 'jwt' | 'sessions' | 'oauth2';

export interface AuthOptions {
  strategy: AuthStrategy;
  secret?: string;
  expiresIn?: string;
}

@Module({
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {
  static forRoot(options: AuthOptions): DynamicModule {
    return {
      module: AuthModule,
      providers: [
        { provide: 'AUTH_OPTIONS', useValue: options },
        AuthService,
      ],
      exports: [AuthService],
    };
  }

  static forFeature(scopes: string[]): DynamicModule {
    return {
      module: AuthModule,
      providers: [
        { provide: 'AUTH_SCOPES', useValue: scopes },
        {
          provide: 'ScopeValidator',
          useFactory: (scopes: string[]) => {
            return (required: string[]) => required.every(s => scopes.includes(s));
          },
          deps: ['AUTH_SCOPES'],
        },
      ],
    };
  }
}

// In AppModule
@Module({
  imports: [
    AuthModule.forRoot({
      strategy: 'jwt',
      secret: 'my-secret-key',
      expiresIn: '7d',
    }),
  ],
})
export class AppModule {}

// In feature modules
@Module({
  imports: [AuthModule.forFeature(['read:users', 'write:users'])],
  controllers: [UserController],
})
export class UserModule {}

@Module({
  imports: [AuthModule.forFeature(['read:admin', 'write:admin'])],
  controllers: [AdminController],
})
export class AdminModule {}
```

### Typeorm Module Example

```typescript
export interface TypeOrmModuleOptions {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

@Module({
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class TypeOrmModule {
  static forRoot(options: TypeOrmModuleOptions): DynamicModule {
    return {
      module: TypeOrmModule,
      providers: [
        { provide: 'TYPEORM_OPTIONS', useValue: options },
        DatabaseService,
      ],
      exports: [DatabaseService],
    };
  }

  static forFeature(entities: Function[]): DynamicModule {
    return {
      module: TypeOrmModule,
      providers: [
        { provide: 'ENTITY_REPOSITORIES', useValue: entities },
        {
          provide: 'EntityRepositoryFactory',
          useFactory: (entities: Function[]) => {
            return (entity: Function) => {
              return entities.find(e => e === entity);
            };
          },
          deps: ['ENTITY_REPOSITORIES'],
        },
      ],
    };
  }
}

// Usage
@Module({
  imports: [
    TypeOrmModule.forRoot({
      host: 'localhost',
      port: 5432,
      username: 'admin',
      password: 'password',
      database: 'myapp',
    }),
  ],
})
export class AppModule {}

@Module({
  imports: [TypeOrmModule.forFeature([User, Post, Comment])],
  controllers: [UserController],
})
export class UserModule {}
```

## Advanced Patterns

### Conditional Configuration

```typescript
@Module({ providers: [EmailService] })
export class EmailModule {
  static forRoot(config: EmailConfig): DynamicModule {
    const providers = [
      { provide: 'EMAIL_CONFIG', useValue: config },
    ];

    // Only include real mailer in production
    if (config.environment === 'production') {
      providers.push({
        provide: 'Mailer',
        useFactory: (config: EmailConfig) => {
          return new RealMailer(config);
        },
        deps: ['EMAIL_CONFIG'],
      });
    } else {
      providers.push({
        provide: 'Mailer',
        useValue: new MockMailer(),
      });
    }

    return {
      module: EmailModule,
      providers,
      exports: ['Mailer'],
    };
  }
}
```

### Multi-Tenant Configuration

```typescript
@Module({ providers: [TenantService] })
export class TenantModule {
  static forRoot(tenants: TenantConfig[]): DynamicModule {
    return {
      module: TenantModule,
      providers: [
        { provide: 'TENANTS', useValue: tenants },
        {
          provide: 'TenantFactory',
          useFactory: (tenants: TenantConfig[]) => {
            return (tenantId: string) => {
              return tenants.find(t => t.id === tenantId);
            };
          },
          deps: ['TENANTS'],
        },
        TenantService,
      ],
      exports: ['TenantFactory', TenantService],
    };
  }

  static forFeature(tenantId: string): DynamicModule {
    return {
      module: TenantModule,
      providers: [
        { provide: 'CURRENT_TENANT_ID', useValue: tenantId },
        {
          provide: 'TenantContext',
          useFactory: (tenantId: string, tenantFactory: TenantFactory) => {
            return tenantFactory(tenantId);
          },
          deps: ['CURRENT_TENANT_ID', 'TenantFactory'],
        },
      ],
    };
  }
}

// Usage
@Module({
  imports: [
    TenantModule.forRoot([
      { id: 'tenant-1', name: 'Acme Corp', apiUrl: '...' },
      { id: 'tenant-2', name: 'Tech Inc', apiUrl: '...' },
    ]),
  ],
})
export class AppModule {}

@Module({
  imports: [TenantModule.forFeature('tenant-1')],
  controllers: [UserController],
})
export class UserModule {}
```

### Plugin Architecture

```typescript
export interface PluginConfig {
  name: string;
  enabled: boolean;
  options?: any;
}

@Module({
  providers: [PluginService],
  exports: [PluginService],
})
export class PluginModule {
  static forRoot(plugins: PluginConfig[]): DynamicModule {
    const providers = [
      { provide: 'PLUGINS', useValue: plugins },
      PluginService,
    ];

    // Load enabled plugins
    for (const plugin of plugins.filter(p => p.enabled)) {
      providers.push({
        provide: `PLUGIN_${plugin.name}`,
        useValue: plugin.options || {},
      });
    }

    return {
      module: PluginModule,
      providers,
      exports: ['PLUGINS', PluginService],
    };
  }
}

// Usage
@Module({
  imports: [
    PluginModule.forRoot([
      {
        name: 'analytics',
        enabled: true,
        options: { trackingId: 'UA-123456-1' },
      },
      {
        name: 'sentry',
        enabled: process.env.NODE_ENV === 'production',
        options: { dsn: 'https://...' },
      },
    ]),
  ],
})
export class AppModule {}
```

## Best Practices

### 1. Type Your Configuration

Always use TypeScript interfaces for type safety:

```typescript
// ✓ Good
interface Config {
  host: string;
  port: number;
}

static forRoot(config: Config): DynamicModule { }

// ✗ Avoid
static forRoot(config: any): DynamicModule { }
```

### 2. Validate Configuration

Validate at module creation time:

```typescript
static forRoot(config: Config): DynamicModule {
  // Validate immediately
  if (!config.host) {
    throw new Error('Database host is required');
  }

  return {
    module: DatabaseModule,
    providers: [
      { provide: 'DB_CONFIG', useValue: config },
      DatabaseService,
    ],
  };
}
```

### 3. Export Configuration for Injection

Make configuration available for feature modules:

```typescript
@Module({
  providers: [ConfigService],
})
export class ConfigModule {
  static forRoot(config: AppConfig): DynamicModule {
    return {
      module: ConfigModule,
      providers: [
        { provide: 'APP_CONFIG', useValue: config },
        ConfigService,
      ],
      exports: ['APP_CONFIG', ConfigService],  // Export config!
    };
  }
}
```

### 4. Use Factory Providers for Complex Logic

```typescript
{
  provide: 'Logger',
  useFactory: (config: AppConfig) => {
    const logger = new Logger();
    logger.setLevel(config.logLevel);
    return logger;
  },
  deps: ['APP_CONFIG'],
}
```

### 5. Document Dynamic Options

```typescript
/**
 * Configure the Auth module with JWT strategy
 *
 * @param options - Authentication options
 * @param options.secret - JWT signing secret (required)
 * @param options.expiresIn - Token expiration (default: '7d')
 * @param options.algorithm - Signing algorithm (default: 'HS256')
 */
static forRoot(options: AuthOptions): DynamicModule { }
```

## Debugging

Check what's being registered:

```typescript
const compiler = new ModuleCompiler();
const result = await compiler.compile([AppModule]);

for (const [module, loaded] of result.modules) {
  console.log(`Module: ${module.name}`);
  console.log(`  Providers: ${loaded.providers.size}`);
  console.log(`  Controllers: ${loaded.controllers.length}`);
  console.log(`  Exports: ${loaded.exports.size}`);
}
```

## See Also

- [Module System](./MODULE_SYSTEM.md)
- [Dependency Injection](./DI_SYSTEM.md)
