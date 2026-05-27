// packages/core/src/microservices/transport/serializer.ts

import type { MessageEnvelope } from '../types.js';

export interface Serializer {
  serialize(data: unknown): Buffer;
  deserialize(data: Buffer): unknown;
  contentType: string;
}

export class JsonSerializer implements Serializer {
  contentType = 'application/json';

  serialize(data: unknown): Buffer {
    return Buffer.from(JSON.stringify(data), 'utf-8');
  }

  deserialize(data: Buffer): unknown {
    return JSON.parse(data.toString('utf-8'));
  }
}

export class MessageEnvelopeSerializer {
  constructor(private serializer: Serializer = new JsonSerializer()) {}

  serializeEnvelope(envelope: MessageEnvelope): Buffer {
    const data = {
      ...envelope,
      payload: this.serializer.serialize(envelope.payload),
    };
    return Buffer.from(JSON.stringify(data), 'utf-8');
  }

  deserializeEnvelope(data: Buffer): MessageEnvelope {
    const parsed = JSON.parse(data.toString('utf-8'));
    return {
      ...parsed,
      payload: this.serializer.deserialize(Buffer.from(parsed.payload, 'base64')),
    };
  }

  setContentType(_contentType: string): void {
    // For future extensibility (MessagePack, Protobuf, etc.)
  }
}
