/**
 * Example: Enterprise Error Handling
 *
 * Demonstrates the complete error handling system with:
 * - HTTP exceptions for different error scenarios
 * - Custom exception filters
 * - Structured error responses
 * - Request logging and trace IDs
 * - Development vs. production error details
 */

import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  HttpException,
  ExceptionFilter,
  ErrorResponseBuilder,
} from '@framework/core';

// Custom domain exception
class InsufficientFundsException extends HttpException {
  constructor(available: number, required: number) {
    super(
      `Insufficient funds: ${available} available, ${required} required`,
      402,
      'INSUFFICIENT_FUNDS',
      { available, required }
    );
  }
}

class UserAlreadyExistsException extends HttpException {
  constructor(email: string) {
    super(
      `User with email ${email} already exists`,
      409,
      'USER_EXISTS',
      { email }
    );
  }
}

// Custom exception filter for payment errors
class PaymentExceptionFilter implements ExceptionFilter {
  catch(exception: any, req: any, res: any, next: any): void {
    if (exception instanceof InsufficientFundsException) {
      res.status(402).json({
        success: false,
        error: {
          message: exception.message,
          code: exception.code,
          statusCode: exception.statusCode,
          availableFunds: exception.context?.available,
          requiredFunds: exception.context?.required,
        },
        path: req.path,
        timestamp: new Date().toISOString(),
      });
      return;
    }
    next();
  }

  supports(exception: Error): boolean {
    return exception instanceof InsufficientFundsException;
  }
}

// Example service with error handling
@Injectable()
class PaymentService {
  private readonly users = new Map<string, { balance: number }>();

  constructor() {
    this.users.set('user1', { balance: 1000 });
    this.users.set('user2', { balance: 50 });
  }

  async processPayment(userId: string, amount: number): Promise<void> {
    const user = this.users.get(userId);
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    if (amount <= 0) {
      throw new BadRequestException('Payment amount must be greater than 0', 'INVALID_AMOUNT');
    }

    if (user.balance < amount) {
      throw new InsufficientFundsException(user.balance, amount);
    }

    user.balance -= amount;
  }

  async createUser(email: string, name: string): Promise<any> {
    // Check if user exists (simulated)
    const exists = false; // Would check database
    if (exists) {
      throw new UserAlreadyExistsException(email);
    }

    return { id: 'new-user-id', email, name };
  }

  async getUser(userId: string): Promise<any> {
    const user = this.users.get(userId);
    if (!user) {
      throw new NotFoundException(
        `User ${userId} not found`,
        'USER_NOT_FOUND',
        { requestedUserId: userId }
      );
    }
    return user;
  }
}

// Controller demonstrating error handling
@Controller('/api')
export class ErrorHandlingController {
  constructor(private paymentService: PaymentService) {}

  /**
   * Example: Not Found Error
   * GET /api/users/nonexistent → 404 NOT_FOUND
   */
  @Get('/users/:id')
  async getUser(@Param('id') id: string) {
    const user = await this.paymentService.getUser(id);
    return user;
    // Error response on 404:
    // {
    //   "success": false,
    //   "error": {
    //     "message": "User nonexistent not found",
    //     "code": "USER_NOT_FOUND",
    //     "statusCode": 404,
    //     "context": { "requestedUserId": "nonexistent" }
    //   }
    // }
  }

  /**
   * Example: Bad Request Error
   * POST /api/payments { userId: "user1", amount: -100 } → 400 BAD_REQUEST
   */
  @Post('/payments')
  async processPayment(@Body() body: any) {
    if (!body.userId || !body.amount) {
      throw new BadRequestException('userId and amount are required', 'MISSING_FIELDS', {
        missingFields: {
          userId: !body.userId,
          amount: !body.amount,
        },
      });
    }

    await this.paymentService.processPayment(body.userId, body.amount);

    return { success: true, message: 'Payment processed' };
    // Error responses:
    // 1. Insufficient funds (402):
    // {
    //   "success": false,
    //   "error": {
    //     "message": "Insufficient funds: 50 available, 100 required",
    //     "code": "INSUFFICIENT_FUNDS",
    //     "statusCode": 402,
    //     "context": { "available": 50, "required": 100 }
    //   }
    // }
    //
    // 2. Invalid amount (400):
    // {
    //   "success": false,
    //   "error": {
    //     "message": "Payment amount must be greater than 0",
    //     "code": "INVALID_AMOUNT",
    //     "statusCode": 400
    //   }
    // }
  }

  /**
   * Example: Conflict Error
   * POST /api/users { email: "duplicate@example.com" } → 409 CONFLICT
   */
  @Post('/users')
  async createUser(@Body() body: any) {
    const user = await this.paymentService.createUser(body.email, body.name);
    return user;
    // Error response:
    // {
    //   "success": false,
    //   "error": {
    //     "message": "User with email duplicate@example.com already exists",
    //     "code": "USER_EXISTS",
    //     "statusCode": 409,
    //     "context": { "email": "duplicate@example.com" }
    //   }
    // }
  }

  /**
   * Example: Forbidden Error (with Guard)
   * GET /api/admin/stats (without admin role) → 403 FORBIDDEN
   */
  @Get('/admin/stats')
  getAdminStats() {
    // Would be checked by @UseGuard(isAdmin)
    const isAdmin = false; // Simulated auth check
    if (!isAdmin) {
      throw new ForbiddenException(
        'You do not have permission to access this resource',
        'INSUFFICIENT_PERMISSIONS',
        { requiredRole: 'admin' }
      );
    }

    return { totalUsers: 1000, activeUsers: 750 };
    // Error response:
    // {
    //   "success": false,
    //   "error": {
    //     "message": "You do not have permission to access this resource",
    //     "code": "INSUFFICIENT_PERMISSIONS",
    //     "statusCode": 403,
    //     "context": { "requiredRole": "admin" }
    //   }
    // }
  }

  /**
   * Example: Custom HTTP Exception
   * POST /api/transfer { fromId: "user2", toId: "user1", amount: 100 } → 402
   */
  @Post('/transfer')
  async transfer(@Body() body: any) {
    // Simulate transfer with insufficient funds
    if (body.fromId === 'user2' && body.amount > 50) {
      throw new InsufficientFundsException(50, body.amount);
    }

    return { success: true, message: 'Transfer completed' };
  }

  /**
   * Example: Chained Exceptions
   * GET /api/risky → 500 INTERNAL_SERVER_ERROR with cause
   */
  @Get('/risky')
  async riskyOperation() {
    try {
      // Simulate an external service call
      const result = await this.callExternalService();
      return result;
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to complete risky operation',
        'EXTERNAL_SERVICE_ERROR',
        undefined,
        error as Error
      );
    }
  }

  private async callExternalService(): Promise<any> {
    throw new Error('External service timeout');
  }
}

/**
 * Error Response Examples
 *
 * All errors follow this structure:
 * {
 *   "success": false,
 *   "error": {
 *     "message": "Human-readable message",
 *     "code": "MACHINE_READABLE_CODE",
 *     "statusCode": 400,
 *     "details": [...],  // optional detailed field errors
 *     "context": {...}   // optional contextual data
 *   },
 *   "path": "/api/endpoint",
 *   "method": "POST",
 *   "timestamp": "2026-05-27T04:14:08.391Z",
 *   "traceId": "1653609248391-a1b2c3d4e"
 * }
 *
 * Development mode includes:
 *   - Full error.message (not generic "Internal server error")
 *   - Stack trace as array of strings
 *   - Full request context in logs
 *
 * Production mode hides:
 *   - Actual error details (generic messages)
 *   - Stack traces
 *   - Request body/headers in logs
 *   - Only sensitive trace IDs shown for debugging
 */

export { ErrorHandlingController, PaymentService, PaymentExceptionFilter };
