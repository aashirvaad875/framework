// packages/core/src/microservices/transport/transport.interface.ts

import type { MessageEnvelope } from '../types.js';

export interface Transport {
  /**
   * Connect to transport backend (broker, server, etc.)
   */
  connect(): Promise<void>;

  /**
   * Send message envelope to topic/queue
   */
  send(envelope: MessageEnvelope): Promise<void>;

  /**
   * Listen for messages on topic, call handler for each
   */
  listen(topic: string, handler: (envelope: MessageEnvelope) => Promise<void>): Promise<void>;

  /**
   * Acknowledge message (remove from queue, commit offset)
   */
  ack(messageId: string): Promise<void>;

  /**
   * Negative acknowledge (requeue, don't commit, retry)
   */
  nack(messageId: string): Promise<void>;

  /**
   * Get health status
   */
  health(): Promise<boolean>;

  /**
   * Disconnect from transport backend
   */
  disconnect(): Promise<void>;
}

export interface TransportFactory {
  create(options: Record<string, unknown>): Promise<Transport>;
}
