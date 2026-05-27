import type { MicroserviceOptions } from '../types.js';
import { Microservice, createMicroservice } from './microservice.js';
import { getRequestHandlers, getMessageListeners } from './microservice.decorator.js';
import { container } from '../../di/container.js';

export class MicroservicesModule {
  static async register(options: MicroserviceOptions) {
    const microservice = await createMicroservice(options);

    // Scan for decorated handlers in container services
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const services = (container as any)['registry']?.keys() || [];
    for (const service of services) {
      try {
        const instance = container.resolve(service);
        const ctor = instance.constructor;

        // Register request handlers
        const requestHandlers = getRequestHandlers(ctor.prototype);
        for (const handler of requestHandlers) {
          microservice.getRequestHandler().register(handler.handler, handler.fn.bind(instance));
        }

        // Register message listeners
        const messageListeners = getMessageListeners(ctor.prototype);
        for (const listener of messageListeners) {
          await microservice.getMessageConsumer().subscribe(
            {
              topic: listener.topic,
            },
            async (payload, ack) => {
              try {
                await listener.fn.call(instance, payload);
                await ack.ack();
              } catch (error) {
                console.error(`Error in listener for ${listener.topic}:`, error);
                await ack.nack();
              }
            }
          );
        }
      } catch (error) {
        console.warn(`Failed to scan service for decorators:`, error);
      }
    }

    return microservice;
  }
}

export const microservicesModuleProviders = [Microservice];
