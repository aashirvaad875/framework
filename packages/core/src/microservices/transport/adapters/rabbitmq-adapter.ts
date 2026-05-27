// packages/core/src/microservices/transport/adapters/rabbitmq-adapter.ts

import amqp, { Channel, Connection } from 'amqplib';
import type { Transport } from '../transport.interface.js';
import type { MessageEnvelope, TransportOptions } from '../../types.js';
import { MessageEnvelopeSerializer } from '../serializer.js';

export class RabbitMQAdapter implements Transport {
  private connection: Connection | null = null;
  private channel: Channel | null = null;
  private serializer = new MessageEnvelopeSerializer();
  private listeners: Map<string, (msg: MessageEnvelope) => Promise<void>> = new Map();
  private config: TransportOptions;

  constructor(config: TransportOptions) {
    this.config = {
      host: 'localhost',
      port: 5672,
      ...config,
    };
  }

  async connect(): Promise<void> {
    try {
      const url = `amqp://${this.config.username || 'guest'}:${this.config.password || 'guest'}@${this.config.host}:${this.config.port}/`;
      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();
    } catch (error) {
      throw new Error(`Failed to connect to RabbitMQ: ${error}`);
    }
  }

  async send(envelope: MessageEnvelope): Promise<void> {
    if (!this.channel) {
      throw new Error('Channel not initialized');
    }

    const topic = envelope.topic || 'default';
    await this.channel.assertExchange(topic, 'topic', { durable: true });

    const message = this.serializer.serializeEnvelope(envelope);
    this.channel.publish(topic, envelope.messageId, message, {
      persistent: true,
      messageId: envelope.messageId,
      headers: {
        'x-retry-count': envelope.retryCount,
      },
    });
  }

  async listen(
    topic: string,
    handler: (envelope: MessageEnvelope) => Promise<void>
  ): Promise<void> {
    if (!this.channel) {
      throw new Error('Channel not initialized');
    }

    this.listeners.set(topic, handler);

    await this.channel.assertExchange(topic, 'topic', { durable: true });
    const queue = await this.channel.assertQueue(`${topic}.queue`, {
      durable: true,
    });
    await this.channel.bindQueue(queue.queue, topic, '#');

    this.channel.consume(
      queue.queue,
      async msg => {
        if (!msg) {
          return;
        }

        try {
          const envelope = this.serializer.deserializeEnvelope(msg.content);
          await handler(envelope);
          this.channel!.ack(msg);
        } catch (error) {
          console.error('Error processing message:', error);
          this.channel!.nack(msg, false, true);
        }
      },
      { noAck: false }
    );
  }

  async ack(_messageId: string): Promise<void> {}

  async nack(_messageId: string): Promise<void> {}

  async health(): Promise<boolean> {
    try {
      return this.connection !== null && this.channel !== null;
    } catch {
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.channel) {
      await this.channel.close();
    }
    if (this.connection) {
      await this.connection.close();
    }
  }
}

export function createRabbitMQAdapter(config: TransportOptions): RabbitMQAdapter {
  return new RabbitMQAdapter(config);
}
