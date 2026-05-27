import type { Request, Response, NextFunction } from 'express';
import { HttpException } from './index.js';

export interface ExceptionFilter {
  catch(exception: Error | HttpException, req: Request, res: Response, next: NextFunction): void | Promise<void>;
  supports(exception: Error): boolean;
}

export abstract class BaseExceptionFilter implements ExceptionFilter {
  abstract catch(exception: Error, req: Request, res: Response, next: NextFunction): void | Promise<void>;

  supports(exception: Error): boolean {
    return true;
  }
}

export class HttpExceptionFilter extends BaseExceptionFilter {
  catch(exception: HttpException, req: Request, res: Response, next: NextFunction): void {
    const response = {
      success: false,
      error: {
        message: exception.message,
        code: exception.code,
        statusCode: exception.statusCode,
      },
      ...(exception.context && { context: exception.context }),
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString(),
    };

    res.status(exception.statusCode).json(response);
  }

  supports(exception: Error): boolean {
    return exception instanceof HttpException;
  }
}

export class ValidationExceptionFilter extends BaseExceptionFilter {
  catch(exception: Error, req: Request, res: Response, next: NextFunction): void {
    const errors = this.parseValidationErrors(exception);

    res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        statusCode: 400,
        errors,
      },
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString(),
    });
  }

  private parseValidationErrors(error: Error): Record<string, any> {
    if ((error as any).details && Array.isArray((error as any).details)) {
      return (error as any).details.reduce(
        (acc: any, detail: any) => {
          const path = detail.path?.join('.') || detail.key || 'unknown';
          acc[path] = {
            message: detail.message,
            type: detail.type,
          };
          return acc;
        },
        {}
      );
    }

    return { general: error.message };
  }

  supports(exception: Error): boolean {
    return (
      exception instanceof ValidationError ||
      (exception as any).isValidationError === true
    );
  }
}

export class TypeErrorExceptionFilter extends BaseExceptionFilter {
  catch(exception: Error, req: Request, res: Response, next: NextFunction): void {
    const isDev = process.env.NODE_ENV !== 'production';

    res.status(400).json({
      success: false,
      error: {
        message: isDev ? exception.message : 'Invalid request data',
        code: 'TYPE_ERROR',
        statusCode: 400,
      },
      ...(isDev && { stack: exception.stack?.split('\n') }),
      path: req.path,
      timestamp: new Date().toISOString(),
    });
  }

  supports(exception: Error): boolean {
    return exception instanceof TypeError;
  }
}

export class ValidationError extends Error {
  isValidationError = true;

  constructor(
    message: string,
    public details?: Array<{
      key: string;
      message: string;
      type?: string;
      path?: string[];
    }>
  ) {
    super(message);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}
