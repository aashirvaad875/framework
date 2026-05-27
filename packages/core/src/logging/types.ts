export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogContext {
  correlationId?: string;
  requestId?: string;
  userId?: string;
  traceId?: string;
  timestamp?: Date;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: Error;
  data?: any;
}

export interface LoggerOptions {
  level: LogLevel;
  prettyPrint: boolean;
  name?: string;
  transport?: {
    filePath?: string;
    maxSize?: number;
    maxFiles?: number;
  };
}

export interface RequestLogContext extends LogContext {
  method: string;
  path: string;
  statusCode?: number;
  userAgent?: string;
  ip?: string;
}

export const LOG_LEVEL_ORDER: Record<LogLevel, number> = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
  fatal: 5,
};
