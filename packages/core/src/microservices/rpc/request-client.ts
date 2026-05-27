import type { Transport } from '../transport/transport.interface.js';
import type { ServiceRegistry } from '../discovery/service-registry.interface.js';
import type { RequestOptions } from '../types.js';
import { Message } from '../transport/message.js';
import { CorrelationManager } from './correlation-manager.js';
import {
  ServiceNotFoundException,
  ServiceUnavailableException,
  RequestTimeoutException,
} from '../exceptions.js';

export class RequestClient {
  private correlationManager = new CorrelationManager();

  constructor(
    private transport: Transport,
    private registry: ServiceRegistry,
    private serviceName: string
  ) {}

  async send(options: RequestOptions): Promise<unknown> {
    const { service, handler, payload, timeout = 5000 } = options;

    try {
      const addresses = await this.registry.resolve(service);
      if (!addresses || addresses.length === 0) {
        throw new ServiceNotFoundException(service);
      }

      const replyTo = `${this.serviceName}-inbox`;

      const requestMessage = Message.request(replyTo, {
        handler,
        payload,
      });

      const responsePromise = this.correlationManager.registerRequest(
        requestMessage.messageId,
        timeout
      );

      requestMessage.topic = `${service}.inbox`;
      await this.transport.send(requestMessage);

      const response = await responsePromise;
      return response;
    } catch (error) {
      if (error instanceof ServiceNotFoundException) {
        throw error;
      }
      if (error instanceof Error && error.message.includes('timed out')) {
        throw new RequestTimeoutException(service, timeout);
      }
      throw new ServiceUnavailableException(service, error as Error);
    }
  }

  onReply(messageId: string, response: unknown, error?: Error): void {
    if (error) {
      this.correlationManager.rejectRequest(messageId, error);
    } else {
      this.correlationManager.resolveRequest(messageId, response);
    }
  }

  shutdown(): void {
    this.correlationManager.clear();
  }
}
