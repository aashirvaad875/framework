// packages/core/src/scheduler/decorators.ts

import 'reflect-metadata';
import { CRON_METADATA_KEY, INTERVAL_METADATA_KEY, TIMEOUT_METADATA_KEY, JobMetadata } from './types.js';

export function Cron(expression: string, options?: Partial<JobMetadata>) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const metadata: JobMetadata = {
      eventType: 'cron',
      timezone: options?.timezone,
      ...options,
    };
    metadata.eventType = expression; // Store the expression
    Reflect.defineMetadata(CRON_METADATA_KEY, { expression, ...metadata }, descriptor.value);
  };
}

export function Interval(delayMs: number, options?: Partial<JobMetadata>) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const metadata: JobMetadata = {
      eventType: 'interval',
      delayMs,
      ...options,
    };
    Reflect.defineMetadata(INTERVAL_METADATA_KEY, metadata, descriptor.value);
  };
}

export function Timeout(delayMs: number, options?: Partial<JobMetadata>) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const metadata: JobMetadata = {
      eventType: 'timeout',
      delayMs,
      ...options,
    };
    Reflect.defineMetadata(TIMEOUT_METADATA_KEY, metadata, descriptor.value);
  };
}

export function getCronMetadata(fn: Function): { expression: string; metadata: JobMetadata } | undefined {
  return Reflect.getOwnMetadata(CRON_METADATA_KEY, fn);
}

export function getIntervalMetadata(fn: Function): JobMetadata | undefined {
  return Reflect.getOwnMetadata(INTERVAL_METADATA_KEY, fn);
}

export function getTimeoutMetadata(fn: Function): JobMetadata | undefined {
  return Reflect.getOwnMetadata(TIMEOUT_METADATA_KEY, fn);
}

export function scanScheduledMethods(target: any): Array<{
  method: string;
  handler: Function;
  type: 'cron' | 'interval' | 'timeout';
  metadata: any;
}> {
  const results: Array<{
    method: string;
    handler: Function;
    type: 'cron' | 'interval' | 'timeout';
    metadata: any;
  }> = [];

  const prototype = target.prototype || target;
  const propertyNames = Object.getOwnPropertyNames(prototype);

  for (const propertyName of propertyNames) {
    if (propertyName === 'constructor') continue;

    const descriptor = Object.getOwnPropertyDescriptor(prototype, propertyName);
    if (!descriptor || typeof descriptor.value !== 'function') continue;

    const handler = descriptor.value as Function;

    const cronMeta = getCronMetadata(handler);
    if (cronMeta) {
      results.push({
        method: propertyName,
        handler,
        type: 'cron',
        metadata: cronMeta,
      });
    }

    const intervalMeta = getIntervalMetadata(handler);
    if (intervalMeta) {
      results.push({
        method: propertyName,
        handler,
        type: 'interval',
        metadata: intervalMeta,
      });
    }

    const timeoutMeta = getTimeoutMetadata(handler);
    if (timeoutMeta) {
      results.push({
        method: propertyName,
        handler,
        type: 'timeout',
        metadata: timeoutMeta,
      });
    }
  }

  return results;
}
