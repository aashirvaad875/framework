import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { HttpException } from '../core/exceptions/index.js';
import { Logger } from './logger.js';

const logger = new Logger('ErrorHandler');

export const globalErrorHandler: ErrorRequestHandler = (
  error: Error | HttpException,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (error instanceof HttpException) {
    logger.warn(`HTTP Exception: ${error.statusCode} - ${error.message}`, {
      path: req.path,
      method: req.method,
    });

    res.status(error.statusCode).json({
      success: false,
      error: {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
      },
      path: req.path,
      timestamp: new Date().toISOString(),
    });

    return;
  }

  logger.error(
    `Unhandled error: ${error.message}`,
    error,
    { path: req.path, method: req.method }
  );

  res.status(500).json({
    success: false,
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR',
      statusCode: 500,
    },
    path: req.path,
    timestamp: new Date().toISOString(),
  });
};
