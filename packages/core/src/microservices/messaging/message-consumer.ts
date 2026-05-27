import type { Transport } from '../transport/transport.interface.js';
import type { MessageEnvelope, SubscribeOptions } from '../types.js';

export interface MessageAcknowledgment {
  ack(): Promise<void>;
  nack(): Promise<void>;
  messageId: string;
}

export type MessageHandler = (payload: unknown, ack: MessageAcknowledgment) => Promise<void>;

export interface ConsumerMetadata {
  topic: string;
  handler: MessageHandler;
  concurrency: number;
  consumerGroup?: string;
}

export class MessageConsumer {
  private consumers: Map<string, ConsumerMetadata> = new Map();
  private activeHandlers: Map<string, Promise<void>> = new Map();
  private maxConcurrency: number = 10;

  constructor(
    private transport: Transport,
    private serviceName: string
  ) {}

  async subscribe(options: SubscribeOptions, handler: MessageHandler): Promise<void> {
    const { topic, consumerGroup, concurrency = 1 } = options;
    const consumerId = `${topic}:${consumerGroup || 'default'}`;

    this.consumers.set(consumerId, {
      topic,
      handler,
      concurrency,
      consumerGroup,
    });

    await this.transport.listen(topic, async envelope => {
      await this.handleMessage(envelope, handler);
    });
  }

  private async handleMessage(envelope: MessageEnvelope, handler: MessageHandler): Promise<void> {
    const { messageId, payload } = envelope;

    const ack: MessageAcknowledgment = {
      messageId,
      ack: async () => {
        await this.transport.ack(messageId);
        this.activeHandlers.delete(messageId);
      },
      nack: async () => {
        await this.transport.nack(messageId);
        this.activeHandlers.delete(messageId);
      },
    };

    try {
      while (this.activeHandlers.size >= this.maxConcurrency) {
        await Promise.race(this.activeHandlers.values());
      }

      const handlerPromise = handler(payload, ack);
      this.activeHandlers.set(messageId, handlerPromise);
      await handlerPromise;
    } catch (error) {
      console.error(`Error handling message ${messageId}:`, error);
      await ack.nack();
    }
  }

  getSubscriptions(): string[] {
    return Array.from(this.consumers.keys());
  }
}
