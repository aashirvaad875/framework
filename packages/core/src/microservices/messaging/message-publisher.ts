import type { Transport } from '../transport/transport.interface.js';
import type { PublishOptions } from '../types.js';
import { Message } from '../transport/message.js';
import { MessageDeliveryException } from '../exceptions.js';

export class MessagePublisher {
  constructor(private transport: Transport) {}

  async publish(options: PublishOptions): Promise<string> {
    const { topic, payload, headers } = options;

    try {
      const message = Message.event(topic, payload, headers);
      await this.transport.send(message);
      return message.messageId;
    } catch (error) {
      throw new MessageDeliveryException(topic, error as Error);
    }
  }

  async publishBatch(
    topic: string,
    messages: Array<{ payload: unknown; headers?: Record<string, string> }>
  ): Promise<string[]> {
    const messageIds: string[] = [];

    for (const msg of messages) {
      try {
        const id = await this.publish({
          topic,
          payload: msg.payload,
          headers: msg.headers,
        });
        messageIds.push(id);
      } catch (error) {
        console.error(`Failed to publish message to ${topic}:`, error);
        throw error;
      }
    }

    return messageIds;
  }
}
