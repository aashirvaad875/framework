export abstract class HttpException extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public code?: string
  ) {
    super(message);
    Object.setPrototypeOf(this, HttpException.prototype);
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
