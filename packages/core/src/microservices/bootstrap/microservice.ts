import type { TransportOptions, RegistryOptions, MicroserviceOptions } from '../types.js';
import { Transport } from '../transport/transport.interface.js';
import { RabbitMQAdapter } from '../transport/adapters/rabbitmq-adapter.js';
import { KafkaAdapter } from '../transport/adapters/kafka-adapter.js';
import { RedisAdapter } from '../transport/adapters/redis-adapter.js';
import { GRPCAdapter } from '../transport/adapters/grpc-adapter.js';
import { TCPAdapter } from '../transport/adapters/tcp-adapter.js';
import { StaticRegistry } from '../discovery/static-registry.js';
import { DynamicRegistry } from '../discovery/dynamic-registry.js';
import { RequestClient } from '../rpc/request-client.js';
import { RequestHandler } from '../rpc/request-handler.js';
import { MessagePublisher } from '../messaging/message-publisher.js';
import { MessageConsumer } from '../messaging/message-consumer.js';

export class Microservice {
  private transport!: Transport;
  private requestClient!: RequestClient;
  private requestHandler!: RequestHandler;
  private messagePublisher!: MessagePublisher;
  private messageConsumer!: MessageConsumer;

  async initialize(options: MicroserviceOptions): Promise<void> {
    this.transport = this.createTransport(options.transport);
    await this.transport.connect();

    const registry = this.createRegistry(options.registry);

    this.requestClient = new RequestClient(this.transport, registry, options.serviceName);
    this.requestHandler = new RequestHandler(this.transport, options.serviceName);

    this.messagePublisher = new MessagePublisher(this.transport);
    this.messageConsumer = new MessageConsumer(this.transport, options.serviceName);

    const inboxTopic = `${options.serviceName}-inbox`;
    await this.transport.listen(inboxTopic, async envelope => {
      await this.requestHandler.handle(envelope);
    });
  }

  private createTransport(config: TransportOptions): Transport {
    switch (config.transport) {
      case 'rabbitmq':
        return new RabbitMQAdapter(config);
      case 'kafka':
        return new KafkaAdapter(config);
      case 'redis':
        return new RedisAdapter(config);
      case 'grpc':
        return new GRPCAdapter(config);
      case 'tcp':
        return new TCPAdapter(config);
      default:
        throw new Error(`Unknown transport: ${(config as any).transport}`);
    }
  }

  private createRegistry(config: RegistryOptions) {
    switch (config.type) {
      case 'static':
        return new StaticRegistry(config.config || {});
      case 'dynamic':
        return new DynamicRegistry(config.config as any);
      default:
        throw new Error(`Unknown registry type: ${config.type}`);
    }
  }

  getRequestClient(): RequestClient {
    return this.requestClient;
  }

  getRequestHandler(): RequestHandler {
    return this.requestHandler;
  }

  getMessagePublisher(): MessagePublisher {
    return this.messagePublisher;
  }

  getMessageConsumer(): MessageConsumer {
    return this.messageConsumer;
  }

  async shutdown(): Promise<void> {
    this.requestClient.shutdown();
    await this.transport.disconnect();
  }
}

export async function createMicroservice(options: MicroserviceOptions): Promise<Microservice> {
  const microservice = new Microservice();
  await microservice.initialize(options);
  return microservice;
}
