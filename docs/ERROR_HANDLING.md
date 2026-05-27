# Enterprise Error Handling Guide

The framework provides a comprehensive, production-ready error handling system with HTTP exceptions, global exception filters, structured API responses, and integrated logging.

## Core Features

- **HTTP Exceptions**: Predefined exception classes for common HTTP errors
- **Exception Filters**: Pluggable filter system for custom error handling
- **Structured Responses**: Standardized API error response format
- **Stack Traces**: Development vs. production-safe error details
- **Request Context**: Automatic request logging with trace IDs
- **Custom Exceptions**: Support for domain-specific exceptions
- **Logging Integration**: Full request/response context logging

## Quick Start

### Basic Exception Usage

```typescript
import { NotFoundException, BadRequestException } from '@framework/core';

@Get('/:id')
getUser(@Param('id') id: string) {
  if (!id) {
    throw new BadRequestException('User ID is required');
  }
  
  const user = this.userService.findById(id);
  if (!user) {
    throw new NotFoundException(`User ${id} not found`);
  }
  
  return user;
}
```

### Response Format

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "error": {
    "message": "Validation failed: Email is required",
    "code": "BAD_REQUEST",
    "statusCode": 400
  },
  "path": "/api/users",
  "method": "POST",
  "timestamp": "2026-05-27T04:14:08.391Z",
  "traceId": "1653609248391-a1b2c3d4e"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "123",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

## Built-in Exceptions

### 4xx Client Errors

- **BadRequestException** (400) - Invalid request data
- **UnauthorizedException** (401) - Authentication required
- **PaymentRequiredException** (402) - Payment required
- **ForbiddenException** (403) - Access denied
- **NotFoundException** (404) - Resource not found
- **ConflictException** (409) - Resource conflict
- **GoneException** (410) - Resource permanently deleted
- **PreconditionFailedException** (412) - Precondition failed
- **UnprocessableEntityException** (422) - Cannot process entity
- **TooManyRequestsException** (429) - Rate limit exceeded

### 5xx Server Errors

- **InternalServerErrorException** (500) - Internal server error
- **NotImplementedException** (501) - Not implemented
- **ServiceUnavailableException** (503) - Service unavailable

## Using HttpException

### Basic Usage

```typescript
import { HttpException } from '@framework/core';

throw new HttpException(
  'Custom error message',
  400,
  'CUSTOM_CODE'
);
```

### With Context

```typescript
throw new BadRequestException('Invalid email format', 'INVALID_EMAIL', {
  field: 'email',
  value: userInput.email,
  pattern: 'email@example.com'
});
```

### With Cause

```typescript
try {
  await database.save(user);
} catch (dbError) {
  throw new InternalServerErrorException(
    'Failed to save user',
    'DB_ERROR',
    undefined,
    dbError
  );
}
```

## Exception Filters

### Built-in Filters

#### HttpExceptionFilter
Handles `HttpException` and its subclasses.

```typescript
{
  catch(exception: HttpException, req, res, next) {
    // Returns structured error response
  }
}
```

#### ValidationExceptionFilter
Handles validation errors with detailed field information.

```typescript
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "code": "VALIDATION_ERROR",
    "statusCode": 400,
    "errors": {
      "email": {
        "message": "Invalid email format",
        "type": "email"
      },
      "name": {
        "message": "Name is required",
        "type": "required"
      }
    }
  }
}
```

#### TypeErrorExceptionFilter
Handles TypeError with dev/prod differentiation.

### Custom Exception Filter

Create custom filters for domain-specific exceptions:

```typescript
import { ExceptionFilter } from '@framework/core';

class DatabaseExceptionFilter implements ExceptionFilter {
  catch(exception: DatabaseError, req, res, next) {
    res.status(503).json({
      success: false,
      error: {
        message: 'Database unavailable',
        code: 'DB_ERROR',
        statusCode: 503
      },
      path: req.path,
      timestamp: new Date().toISOString(),
    });
  }

  supports(exception: Error): boolean {
    return exception instanceof DatabaseError;
  }
}

// Register in application
const app = new Application();
globalExceptionHandler.addFilter(new DatabaseExceptionFilter());
```

## Error Response Builder

Build structured error responses programmatically:

```typescript
import { ErrorResponseBuilder } from '@framework/core';

const response = new ErrorResponseBuilder()
  .setMessage('Validation failed')
  .setCode('VALIDATION_ERROR')
  .setStatusCode(400)
  .setPath(req.path)
  .setMethod(req.method)
  .setTraceId(traceId)
  .addDetail({
    field: 'email',
    message: 'Invalid email format',
    type: 'email'
  })
  .addDetail({
    field: 'password',
    message: 'Password must be at least 8 characters',
    type: 'minLength'
  })
  .build();
```

## Development vs. Production

### Development Mode

```json
{
  "success": false,
  "error": {
    "message": "Cannot read properties of undefined (reading 'id')",
    "code": "INTERNAL_SERVER_ERROR",
    "statusCode": 500
  },
  "stack": [
    "TypeError: Cannot read properties of undefined (reading 'id')",
    "at UserController.getUser (/src/controllers/user.controller.ts:18:20)",
    "..."
  ],
  "path": "/api/users/123",
  "timestamp": "2026-05-27T04:14:08.391Z",
  "traceId": "1653609248391-a1b2c3d4e"
}
```

### Production Mode

```json
{
  "success": false,
  "error": {
    "message": "Internal server error",
    "code": "INTERNAL_SERVER_ERROR",
    "statusCode": 500
  },
  "path": "/api/users/123",
  "timestamp": "2026-05-27T04:14:08.391Z",
  "traceId": "1653609248391-a1b2c3d4e"
}
```

## Request Logging

Automatic request context logging includes:

- **Path & Method**: Request route and HTTP method
- **Trace ID**: Unique request identifier
- **User Agent**: Client information
- **IP Address**: Request source
- **Body**: Request payload (with sensitive field redaction)

### Sensitive Field Redaction

The error handler automatically redacts:
- `password`
- `token`
- `secret`
- `apiKey`
- `creditCard`

```typescript
// Logged as:
{
  "email": "john@example.com",
  "password": "***REDACTED***"
}
```

## Global Error Handler Setup

The error handler is registered in application bootstrap:

```typescript
import { Application, globalErrorHandler } from '@framework/core';

const app = new Application();

// Register modules...

// Register custom filters
globalExceptionHandler.addFilter(new CustomExceptionFilter());

// Register global error handler
app.useErrorHandler(errorHandler);

await app.start();
```

## Examples

### Validation Error

```typescript
@Post('/users')
@UsePipe(new JoiValidationPipe(CreateUserSchema))
createUser(@Body() dto: CreateUserDto) {
  // Invalid email → Validation error caught
  // Response: 400 VALIDATION_ERROR with field details
}
```

### Not Found Error

```typescript
@Get('/:id')
async getUser(@Param('id') id: string) {
  const user = await this.userService.findById(id);
  if (!user) {
    throw new NotFoundException(`User ${id} not found`);
    // Response: 404 NOT_FOUND
  }
  return user;
}
```

### Forbidden Access

```typescript
@Get('/admin/stats')
@UseGuard(isAdmin)
getAdminStats() {
  // Non-admin user → Guard blocks
  // Response: 403 FORBIDDEN
}
```

### Rate Limiting

```typescript
@Get('/search')
@UseGuard(rateLimitGuard)
search(@Query('q') q: string) {
  // Too many requests → Rate limit guard blocks
  // Response: 429 TOO_MANY_REQUESTS
}
```

## Type Safety

Use TypeScript types for error handling:

```typescript
import { ErrorResponse, SuccessResponse, isErrorResponse } from '@framework/core';

async function handleApiCall(): Promise<SuccessResponse<User> | ErrorResponse> {
  try {
    const response = await fetch('/api/users/123');
    const data = await response.json();
    
    if (isErrorResponse(data)) {
      console.error(`Error [${data.error.code}]: ${data.error.message}`);
      return data;
    }
    
    return data as SuccessResponse<User>;
  } catch (error) {
    // Handle network errors
  }
}
```

## Custom Domain Exceptions

Create domain-specific exception classes:

```typescript
export class UserAlreadyExistsException extends HttpException {
  constructor(email: string) {
    super(
      `User with email ${email} already exists`,
      409,
      'USER_EXISTS',
      { email }
    );
  }
}

export class InsufficientFundsException extends HttpException {
  constructor(available: number, required: number) {
    super(
      `Insufficient funds: ${available} available, ${required} required`,
      402,
      'INSUFFICIENT_FUNDS',
      { available, required }
    );
  }
}

// Usage
if (emailExists) {
  throw new UserAlreadyExistsException(email);
}
```

## Trace ID Usage

All errors include a unique trace ID for request tracking:

```typescript
// Client receives trace ID in response
{
  "success": false,
  "error": { ... },
  "traceId": "1653609248391-a1b2c3d4e"
}

// Can be logged server-side for correlation
logger.error('Error processing request', error, {
  traceId: '1653609248391-a1b2c3d4e'
});
```

## Best Practices

1. **Use Specific Exceptions** - Choose the most specific exception class for the situation
2. **Add Context** - Include relevant context when throwing exceptions
3. **Log Appropriately** - Server logs include full context, client responses are sanitized
4. **Handle at Boundaries** - Catch and convert external errors to HttpExceptions
5. **Type Check Errors** - Use `instanceof` checks for error handling
6. **Sanitize Sensitive Data** - Never expose passwords, tokens, or API keys in responses
7. **Provide Trace IDs** - Use for debugging and request correlation

---

**Status:** ✅ Enterprise error handling fully implemented and production-ready
