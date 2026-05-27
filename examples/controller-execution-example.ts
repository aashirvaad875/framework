/**
 * Example: Controller Execution Pipeline
 *
 * This demonstrates the enhanced controller execution pipeline with:
 * - Parameter injection and validation
 * - Guards for authorization
 * - Before/After interceptors
 * - Response transformation
 * - Middleware execution
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuard,
  UsePipe,
  UseInterceptor,
  UseAfterInterceptor,
  Injectable,
} from '@framework/core';

// Example: Guard for authorization
const isAdmin = (req: any, res: any, next: any) => {
  // Check if user is admin
  return req.user?.role === 'admin';
};

// Example: Before interceptor for logging
const loggingInterceptor = {
  async intercept(context: any, next: any) {
    const startTime = Date.now();
    const result = await next();
    const duration = Date.now() - startTime;
    console.log(`Request took ${duration}ms`);
    return result;
  },
};

// Example: After interceptor for response caching
const cachingInterceptor = {
  async intercept(context: any, next: any) {
    const result = await next();
    // Cache the response for GET requests
    if (context.getRequest().method === 'GET') {
      context.getContext().set('cached', true);
    }
    return result;
  },
};

// Example: Validation pipe
class ValidationPipe {
  transform(value: any, metadata: any) {
    if (!value || typeof value !== 'object') {
      throw new Error('Invalid body');
    }
    return value;
  }
}

// Example: User service (with DI)
@Injectable()
class UserService {
  getUser(id: string) {
    return { id, name: 'John Doe', role: 'admin' };
  }

  createUser(data: any) {
    return { id: '123', ...data };
  }
}

// Example: Controller with full pipeline
@Controller('/users')
class UserController {
  constructor(private userService: UserService) {}

  /**
   * Simple GET endpoint
   * Pipeline: Guard → Before Interceptor → Handler → After Interceptor → Response Transform
   */
  @Get('/:id')
  @UseInterceptor(loggingInterceptor)
  @UseAfterInterceptor(cachingInterceptor)
  getUser(@Param('id') id: string) {
    return this.userService.getUser(id);
    // Response auto-wrapped: { success: true, data: { id, name, role } }
  }

  /**
   * Guarded endpoint - only admins can access
   * If guard returns false, request is denied with 403 Forbidden
   */
  @Get('/admin/stats')
  @UseGuard(isAdmin)
  getAdminStats() {
    return { totalUsers: 100, activeUsers: 45 };
  }

  /**
   * POST with body validation
   * Pipeline: Guard → Pipe (validation) → Parameters → Handler → Response Transform
   */
  @Post('/')
  @UsePipe(new ValidationPipe())
  @UseInterceptor(loggingInterceptor)
  createUser(@Body() createUserDto: any) {
    return this.userService.createUser(createUserDto);
  }

  /**
   * Endpoint with multiple parameters
   * Shows parameter injection from different sources
   */
  @Get('/search')
  searchUsers(
    @Query('q') query: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
  ) {
    return {
      query,
      page: parseInt(page || '1'),
      limit: parseInt(limit || '10'),
      results: [],
    };
  }

  /**
   * Custom response format using response transformer
   */
  @Get('/:id/profile')
  getUserProfile(@Param('id') id: string) {
    // Return file response - will be handled by FileResponseTransformer
    return {
      __type: 'file',
      path: `/tmp/user-${id}-profile.pdf`,
      filename: `profile-${id}.pdf`,
    };
  }

  /**
   * Redirect response
   */
  @Get('/:id/dashboard')
  redirectToDashboard(@Param('id') id: string) {
    return {
      __type: 'redirect',
      url: `/users/${id}/profile`,
      statusCode: 302,
    };
  }

  /**
   * Custom HTML response
   */
  @Get('/:id/bio')
  getUserBio(@Param('id') id: string) {
    return {
      __type: 'html',
      content: `<h1>User ${id}</h1><p>Bio content here...</p>`,
      statusCode: 200,
    };
  }
}

/**
 * Pipeline Execution Flow for: POST /users
 *
 * 1. Express Middleware
 *    - Body parser extracts JSON
 *    - Express middleware chain executes
 *
 * 2. Route Handler Created by RouteHandlerExecutor
 *    - Creates RequestContext and ExecutionContext
 *    - Gets controller instance from DI
 *
 * 3. Guard Execution
 *    - @UseGuard checks authorization
 *    - If returns false → 403 Forbidden
 *
 * 4. Before Interceptor (loggingInterceptor)
 *    - Logs request start time
 *    - Enriches context
 *
 * 5. Pipe Execution (@UsePipe)
 *    - ValidationPipe validates request body
 *    - Transforms body if needed
 *
 * 6. Parameter Resolution
 *    - @Body decorator extracts body
 *    - @Param, @Query extract from request
 *    - All parameters resolved into method arguments
 *
 * 7. Handler Execution
 *    - UserController.createUser() runs
 *    - Dependencies injected (UserService)
 *    - Returns { id, name, email, ... }
 *
 * 8. After Interceptor (cachingInterceptor)
 *    - Stores response in cache
 *    - Returns response
 *
 * 9. Response Transformer
 *    - Detects response type
 *    - FileResponseTransformer → sends file
 *    - RedirectResponseTransformer → 302 redirect
 *    - DefaultResponseTransformer → { success: true, data }
 *
 * 10. Express Error Handler
 *     - Catches any exceptions
 *     - Formats error response
 */

export { UserController, UserService, ValidationPipe };
