// packages/core/src/microservices/transport/adapters/grpc-adapter.ts

import * as grpc from '@grpc/grpc-js';
import type { Transport } from '../transport.interface.js';
import type { MessageEnvelope, TransportOptions } from '../../types.js';
import { MessageEnvelopeSerializer } from '../serializer.js';

export class GRPCAdapter implements Transport {
  private server: grpc.Server | null = null;
  private serializer = new MessageEnvelopeSerializer();
  private config: TransportOptions;

  constructor(config: TransportOptions) {
    this.config = { host: 'localhost', port: 50051, ...config };
  }

  async connect(): Promise<void> {
    try {
      this.server = new grpc.Server();
      const port = (this.config.port as number) || 50051;

      this.server.bindAsync(
        `${this.config.host}:${port}`,
        grpc.ServerCredentials.createInsecure(),
        err => {
          if (err) {
            throw new Error(`gRPC bind failed: ${err}`);
          }
        }
      );
    } catch (error) {
      throw new Error(`Failed to initialize gRPC: ${error}`);
    }
  }

  async send(envelope: MessageEnvelope): Promise<void> {
    if (!this.server) {
      throw new Error('gRPC server not initialized');
    }
    const message = this.serializer.serializeEnvelope(envelope);
    console.error(`gRPC send to ${envelope.topic}: ${message.toString('base64')}`);
  }

  async listen(
    _topic: string,
    _handler: (envelope: MessageEnvelope) => Promise<void>
  ): Promise<void> {
    if (!this.server) {
      throw new Error('gRPC server not initialized');
    }
  }

  async ack(_messageId: string): Promise<void> {}
  async nack(_messageId: string): Promise<void> {}

  async health(): Promise<boolean> {
    return this.server !== null;
  }

  async disconnect(): Promise<void> {
    if (this.server) {
      this.server.forceShutdown();
    }
  }
}

export function createGRPCAdapter(config: TransportOptions): GRPCAdapter {
  return new GRPCAdapter(config);
}
