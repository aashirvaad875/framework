import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { HttpException } from './exceptions/index.js';
import { ExceptionFilter, HttpExceptionFilter, ValidationExceptionFilter, TypeErrorExceptionFilter } from './exceptions/exception-filter.js';
import { ErrorResponseBuilder } from './exceptions/exception-response.js';
import { Logger } from '@framework/logger';

const logger = new Logger('ErrorHandler');

class GlobalExceptionHandler {
  private filters: ExceptionFilter[] = [
    new HttpExceptionFilter(),
    new ValidationExceptionFilter(),
    new TypeErrorExceptionFilter(),
  ];

  addFilter(filter: ExceptionFilter): void {
    this.filters.unshift(filter);
  }

  handle(error: Error, req: Request, res: Response, next: NextFunction): void {
    const isDev = process.env.NODE_ENV !== 'production';
    const traceId = this.generateTraceId();

    try {
      const filter = this.filters.find((f) => f.supports(error));

      if (filter) {
        this.logError(error, req, traceId, isDev);
        filter.catch(error, req, res, next);
        return;
      }

      this.handleUnknownError(error, req, res, traceId, isDev);
    } catch (handlerError) {
      logger.error('Error in exception handler', handlerError as Error);
      this.sendFallbackError(res, req, traceId);
    }
  }

  private handleUnknownError(error: Error, req: Request, res: Response, traceId: string, isDev: boolean): void {
    const builder = new ErrorResponseBuilder()
      .setMessage(isDev ? error.message : 'Internal server error')
      .setCode('INTERNAL_SERVER_ERROR')
      .setStatusCode(500)
      .setPath(req.path)
      .setMethod(req.method)
      .setTraceId(traceId);

    if (isDev && error.stack) {
      builder.setStack(error.stack.split('\n').map((line) => line.trim()));
    }

    this.logError(error, req, traceId, isDev);
    res.status(500).json(builder.build());
  }

  private sendFallbackError(res: Response, req: Request, traceId: string): void {
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: {
          message: 'Internal server error',
          code: 'INTERNAL_SERVER_ERROR',
          statusCode: 500,
        },
        path: req.path,
        timestamp: new Date().toISOString(),
        traceId,
      });
    }
  }

  private logError(error: Error, req: Request, traceId: string, isDev: boolean): void {
    const logContext = {
      path: req.path,
      method: req.method,
      traceId,
      userAgent: req.get('user-agent'),
      ip: req.ip,
      ...(isDev && {
        url: req.originalUrl,
        headers: req.headers,
        query: req.query,
        body: this.sanitizeBody(req.body),
      }),
    };

    if (error instanceof HttpException) {
      const level = error.statusCode >= 500 ? 'error' : 'warn';
      logger[level as keyof Logger](`${error.statusCode} - ${error.message}`, logContext);
    } else {
      logger.error(`Unhandled ${error.constructor.name}`, error, logContext);
    }
  }

  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') return undefined;

    const sensitive = ['password', 'token', 'secret', 'apiKey', 'creditCard'];
    const sanitized = { ...body };

    for (const key in sanitized) {
      if (sensitive.some((s) => key.toLowerCase().includes(s.toLowerCase()))) {
        sanitized[key] = '***REDACTED***';
      }
    }

    return sanitized;
  }

  private generateTraceId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}

export const globalExceptionHandler = new GlobalExceptionHandler();

export const errorHandler: ErrorRequestHandler = (error: Error, req: Request, res: Response, next: NextFunction) => {
  globalExceptionHandler.handle(error, req, res, next);
};

export const globalErrorHandler: ErrorRequestHandler = errorHandler;

export { GlobalExceptionHandler };
