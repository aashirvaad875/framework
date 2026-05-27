# Enterprise Logging System

The framework provides a comprehensive logging system with request tracing, correlation IDs, structured JSON output, and production-ready formatting.

## Features

- **Structured Logging** - JSON format for production, pretty-printed for development
- **Request Tracing** - Automatic correlation IDs and trace IDs
- **Context Tracking** - AsyncLocalStorage for request-scoped context
- **Performance Timing** - Built-in timer utilities
- **Multiple Log Levels** - trace, debug, info, warn, error, fatal
- **Request Correlation** - Track requests across services
- **Async-aware** - Proper context propagation in async operations

## Quick Start

```typescript
import { createLogger } from '@framework/core';

const logger = createLogger('my-service');

logger.info('Application started');
logger.debug('Debug data', { userId: 123 });
logger.error('Error message', new Error('Something failed'));
```

## Log Levels

| Level | Usage |
|-------|-------|
| trace | Very detailed diagnostic information |
| debug | General debugging information |
| info | General informational messages |
| warn | Warning messages (recoverable) |
| error | Error messages (significant problems) |
| fatal | Fatal errors (application may stop) |

## Request Logging

The framework automatically logs all HTTP requests with correlation IDs:

```
[INFO] GET /users/123 started
[INFO] GET /users/123 completed {statusCode: 200, duration: 45ms}
```

## Correlation IDs

Correlation IDs flow through all related logs:

```typescript
import { CorrelationIdGenerator, requestContext } from '@framework/core';

const { correlationId, traceId } = CorrelationIdGenerator.extractFromHeaders({
  'x-correlation-id': 'abc-123',
});

requestContext.set({
  correlationId,
  traceId,
  userId: 'user-456',
});

// All subsequent logs include these IDs
logger.info('Operation completed');
```

## Request Middleware

Register logging middleware in main.ts:

```typescript
import { createRequestLoggerMiddleware, createLogger } from '@framework/core';

const logger = createLogger('api');

app.use(createRequestLoggerMiddleware(logger));
```

## Context Management

```typescript
import { requestContext } from '@framework/core';

// Set context in middleware
requestContext.set({
  correlationId: 'abc-123',
  userId: 'user-456',
  traceId: 'trace-789',
});

// Context automatically includes in all logs
logger.info('Operation completed');
// Includes: correlationId, userId, traceId

// Update context
requestContext.update({ userId: 'user-999' });

// Get context
const context = requestContext.get();
const userId = requestContext.getId('correlation');
```

## Performance Timing

```typescript
// Synchronous timing
const timer = logger.startTimer();
doSomething();
const duration = timer(); // milliseconds

// Async timing
await logger.measureAsync('Database query', async () => {
  return db.query('SELECT * FROM users');
});
```

## Logger Context

Set context for a logger instance:

```typescript
const userLogger = createLogger('user-service');

userLogger.setContext({ userId: '123' });
userLogger.info('User operation'); // Includes userId

// Reset context
userLogger.setContext({});
```

## Module Integration

```typescript
import { LoggerModule, LoggerModuleBuilder } from '@framework/core';

const loggerModule = LoggerModule({
  name: 'my-app',
  level: 'info',
  filePath: './logs/app.log',
  prettyPrint: process.env.NODE_ENV !== 'production',
});

// Or with builder
const builtModule = new LoggerModuleBuilder()
  .setName('my-app')
  .setLevel('debug')
  .enableFileLogging('./logs/app.log', 10485760, 5)
  .setPrettyPrint(true)
  .build();
```

## Output Formats

### Development (Pretty Print)

```
[INFO] GET /users/123 started
[INFO] GET /users/123 completed {statusCode: 200, duration: 45ms}
[ERROR] Error in POST /users [error details]
```

### Production (JSON)

```json
{"level":"info","message":"GET /users/123 started","correlationId":"abc-123"}
{"level":"info","message":"GET /users/123 completed","statusCode":200,"duration":45}
{"level":"error","message":"Error in POST /users","err":{},"correlationId":"abc-123"}
```

## Injecting Logger

Use @InjectLogger to inject logger into services:

```typescript
import { InjectLogger } from '@framework/core';

class UserService {
  constructor(@InjectLogger('user-service') private logger: Logger) {}

  async getUser(id: string) {
    this.logger.info('Fetching user', { userId: id });
    return await database.user.findById(id);
  }
}
```

## Environment Variables

- `LOG_LEVEL` - Minimum log level (default: info in prod, debug in dev)
- `NODE_ENV` - Controls output format (pretty in development, JSON in production)

## Security Considerations

**Sensitive fields are NOT automatically redacted.** Be cautious with:
- Passwords
- Tokens
- API keys
- Personal information
- Credit card numbers

Use context filtering or custom serializers for sensitive data:

```typescript
logger.info('User login', {
  userId: user.id,
  // Don't log password!
});
```

## Best Practices

1. **Use correlation IDs** - Track requests across services
2. **Consistent naming** - Use standardized log message patterns
3. **Appropriate levels** - Don't log everything at INFO
4. **Add context** - Include relevant data with logs
5. **Performance aware** - Avoid expensive operations in hot paths
6. **Monitor logs** - Set up alerts for ERROR and FATAL
