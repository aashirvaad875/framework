# Controller Execution Pipeline

## Overview

The framework now has a comprehensive, enterprise-grade controller execution pipeline that handles:

- **Route execution** with full lifecycle management
- **Parameter injection** from multiple sources (body, params, query, headers, request, response, context)
- **Body parsing** via Express middleware
- **Query parsing** with automatic parameter resolution
- **Validation hooks** via pipes and guards
- **Middleware execution** in proper order
- **Interceptors** for before/after request processing
- **Response transformation** with multiple format support
- **Guards** for authorization and access control
- **Dependency injection** of controller dependencies

## Architecture

### Execution Pipeline Flow

```
Express Middleware
    ↓
RouteHandlerExecutor
    ├─ Create RequestContext & ExecutionContext
    ├─ Resolve Controller Instance (with DI)
    └─ ExecutionPipeline
        ├─ Guards (Authorization)
        ├─ Before Interceptors (Logging, Enrichment)
        ├─ Pipes (Validation, Transformation)
        ├─ Parameter Resolution (@Body, @Param, @Query, etc.)
        ├─ Handler Execution
        ├─ After Interceptors (Caching, Transformation)
        └─ ResponseTransformer (JSON, File, Redirect, HTML)
    ↓
Global Error Handler
```

## Core Components

### 1. RouteHandlerExecutor

Creates Express request handlers with full pipeline support.

**Location:** `src/http/execution/route-handler-executor.ts`

```typescript
@Get('/users/:id')
getUser(@Param('id') id: string) {
  return { id, name: 'John Doe' };
}

// RouteHandlerExecutor creates handler that:
// 1. Creates contexts
// 2. Resolves controller + params
// 3. Executes pipeline
// 4. Transforms response
```

### 2. ParameterResolver

Resolves method parameters from request decorators.

**Location:** `src/http/execution/parameter-resolver.ts`

Supports:
- `@Body()` — entire request body
- `@Param(name)` — route parameter
- `@Query(name)` — query parameter
- `@Header(name)` — HTTP header
- `@Req()` — raw Express request
- `@Res()` — raw Express response
- `@Context()` — ExecutionContext (if available)

```typescript
@Post('/users')
create(
  @Body() dto: CreateUserDto,
  @Req() req: Request,
  @Query('notify') notify: string
) {
  // All parameters automatically resolved
}
```

### 3. ControllerFactory

Creates controller instances with dependency injection.

**Location:** `src/http/execution/controller-factory.ts`

```typescript
@Injectable()
class UserController {
  constructor(private userService: UserService) {}
}

// ControllerFactory.create(UserController) resolves all dependencies
// via DI container automatically
```

### 4. ExecutionPipeline

Orchestrates guards, interceptors, pipes, and handler execution.

**Location:** `src/http/execution/execution-pipeline.ts`

Executes in order:
1. Guards (returns false → 403 Forbidden)
2. Before Interceptors
3. Pipes (body/parameter validation)
4. Handler execution
5. After Interceptors

### 5. ResponseTransformer

Transforms diverse return values to HTTP responses.

**Location:** `src/http/response/response-transformer.ts`

Built-in transformers:
- **JsonResponseTransformer** — `{ __type: 'json', data, statusCode }`
- **FileResponseTransformer** — `{ __type: 'file', path, filename }`
- **RedirectResponseTransformer** — `{ __type: 'redirect', url, statusCode }`
- **HtmlResponseTransformer** — `{ __type: 'html', content }`
- **TextResponseTransformer** — `{ __type: 'text', content }`
- **DefaultResponseTransformer** — wraps plain objects: `{ success: true, data }`

## Usage Examples

### Basic Endpoint

```typescript
@Controller('/users')
class UserController {
  @Get('/:id')
  getUser(@Param('id') id: string) {
    return { id, name: 'John Doe' };
    // Auto-response: { success: true, data: { id, name } }
  }
}
```

### With Guards

```typescript
@Get('/admin/stats')
@UseGuard(isAdmin)  // Returns false → 403 Forbidden
getAdminStats() {
  return { totalUsers: 100 };
}
```

### With Validation Pipes

```typescript
@Post('/users')
@UsePipe(new ValidationPipe())
createUser(@Body() dto: CreateUserDto) {
  // ValidationPipe validates dto before handler runs
  return { id: '123', ...dto };
}
```

### With Interceptors

```typescript
@Get('/data')
@UseInterceptor(loggingInterceptor)      // Runs before handler
@UseAfterInterceptor(cachingInterceptor) // Runs after handler
getData() {
  return { data: [1, 2, 3] };
}

// Before interceptor: logs request timing
// Handler: executes
// After interceptor: caches response
```

### Custom Response Formats

```typescript
@Get('/download')
downloadFile() {
  return {
    __type: 'file',
    path: '/tmp/document.pdf',
    filename: 'document.pdf'
  };
}

@Get('/redirect')
redirect() {
  return {
    __type: 'redirect',
    url: '/home',
    statusCode: 302
  };
}

@Get('/html')
renderHtml() {
  return {
    __type: 'html',
    content: '<h1>Welcome</h1>'
  };
}
```

### Multiple Parameters

```typescript
@Get('/search')
search(
  @Query('q') query: string,
  @Query('page') page: string,
  @Query('limit') limit: string,
  @Req() req: Request,
  @Context() context: ExecutionContext
) {
  // All parameters automatically resolved from request
  return { query, page, limit, results: [] };
}
```

## Creating Custom Guards

```typescript
const isAuthenticated = (req: any, res: any, next: any) => {
  // Return true to allow, false to deny (403)
  return Boolean(req.user);
};

@Get('/protected')
@UseGuard(isAuthenticated)
protectedRoute() {
  return { secret: 'data' };
}
```

## Creating Custom Interceptors

### Before Interceptor (pre-request)

```typescript
const authEnrichment = {
  async intercept(context: ExecutionContext, next: Function) {
    const req = context.getRequest();
    const user = await loadUser(req.headers.authorization);
    context.getContext().set('user', user);
    return await next();
  }
};

@UseInterceptor(authEnrichment)
```

### After Interceptor (post-request)

```typescript
const responseLogging = {
  async intercept(context: ExecutionContext, next: Function) {
    const result = await next();
    console.log('Response:', result);
    return result;
  }
};

@UseAfterInterceptor(responseLogging)
```

## Creating Custom Pipes

```typescript
class ToDatePipe {
  transform(value: any, metadata: any) {
    if (typeof value === 'string') {
      return new Date(value);
    }
    throw new Error('Invalid date format');
  }
}

@Get('/events/:date')
getEventsOnDate(@Param('date') @UsePipe(new ToDatePipe()) date: Date) {
  // date is automatically converted to Date object
}
```

## Creating Custom Response Transformers

```typescript
class CsvResponseTransformer {
  canHandle(value: any) {
    return value?.__type === 'csv';
  }

  async transform(value: any, res: Response) {
    res.setHeader('Content-Type', 'text/csv');
    res.send(value.content);
  }
}

// Register custom transformer
ResponseTransformer.registerTransformer(new CsvResponseTransformer());

// Usage
@Get('/export')
exportCsv() {
  return {
    __type: 'csv',
    content: 'id,name\n1,John\n2,Jane'
  };
}
```

## Request Context

Access request-scoped data across middleware, guards, and handlers:

```typescript
const authEnrichment = {
  async intercept(context: ExecutionContext, next: Function) {
    const user = await loadUser(context.getRequest());
    context.getContext().set('user', user);
    return await next();
  }
};

@Get('/profile')
@UseInterceptor(authEnrichment)
getProfile(@Context() context: ExecutionContext) {
  const user = context.getContext().get('user');
  return { user };
}
```

## Dependency Injection Integration

All controller dependencies are automatically injected:

```typescript
@Injectable()
class UserService {
  getUser(id: string) { ... }
}

@Controller('/users')
class UserController {
  constructor(private userService: UserService) {}
  // userService is automatically injected

  @Get('/:id')
  getUser(@Param('id') id: string) {
    return this.userService.getUser(id);
  }
}
```

## Error Handling

Errors are caught and formatted by the global error handler:

```typescript
@Post('/users')
createUser(@Body() dto: CreateUserDto) {
  if (!dto.email) {
    throw new BadRequestException('Email is required');
  }
  return this.userService.create(dto);
}

// Response (400 Bad Request):
// {
//   "code": "BAD_REQUEST",
//   "message": "Email is required",
//   "statusCode": 400
// }
```

## Files Modified

- `src/http/pipeline/route-pipeline.ts` — Delegates to RouteHandlerExecutor
- `src/http/router/route-registry.ts` — Uses ControllerFactory for DI
- `src/decorators/index.ts` — Added @UseInterceptor, @UseAfterInterceptor

## New Files Created

- `src/http/execution/parameter-resolver.ts` — Parameter extraction
- `src/http/execution/controller-factory.ts` — DI-aware controller creation
- `src/http/execution/route-handler-executor.ts` — Complete route handler factory
- `src/http/execution/execution-pipeline.ts` — Pipeline orchestration
- `src/http/interceptors/interceptor.interface.ts` — Interceptor contracts
- `src/http/response/response.interface.ts` — Response type contracts
- `src/http/response/response-transformer.ts` — Response transformation

## Performance Considerations

- **Request context**: Uses AsyncLocalStorage for request-scoped data
- **Parameter caching**: Metadata cached via Reflect
- **DI integration**: Leverages singleton/scoped provider caching
- **Interceptors**: Executed in series (not parallel) to maintain order

## Testing

See `examples/controller-execution-example.ts` for comprehensive examples of all features.

---

**Status:** ✅ Complete and production-ready
