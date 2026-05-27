import type { MessageEnvelope } from '../types.js';
import { DeadLetterException } from '../exceptions.js';

export type DeadLetterCallback = (
  message: MessageEnvelope,
  reason: string,
  attemptCount: number
) => Promise<void>;

export interface DeadLetterConfig {
  maxRetries: number;
  backoffMultiplier: number;
  initialDelayMs: number;
}

export class DeadLetterHandler {
  private dlqMessages: Map<string, MessageEnvelope> = new Map();
  private callbacks: Set<DeadLetterCallback> = new Set();
  private config: DeadLetterConfig;

  constructor(config: Partial<DeadLetterConfig> = {}) {
    this.config = {
      maxRetries: 3,
      backoffMultiplier: 2,
      initialDelayMs: 1000,
      ...config,
    };
  }

  async handleFailedMessage(
    message: MessageEnvelope,
    reason: string,
    attemptCount: number
  ): Promise<void> {
    if (attemptCount >= this.config.maxRetries) {
      this.dlqMessages.set(message.messageId, message);

      for (const callback of this.callbacks) {
        try {
          await callback(message, reason, attemptCount);
        } catch (error) {
          console.error('DLQ callback error:', error);
        }
      }

      throw new DeadLetterException(message.messageId, message.topic || 'unknown');
    }
  }

  getRetryDelay(attemptCount: number): number {
    return this.config.initialDelayMs * Math.pow(this.config.backoffMultiplier, attemptCount);
  }

  onDeadLetter(callback: DeadLetterCallback): void {
    this.callbacks.add(callback);
  }

  getDLQMessages(): MessageEnvelope[] {
    return Array.from(this.dlqMessages.values());
  }

  clearMessage(messageId: string): void {
    this.dlqMessages.delete(messageId);
  }

  clear(): void {
    this.dlqMessages.clear();
  }
}
