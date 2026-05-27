import { Logger, createLogger } from './logger.js';
import { LoggerOptions } from './types.js';

export interface LoggerModuleOptions {
  name?: string;
  level?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  prettyPrint?: boolean;
  filePath?: string;
  maxSize?: number;
  maxFiles?: number;
}

export function LoggerModule(options: LoggerModuleOptions = {}) {
  const loggerName = options.name || 'app';

  return {
    module: 'LoggerModule',
    providers: [
      {
        provide: Logger,
        useFactory: () => {
          return createLogger(loggerName, {
            level: options.level || (process.env.NODE_ENV !== 'production' ? 'debug' : 'info'),
            prettyPrint: options.prettyPrint ?? process.env.NODE_ENV !== 'production',
            transport: {
              filePath: options.filePath,
              maxSize: options.maxSize || 10485760,
              maxFiles: options.maxFiles || 5,
            },
          });
        },
      },
    ],
    exports: [Logger],
  };
}

export class LoggerModuleBuilder {
  private options: LoggerModuleOptions = {};

  setName(name: string): this {
    this.options.name = name;
    return this;
  }

  setLevel(level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'): this {
    this.options.level = level;
    return this;
  }

  enableFileLogging(
    filePath: string,
    maxSize?: number,
    maxFiles?: number
  ): this {
    this.options.filePath = filePath;
    this.options.maxSize = maxSize;
    this.options.maxFiles = maxFiles;
    return this;
  }

  setPrettyPrint(enabled: boolean): this {
    this.options.prettyPrint = enabled;
    return this;
  }

  build(): any {
    return LoggerModule(this.options);
  }
}
