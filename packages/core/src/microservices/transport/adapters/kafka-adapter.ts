// packages/core/src/microservices/transport/adapters/kafka-adapter.ts

import { Kafka, logLevel, Consumer, Producer } from 'kafkajs';
import type { Transport } from '../transport.interface.js';
import type { MessageEnvelope, TransportOptions } from '../../types.js';
import { MessageEnvelopeSerializer } from '../serializer.js';

export class KafkaAdapter implements Transport {
  private kafka: Kafka | null = null;
  private producer: Producer | null = null;
  private consumer: Consumer | null = null;
  private serializer = new MessageEnvelopeSerializer();
  private config: TransportOptions;

  constructor(config: TransportOptions) {
    this.config = { host: 'localhost:9092', ...config };
  }

  async connect(): Promise<void> {
    try {
      const brokers = Array.isArray(this.config.host)
        ? (this.config.host as string[])
        : [(this.config.host as string) || 'localhost:9092'];

      this.kafka = new Kafka({
        clientId: 'microservice-client',
        brokers,
        logLevel: logLevel.ERROR,
      });

      this.producer = this.kafka.producer();
      await this.producer.connect();
    } catch (error) {
      throw new Error(`Failed to connect to Kafka: ${error}`);
    }
  }

  async send(envelope: MessageEnvelope): Promise<void> {
    if (!this.producer) {
      throw new Error('Producer not initialized');
    }

    const topic = envelope.topic || 'default';
    const message = this.serializer.serializeEnvelope(envelope);

    await this.producer.send({
      topic,
      messages: [
        {
          key: envelope.messageId,
          value: message,
          headers: {
            messageId: envelope.messageId,
            retryCount: String(envelope.retryCount),
          },
        },
      ],
    });
  }

  async listen(
    topic: string,
    handler: (envelope: MessageEnvelope) => Promise<void>
  ): Promise<void> {
    if (!this.kafka) {
      throw new Error('Kafka not initialized');
    }

    this.consumer = this.kafka.consumer({ groupId: `consumer-${topic}` });
    await this.consumer.connect();
    await this.consumer.subscribe({ topic });

    await this.consumer.run({
      eachMessage: async ({ message }) => {
        try {
          const envelope = this.serializer.deserializeEnvelope(message.value!);
          await handler(envelope);
        } catch (error) {
          console.error('Error processing message:', error);
          throw error;
        }
      },
    });
  }

  async ack(_messageId: string): Promise<void> {}
  async nack(_messageId: string): Promise<void> {}

  async health(): Promise<boolean> {
    return this.producer !== null && this.consumer !== null;
  }

  async disconnect(): Promise<void> {
    if (this.producer) {
      await this.producer.disconnect();
    }
    if (this.consumer) {
      await this.consumer.disconnect();
    }
  }
}

export function createKafkaAdapter(config: TransportOptions): KafkaAdapter {
  return new KafkaAdapter(config);
}
