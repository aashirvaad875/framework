import type { Transport } from '../transport/transport.interface.js';
import type { RequestHandlerMetadata, MessageEnvelope } from '../types.js';
import { Message } from '../transport/message.js';
import { HandlerException } from '../exceptions.js';

export class RequestHandler {
  private handlers: Map<string, RequestHandlerMetadata> = new Map();

  constructor(
    private transport: Transport,
    private serviceName: string
  ) {}

  register(handlerName: string, fn: (payload: unknown) => Promise<unknown>): void {
    this.handlers.set(handlerName, {
      handler: handlerName,
      fn,
    });
  }

  async handle(envelope: MessageEnvelope): Promise<void> {
    const { payload, messageId, replyTo } = envelope;
    const handlerPayload = payload as Record<string, unknown>;
    const handlerName = handlerPayload.handler as string;
    const actualPayload = handlerPayload.payload;

    const metadata = this.handlers.get(handlerName);
    if (!metadata) {
      const error = new Error(`Handler ${handlerName} not found`);
      await this.sendError(messageId, replyTo, error);
      return;
    }

    try {
      const result = await metadata.fn(actualPayload);
      const replyMessage = Message.reply(messageId, replyTo || '', result);
      replyMessage.topic = replyTo;
      await this.transport.send(replyMessage);
    } catch (error) {
      const handlerError = new HandlerException(handlerName, error as Error);
      await this.sendError(messageId, replyTo, handlerError);
    }
  }

  private async sendError(
    messageId: string,
    replyTo: string | undefined,
    error: Error
  ): Promise<void> {
    if (!replyTo) {
      return;
    }

    const errorReply = Message.reply(messageId, replyTo, null, {
      error: error.message,
      errorType: error.name,
    });
    errorReply.topic = replyTo;

    try {
      await this.transport.send(errorReply);
    } catch (sendError) {
      console.error('Failed to send error reply:', sendError);
    }
  }

  getHandlers(): string[] {
    return Array.from(this.handlers.keys());
  }
}
