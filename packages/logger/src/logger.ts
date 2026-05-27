import winston from 'winston';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
        })
      ),
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
    }),
  ],
});

export class Logger {
  private context: string;

  constructor(context: string = 'App') {
    this.context = context;
  }

  debug(message: string, meta?: any): void {
    logger.debug(message, { context: this.context, ...meta });
  }

  info(message: string, meta?: any): void {
    logger.info(message, { context: this.context, ...meta });
  }

  warn(message: string, meta?: any): void {
    logger.warn(message, { context: this.context, ...meta });
  }

  error(message: string, error?: Error | any, meta?: any): void {
    logger.error(message, {
      context: this.context,
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      ...meta,
    });
  }
}
