import type { RequestHandlerMetadata, MessageListenerMetadata } from '../types.js';

const REQUEST_HANDLER_METADATA_KEY = Symbol('microservices:request-handler');
const MESSAGE_LISTENER_METADATA_KEY = Symbol('microservices:message-listener');

export function RequestHandler(handlerName: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const metadata: RequestHandlerMetadata = {
      handler: handlerName,
      fn: descriptor.value,
    };

    const existing = Reflect.getOwnMetadata(REQUEST_HANDLER_METADATA_KEY, target) || [];
    Reflect.defineMetadata(REQUEST_HANDLER_METADATA_KEY, [...existing, metadata], target);
  };
}

export function MessageListener(topic: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const metadata: MessageListenerMetadata = {
      topic,
      fn: descriptor.value,
    };

    const existing = Reflect.getOwnMetadata(MESSAGE_LISTENER_METADATA_KEY, target) || [];
    Reflect.defineMetadata(MESSAGE_LISTENER_METADATA_KEY, [...existing, metadata], target);
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getRequestHandlers(target: any): RequestHandlerMetadata[] {
  return Reflect.getOwnMetadata(REQUEST_HANDLER_METADATA_KEY, target) || [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getMessageListeners(target: any): MessageListenerMetadata[] {
  return Reflect.getOwnMetadata(MESSAGE_LISTENER_METADATA_KEY, target) || [];
}
