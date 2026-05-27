import {
  JOB_HANDLER_METADATA_KEY,
  JOB_EVENT_HANDLER_METADATA_KEY,
  JobOptions,
  JobEvent,
} from './types.js';

export interface JobDecoratorOptions extends JobOptions {
  name?: string;
}

export function Job(options: JobDecoratorOptions = {}) {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const jobName = options.name || String(propertyKey);

    Reflect.defineMetadata(
      JOB_HANDLER_METADATA_KEY,
      {
        name: jobName,
        options: {
          attempts: options.attempts,
          backoff: options.backoff,
          delay: options.delay,
          priority: options.priority,
          timeout: options.timeout,
          removeOnComplete: options.removeOnComplete,
          removeOnFail: options.removeOnFail,
        },
      },
      descriptor.value
    );

    return descriptor;
  };
}

export interface JobEventOptions {
  event: JobEvent;
}

export function OnJobEvent(jobEvent: JobEvent) {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    Reflect.defineMetadata(
      JOB_EVENT_HANDLER_METADATA_KEY,
      {
        event: jobEvent,
      },
      descriptor.value
    );

    return descriptor;
  };
}

export function OnJobProgress() {
  return OnJobEvent('progress');
}

export function OnJobComplete() {
  return OnJobEvent('completed');
}

export function OnJobFailed() {
  return OnJobEvent('failed');
}

export function OnJobRetry() {
  return OnJobEvent('retry');
}

export function OnJobStalled() {
  return OnJobEvent('stalled');
}

export function getJobMetadata(method: Function): any {
  return Reflect.getMetadata(JOB_HANDLER_METADATA_KEY, method);
}

export function getJobEventMetadata(method: Function): any {
  return Reflect.getMetadata(JOB_EVENT_HANDLER_METADATA_KEY, method);
}
