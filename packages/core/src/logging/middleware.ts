import { Request, Response, NextFunction } from 'express';
import { Logger } from './logger.js';
import { CorrelationIdGenerator } from './correlation-id.js';
import { requestContext } from './context.js';
import { RequestLogContext } from './types.js';

export function createRequestLoggerMiddleware(logger: Logger) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { correlationId, traceId } = CorrelationIdGenerator.extractFromHeaders(
      req.headers as Record<string, any>
    );

    const requestLogContext: RequestLogContext = {
      correlationId,
      traceId,
      requestId: correlationId,
      method: req.method,
      path: req.path,
      userAgent: req.get('user-agent'),
      ip: req.ip || (req.socket as any).remoteAddress,
    };

    requestContext.set(requestLogContext);

    logger.setContext(requestLogContext);
    logger.info(`${req.method} ${req.path} started`);

    const originalSend = res.send;
    const startTime = Date.now();

    res.send = function (data: any) {
      const duration = Date.now() - startTime;

      logger.info(`${req.method} ${req.path} completed`, {
        statusCode: res.statusCode,
        duration,
        contentLength: data ? Buffer.byteLength(JSON.stringify(data)) : 0,
      });

      res.set(
        CorrelationIdGenerator.getHeaderName('correlation'),
        correlationId
      );
      res.set(CorrelationIdGenerator.getHeaderName('trace'), traceId);

      return originalSend.call(this, data);
    };

    next();
  };
}

export function createErrorLoggerMiddleware(logger: Logger) {
  return (err: Error, req: Request, res: Response, next: NextFunction) => {
    const context = requestContext.get();

    logger.error(`Error in ${req.method} ${req.path}`, err, {
      correlationId: context?.correlationId,
      traceId: context?.traceId,
      statusCode: res.statusCode,
    });

    next(err);
  };
}
