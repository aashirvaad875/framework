import { LoggerOptions } from './types.js';

export function createLoggerInstance(options: LoggerOptions): any {
  // For now, return a console-based logger
  // This can be replaced with Pino when dependencies are installed

  return {
    level: options.level,
    name: options.name || 'app',
    trace: (data: any, msg: string) => {
      if (options.prettyPrint) {
        console.log(`[TRACE] ${msg}`, data);
      } else {
        console.log(JSON.stringify({ level: 'trace', message: msg, ...data }));
      }
    },
    debug: (data: any, msg: string) => {
      if (options.prettyPrint) {
        console.log(`[DEBUG] ${msg}`, data);
      } else {
        console.log(JSON.stringify({ level: 'debug', message: msg, ...data }));
      }
    },
    info: (data: any, msg: string) => {
      if (options.prettyPrint) {
        console.log(`[INFO] ${msg}`, data);
      } else {
        console.log(JSON.stringify({ level: 'info', message: msg, ...data }));
      }
    },
    warn: (data: any, msg: string) => {
      if (options.prettyPrint) {
        console.warn(`[WARN] ${msg}`, data);
      } else {
        console.warn(JSON.stringify({ level: 'warn', message: msg, ...data }));
      }
    },
    error: (data: any, msg: string) => {
      if (options.prettyPrint) {
        console.error(`[ERROR] ${msg}`, data);
      } else {
        console.error(JSON.stringify({ level: 'error', message: msg, ...data }));
      }
    },
    fatal: (data: any, msg: string) => {
      if (options.prettyPrint) {
        console.error(`[FATAL] ${msg}`, data);
      } else {
        console.error(JSON.stringify({ level: 'fatal', message: msg, ...data }));
      }
    },
  };
}
