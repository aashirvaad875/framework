import { LogLevel, LogEntry, LoggerOptions, LogContext } from './types.js';
import { requestContext } from './context.js';
import { createLoggerInstance } from './transport.js';

export class Logger {
  private pinoInstance: any;
  private context: LogContext = {};

  constructor(
    name: string,
    private options: LoggerOptions = {
      level: 'info',
      prettyPrint: process.env.NODE_ENV !== 'production',
    }
  ) {
    this.pinoInstance = createLoggerInstance({
      ...this.options,
      name,
    });
  }

  setContext(context: Partial<LogContext>): this {
    this.context = { ...this.context, ...context };
    return this;
  }

  getContext(): LogContext {
    return {
      ...this.context,
      ...requestContext.get(),
    };
  }

  trace(message: string, data?: any): void {
    this.log('trace', message, data);
  }

  debug(message: string, data?: any): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  error(message: string, error?: Error | any, data?: any): void {
    const errorData = error instanceof Error ? { err: error } : error || {};
    this.pinoInstance.error(
      { ...this.getContext(), ...data, ...errorData },
      message
    );
  }

  fatal(message: string, error?: Error | any, data?: any): void {
    const errorData = error instanceof Error ? { err: error } : error || {};
    this.pinoInstance.fatal(
      { ...this.getContext(), ...data, ...errorData },
      message
    );
  }

  private log(level: LogLevel, message: string, data?: any): void {
    this.pinoInstance[level](
      { ...this.getContext(), ...data },
      message
    );
  }

  startTimer(): () => number {
    const start = Date.now();
    return () => Date.now() - start;
  }

  async measureAsync<T>(
    message: string,
    fn: () => Promise<T>,
    level: LogLevel = 'info'
  ): Promise<T> {
    const timer = this.startTimer();
    return fn()
      .then((result) => {
        const duration = timer();
        this.log(level, `${message} [${duration}ms]`, { duration });
        return result;
      })
      .catch((error) => {
        const duration = timer();
        this.error(`${message} failed [${duration}ms]`, error, { duration });
        throw error;
      });
  }
}

export function createLogger(name: string, options?: Partial<LoggerOptions>): Logger {
  return new Logger(name, {
    level: (process.env.LOG_LEVEL as LogLevel) || 'info',
    prettyPrint: process.env.NODE_ENV !== 'production',
    ...options,
  });
}
