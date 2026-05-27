import 'reflect-metadata';

const EVENT_LISTENER_METADATA_KEY = Symbol('event-listener:metadata');
const ON_EVENT_METADATA_KEY = Symbol('on-event:metadata');

export interface EventListenerMetadata {
  eventType: string;
  options?: {
    async?: boolean;
    priority?: number;
  };
}

export interface OnEventMetadata {
  eventType: string;
}

export function EventListener(eventType: string, options?: { async?: boolean; priority?: number }) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const metadata: EventListenerMetadata = { eventType, options };
    Reflect.defineMetadata(EVENT_LISTENER_METADATA_KEY, metadata, descriptor.value);
  };
}

export function OnEvent(eventType: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const metadata: OnEventMetadata = { eventType };
    Reflect.defineMetadata(ON_EVENT_METADATA_KEY, metadata, descriptor.value);
  };
}

export function getEventListenerMetadata(fn: Function): EventListenerMetadata | undefined {
  return Reflect.getOwnMetadata(EVENT_LISTENER_METADATA_KEY, fn);
}

export function getOnEventMetadata(fn: Function): OnEventMetadata | undefined {
  return Reflect.getOwnMetadata(ON_EVENT_METADATA_KEY, fn);
}

export function scanEventListeners(target: any): Array<{
  method: string;
  handler: Function;
  eventType: string;
  options?: any;
}> {
  const results: Array<{ method: string; handler: Function; eventType: string; options?: any }> = [];

  const prototype = target.prototype || target;
  const propertyNames = Object.getOwnPropertyNames(prototype);

  for (const propertyName of propertyNames) {
    if (propertyName === 'constructor') continue;

    const descriptor = Object.getOwnPropertyDescriptor(prototype, propertyName);
    if (!descriptor || typeof descriptor.value !== 'function') continue;

    const handler = descriptor.value as Function;

    const listenerMeta = getEventListenerMetadata(handler);
    if (listenerMeta) {
      results.push({
        method: propertyName,
        handler,
        eventType: listenerMeta.eventType,
        options: listenerMeta.options,
      });
    }

    const onEventMeta = getOnEventMetadata(handler);
    if (onEventMeta) {
      results.push({
        method: propertyName,
        handler,
        eventType: onEventMeta.eventType,
      });
    }
  }

  return results;
}
