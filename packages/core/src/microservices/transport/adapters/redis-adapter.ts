// packages/core/src/microservices/transport/adapters/redis-adapter.ts

import { Redis } from 'ioredis';
import type { Transport } from '../transport.interface.js';
import type { MessageEnvelope, TransportOptions } from '../../types.js';
import { MessageEnvelopeSerializer } from '../serializer.js';

export class RedisAdapter implements Transport {
  private redis: Redis | null = null;
  private pubClient: Redis | null = null;
  private subClient: Redis | null = null;
  private serializer = new MessageEnvelopeSerializer();
  private config: TransportOptions;

  constructor(config: TransportOptions) {
    this.config = {
      host: 'localhost',
      port: 6379,
      ...config,
    };
  }

  async connect(): Promise<void> {
    try {
      this.redis = new Redis({
        host: (this.config.host as string) || 'localhost',
        port: (this.config.port as number) || 6379,
        password: this.config.password as string | undefined,
      });

      this.pubClient = new Redis({
        host: (this.config.host as string) || 'localhost',
        port: (this.config.port as number) || 6379,
        password: this.config.password as string | undefined,
      });

      this.subClient = new Redis({
        host: (this.config.host as string) || 'localhost',
        port: (this.config.port as number) || 6379,
        password: this.config.password as string | undefined,
      });

      await this.redis.ping();
    } catch (error) {
      throw new Error(`Failed to connect to Redis: ${error}`);
    }
  }

  async send(envelope: MessageEnvelope): Promise<void> {
    if (!this.redis || !this.pubClient) {
      throw new Error('Redis not initialized');
    }

    const topic = envelope.topic || 'default';
    const message = this.serializer.serializeEnvelope(envelope);

    await this.redis.xadd(
      `stream:${topic}`,
      '*',
      'payload',
      message.toString('base64'),
      'messageId',
      envelope.messageId
    );

    await this.pubClient.publish(topic, message.toString('base64'));
  }

  async listen(
    topic: string,
    handler: (envelope: MessageEnvelope) => Promise<void>
  ): Promise<void> {
    if (!this.subClient) {
      throw new Error('Redis not initialized');
    }

    void this.subClient.subscribe(topic);

    this.subClient.on('message', async (channel, messageStr) => {
      try {
        const buffer = Buffer.from(messageStr, 'base64');
        const envelope = this.serializer.deserializeEnvelope(buffer);
        await handler(envelope);
      } catch (error) {
        console.error('Error processing message:', error);
      }
    });
  }

  async ack(messageId: string): Promise<void> {
    if (this.redis) {
      await this.redis.del(`pending:${messageId}`);
    }
  }

  async nack(messageId: string): Promise<void> {
    if (this.redis) {
      await this.redis.incr(`retry:${messageId}`);
    }
  }

  async health(): Promise<boolean> {
    try {
      return this.redis ? (await this.redis.ping()) === 'PONG' : false;
    } catch {
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.redis) {
      this.redis.disconnect();
    }
    if (this.pubClient) {
      this.pubClient.disconnect();
    }
    if (this.subClient) {
      this.subClient.disconnect();
    }
  }
}

export function createRedisAdapter(config: TransportOptions): RedisAdapter {
  return new RedisAdapter(config);
}
