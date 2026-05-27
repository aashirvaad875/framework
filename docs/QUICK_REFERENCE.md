# Framework Quick Reference

## Core Imports

```typescript
import {
  // Application
  Controller, Get, Post, Put, Delete, Patch,
  createApplication, Module,
  
  // Dependency Injection
  Injectable, Inject, InjectionToken, forwardRef,
  
  // HTTP
  Body, Param, Query, Req, Res,
  UseGuard, UsePipe, UseInterceptor,
  Interceptor, PipeTransform, ExecutionContext,
  
  // Authentication
  Auth, Roles, Permissions, RequireAllPermissions, Public,
  JwtService, PasswordService, JwtAuthGuard, RoleGuard,
  
  // Validation
  Cacheable, CacheInvalidate, CacheClear,
  JoiValidationPipe, ZodValidationPipe,
  
  // Caching
  CacheManager, CacheInterceptor, CacheUtils,
  MemoryCacheAdapter, RedisCacheAdapter,
  CacheModule, CacheModuleBuilder,
  
  // Logging
  Logger, createLogger,
  createRequestLoggerMiddleware, createErrorLoggerMiddleware,
  CorrelationIdGenerator, requestContext,
  LoggerModule, LoggerModuleBuilder,
  
  // Database
  Repository, UnitOfWork,
  TypeOrmRepository, PrismaRepository, DrizzleRepository,
  DatabaseConnection, Transaction,
  
  // Errors
  HttpException, BadRequestException, NotFoundException,
  ForbiddenException, UnauthorizedException,
  ConflictException, InternalServerErrorException,
  ExceptionFilter, ExceptionResponse,
  
  // Module System
  ModuleCompiler, ModuleValidator,
  DependencyGraph, ModuleRegistry,
  ModuleLoader, LazyModuleLoader,
  DynamicModuleBuilder,
} from '@framework/core';
```

## Application Setup

```typescript
// 1. Create application
const app = createApplication();

// 2. Register logger
const logger = createLogger('api');
app.use(createRequestLoggerMiddleware(logger));

// 3. Register cache
const cache = CacheManager.createRedis({ ttl: 3600 });
await cache.connect();

// 4. Register modules
app.use(
  Module({
    imports: [UserModule, PostModule],
    providers: [AppService],
  })
);

// 5. Global error handling
app.registerGlobalFilter(new HttpExceptionFilter());

// 6. Start server
app.listen(3000, () => {
  logger.info('Server started on port 3000');
});
```

## Decorators Cheat Sheet

### Controller & Routes
```typescript
@Controller('/users')
class UserController {
  @Get()                    // GET /users
  @Get('/:id')             // GET /users/:id
  @Post()                  // POST /users
  @Put('/:id')             // PUT /users/:id
  @Delete('/:id')          // DELETE /users/:id
  @Patch('/:id')           // PATCH /users/:id
}
```

### Parameter Decorators
```typescript
@Get('/:id')
async get(
  @Param('id') id: string,        // URL parameter
  @Query('sort') sort: string,    // Query parameter
  @Body() dto: CreateUserDto,     // Request body
  @Req() req: Request,            // Express request
  @Res() res: Response,           // Express response
) {}
```

### Authentication & Authorization
```typescript
@Get('/profile')
@Auth()                           // Requires authentication
@Roles('admin', 'moderator')     // Requires roles
@Permissions('READ_USER')         // Requires permission
@RequireAllPermissions(...)       // Requires ALL permissions
@Public()                         // Public (no auth)
async getProfile() {}
```

### Validation & Transformation
```typescript
@Post()
@UsePipe(new JoiValidationPipe(schema))    // Joi validation
@UsePipe(new ZodValidationPipe(schema))    // Zod validation
async create(@Body() dto: CreateUserDto) {}
```

### Caching & Interception
```typescript
@Get()
@UseInterceptor(loggingInterceptor)
@UseGuard(AuthGuard)
async findAll() {}

// Method-level caching
@Cacheable({ ttl: 3600 })
async getUser(id: string) {}

@CacheInvalidate({ key: (id) => `user:${id}` })
async updateUser(id: string, data: any) {}

@CacheClear()
async deleteAllUsers() {}
```

## Common Patterns

### Service with Caching

```typescript
@Injectable()
class UserService {
  constructor(private userRepo: UserRepository) {}

  @Cacheable({ ttl: 3600 })
  async getUser(id: string) {
    return this.userRepo.findById(id);
  }

  @CacheInvalidate({ key: (id) => `user:${id}` })
  async updateUser(id: string, data: any) {
    return this.userRepo.update(id, data);
  }
}
```

### Controller with Authentication

```typescript
@Controller('/users')
export class UserController {
  constructor(private userService: UserService) {}

  @Get()
  @Auth()
  async findAll() {
    return this.userService.getUsers();
  }

  @Get('/:id')
  @Auth()
  @Roles('admin', 'user')
  async findOne(@Param('id') id: string) {
    return this.userService.getUser(id);
  }

  @Post()
  @Auth()
  @Roles('admin')
  @UsePipe(new JoiValidationPipe(CreateUserSchema))
  async create(@Body() dto: CreateUserDto) {
    return this.userService.create(dto);
  }

  @Delete('/:id')
  @Auth()
  @Roles('admin')
  async remove(@Param('id') id: string) {
    return this.userService.delete(id);
  }
}
```

### Module with Lazy Loading

```typescript
const userModule = Module({
  controllers: [UserController],
  providers: [UserService, UserRepository],
  imports: [DatabaseModule],
  exports: [UserService],
});

// Lazy load
const lazyLoader = new LazyModuleLoader();
await lazyLoader.load(userModule, '/users/*');
```

### Logging in Service

```typescript
@Injectable()
class UserService {
  constructor(
    @InjectLogger('user-service') private logger: Logger,
    private userRepo: UserRepository,
  ) {}

  async getUser(id: string) {
    this.logger.info('Fetching user', { userId: id });
    
    const user = await this.logger.measureAsync(
      'User query',
      () => this.userRepo.findById(id)
    );
    
    return user;
  }
}
```

### Transaction Management

```typescript
async updateUserAndPosts(userId: string, data: any) {
  const unitOfWork = new UnitOfWork(
    (entity) => di.resolve(entity),
    () => dbConnection.transaction()
  );

  await unitOfWork.begin();
  try {
    const userRepo = unitOfWork.getRepositoryFor(User);
    const postRepo = unitOfWork.getRepositoryFor(Post);

    unitOfWork.track(user, 'modified');
    unitOfWork.track(post, 'deleted');

    await unitOfWork.commit();
  } catch (error) {
    await unitOfWork.rollback();
    throw error;
  }
}
```

## Environment Variables

```bash
# Authentication
JWT_SECRET=your-secret-key
JWT_EXPIRATION=3600
REFRESH_TOKEN_EXPIRATION=604800

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/db

# Cache
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=optional

# Logging
LOG_LEVEL=info
NODE_ENV=production

# Server
PORT=3000
```

## Error Handling

```typescript
// Throw exceptions
throw new BadRequestException('Invalid input');
throw new NotFoundException('User not found');
throw new ForbiddenException('Access denied');
throw new UnauthorizedException('Invalid token');
throw new InternalServerErrorException('Database error');

// Custom exception filter
@Injectable()
class CustomExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: any) {
    const response = host.getResponse();
    const status = exception.getStatus?.() || 500;
    
    response.status(status).json({
      statusCode: status,
      message: exception.message,
      timestamp: new Date(),
    });
  }
}

app.registerGlobalFilter(new CustomExceptionFilter());
```

## Testing

```typescript
// Mock cache
const cache = CacheManager.createMemory();

// Mock logger
const logger = createLogger('test');

// Mock database
const userRepo = new MemoryRepository();

// Test service
const service = new UserService(userRepo);
const user = await service.getUser('123');
expect(user).toBeDefined();
```

## Performance Optimization

```typescript
// 1. Cache frequently accessed data
@Cacheable({ ttl: 86400 })  // 24 hours
async getPublicConfig() {}

// 2. Use batch operations
const users = await cache.rememberMany(
  ['user:1', 'user:2', 'user:3'],
  async (missing) => fetchBatch(missing)
);

// 3. Lazy load modules
await lazyLoader.load(HeavyModule, '/heavy/*');

// 4. Use transactions efficiently
const unitOfWork = new UnitOfWork(...);
// Batch multiple operations

// 5. Monitor performance
const stats = await cache.getStats();
console.log(`Cache hit rate: ${stats.hits / (stats.hits + stats.misses)}`);
```

## Type Safety

```typescript
// Injection tokens for non-class dependencies
export const CONFIG = new InjectionToken<ConfigService>('config');
export const DB_HOST = new InjectionToken<string>('db.host');

// Register
di.registerValue(CONFIG, configService);
di.registerValue(DB_HOST, 'localhost');

// Inject
class MyService {
  constructor(
    @Inject(CONFIG) private config: ConfigService,
    @Inject(DB_HOST) private dbHost: string,
  ) {}
}

// Forward refs for circular dependencies
class A {
  constructor(@Inject(forwardRef(() => B)) private b: B) {}
}

class B {
  constructor(@Inject(forwardRef(() => A)) private a: A) {}
}
```

## Common Issues & Solutions

### Cache not working
```typescript
// Make sure to connect Redis
const cache = CacheManager.createRedis();
await cache.connect();
```

### Logger context not propagating
```typescript
// Use requestContext in async operations
await requestContext.run(context, async () => {
  // Logger will have context here
});
```

### Circular dependencies
```typescript
// Use forwardRef
@Inject(forwardRef(() => ServiceB))
private serviceB: ServiceB;
```

### Authentication failing
```typescript
// Ensure auth middleware is registered before routes
app.use(createRequestLoggerMiddleware(logger));
// ... then register modules
```
