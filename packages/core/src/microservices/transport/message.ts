// packages/core/src/microservices/transport/message.ts

import type { MessageEnvelope } from '../types.js';

export class Message implements MessageEnvelope {
  messageId: string;
  topic?: string;
  replyTo?: string;
  inReplyTo?: string;
  payload: unknown;
  headers?: Record<string, string>;
  timestamp: number;
  retryCount: number = 0;

  constructor(data: Partial<MessageEnvelope>) {
    this.messageId = data.messageId || this.generateMessageId();
    this.topic = data.topic;
    this.replyTo = data.replyTo;
    this.inReplyTo = data.inReplyTo;
    this.payload = data.payload;
    this.headers = data.headers || {};
    this.timestamp = data.timestamp || Date.now();
    this.retryCount = data.retryCount || 0;
  }

  private generateMessageId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  static request(replyTo: string, payload: unknown, headers?: Record<string, string>): Message {
    return new Message({
      replyTo,
      payload,
      headers,
    });
  }

  static reply(
    inReplyTo: string,
    replyTo: string,
    payload: unknown,
    headers?: Record<string, string>
  ): Message {
    return new Message({
      inReplyTo,
      replyTo,
      payload,
      headers,
    });
  }

  static event(topic: string, payload: unknown, headers?: Record<string, string>): Message {
    return new Message({
      topic,
      payload,
      headers,
    });
  }

  toJSON(): MessageEnvelope {
    return {
      messageId: this.messageId,
      topic: this.topic,
      replyTo: this.replyTo,
      inReplyTo: this.inReplyTo,
      payload: this.payload,
      headers: this.headers,
      timestamp: this.timestamp,
      retryCount: this.retryCount,
    };
  }
}
