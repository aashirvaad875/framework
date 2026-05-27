import { Logger, createLogger } from './logger.js';

const LOGGER_METADATA_KEY = Symbol('logger:metadata');

export function InjectLogger(name?: string) {
  return function (target: any, propertyKey: string | symbol | undefined, paramIndex: number) {
    if (propertyKey === undefined) {
      const existingMetadata = Reflect.getOwnMetadata(LOGGER_METADATA_KEY, target) || {};
      existingMetadata[paramIndex] = { name };
      Reflect.defineMetadata(LOGGER_METADATA_KEY, existingMetadata, target);
    }
  };
}

export function getLoggerMetadata(target: Function): Record<number, { name?: string }> {
  return Reflect.getOwnMetadata(LOGGER_METADATA_KEY, target) || {};
}
