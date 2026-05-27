export abstract class HttpException extends Error {
  public readonly isHttpException: boolean = true;
  public readonly timestamp: Date = new Date();
  public context?: Record<string, any>;
  public cause?: Error;

  constructor(
    public message: string,
    public statusCode: number,
    public code?: string,
    context?: Record<string, any>,
    cause?: Error
  ) {
    super(message);
    Object.setPrototypeOf(this, HttpException.prototype);
    this.context = context;
    this.cause = cause;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      timestamp: this.timestamp.toISOString(),
      context: this.context,
    };
  }
}

export class BadRequestException extends HttpException {
  constructor(message: string, code?: string) {
    super(message, 400, code || 'BAD_REQUEST');
  }
}

export class UnauthorizedException extends HttpException {
  constructor(message: string, code?: string) {
    super(message, 401, code || 'UNAUTHORIZED');
  }
}

export class ForbiddenException extends HttpException {
  constructor(message: string, code?: string) {
    super(message, 403, code || 'FORBIDDEN');
  }
}

export class NotFoundException extends HttpException {
  constructor(message: string, code?: string) {
    super(message, 404, code || 'NOT_FOUND');
  }
}

export class ConflictException extends HttpException {
  constructor(message: string, code?: string) {
    super(message, 409, code || 'CONFLICT');
  }
}

export class UnprocessableEntityException extends HttpException {
  constructor(message: string, code?: string) {
    super(message, 422, code || 'UNPROCESSABLE_ENTITY');
  }
}

export class InternalServerErrorException extends HttpException {
  constructor(message: string, code?: string) {
    super(message, 500, code || 'INTERNAL_SERVER_ERROR');
  }
}

export class ServiceUnavailableException extends HttpException {
  constructor(message: string, code?: string) {
    super(message, 503, code || 'SERVICE_UNAVAILABLE');
  }
}

export class TooManyRequestsException extends HttpException {
  constructor(message: string, code?: string) {
    super(message, 429, code || 'TOO_MANY_REQUESTS');
  }
}

export class GoneException extends HttpException {
  constructor(message: string, code?: string) {
    super(message, 410, code || 'GONE');
  }
}

export class NotImplementedException extends HttpException {
  constructor(message: string, code?: string) {
    super(message, 501, code || 'NOT_IMPLEMENTED');
  }
}

export class PaymentRequiredException extends HttpException {
  constructor(message: string, code?: string) {
    super(message, 402, code || 'PAYMENT_REQUIRED');
  }
}

export class PreconditionFailedException extends HttpException {
  constructor(message: string, code?: string) {
    super(message, 412, code || 'PRECONDITION_FAILED');
  }
}
