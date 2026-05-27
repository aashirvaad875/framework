// packages/core/src/microservices/transport/adapters/tcp-adapter.ts

import { createServer, Socket, Server } from 'net';
import type { Transport } from '../transport.interface.js';
import type { MessageEnvelope, TransportOptions } from '../../types.js';
import { MessageEnvelopeSerializer } from '../serializer.js';

export class TCPAdapter implements Transport {
  private server: Server | null = null;
  private connections: Map<string, Socket> = new Map();
  private serializer = new MessageEnvelopeSerializer();
  private config: TransportOptions;
  private listeners: Map<string, (msg: MessageEnvelope) => Promise<void>> = new Map();

  constructor(config: TransportOptions) {
    this.config = { host: 'localhost', port: 9000, ...config };
  }

  async connect(): Promise<void> {
    try {
      this.server = createServer(socket => {
        const id = `${socket.remoteAddress}:${socket.remotePort}`;
        this.connections.set(id, socket);

        socket.on('data', async data => {
          try {
            if (data.length < 4) {
              return;
            }
            const length = data.readUInt32BE(0);
            const payload = data.slice(4);

            if (payload.length === length) {
              const envelope = this.serializer.deserializeEnvelope(payload);
              const handler = this.listeners.get(envelope.topic || 'default');
              if (handler) {
                await handler(envelope);
              }
            }
          } catch (error) {
            console.error('Error processing TCP message:', error);
          }
        });

        socket.on('end', () => {
          this.connections.delete(id);
        });

        socket.on('error', err => {
          console.error(`TCP socket error on ${id}:`, err);
          this.connections.delete(id);
        });
      });

      const port = (this.config.port as number) || 9000;
      await new Promise<void>((resolve, reject) => {
        this.server!.listen(port, (this.config.host as string) || 'localhost', () => {
          resolve();
        });
        this.server!.on('error', reject);
      });
    } catch (error) {
      throw new Error(`Failed to start TCP server: ${error}`);
    }
  }

  async send(envelope: MessageEnvelope): Promise<void> {
    if (!this.server) {
      throw new Error('TCP server not initialized');
    }
    const payload = this.serializer.serializeEnvelope(envelope);
    const lengthBuffer = Buffer.allocUnsafe(4);
    lengthBuffer.writeUInt32BE(payload.length, 0);
    const frame = Buffer.concat([lengthBuffer, payload]);

    for (const socket of this.connections.values()) {
      socket.write(frame);
    }
  }

  async listen(
    topic: string,
    handler: (envelope: MessageEnvelope) => Promise<void>
  ): Promise<void> {
    this.listeners.set(topic, handler);
  }

  async ack(_messageId: string): Promise<void> {}
  async nack(_messageId: string): Promise<void> {}

  async health(): Promise<boolean> {
    return this.server !== null;
  }

  async disconnect(): Promise<void> {
    if (this.server) {
      this.server.close();
    }
    for (const socket of this.connections.values()) {
      socket.destroy();
    }
    this.connections.clear();
  }
}

export function createTCPAdapter(config: TransportOptions): TCPAdapter {
  return new TCPAdapter(config);
}
