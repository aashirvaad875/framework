// packages/core/src/microservices/exceptions.ts

export class MicroserviceException extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = 'MicroserviceException';
  }
}

export class ServiceNotFoundException extends MicroserviceException {
  constructor(serviceName: string) {
    super(`Service not found: ${serviceName}`, 'SERVICE_NOT_FOUND');
    this.name = 'ServiceNotFoundException';
  }
}

export class ServiceUnavailableException extends MicroserviceException {
  constructor(serviceName: string, cause?: Error) {
    super(
      `Service unavailable: ${serviceName}${cause ? ' - ' + cause.message : ''}`,
      'SERVICE_UNAVAILABLE'
    );
    this.name = 'ServiceUnavailableException';
  }
}

export class RequestTimeoutException extends MicroserviceException {
  constructor(serviceName: string, timeoutMs: number) {
    super(`Request to ${serviceName} timed out after ${timeoutMs}ms`, 'REQUEST_TIMEOUT');
    this.name = 'RequestTimeoutException';
  }
}

export class MessageDeliveryException extends MicroserviceException {
  constructor(topic: string, cause?: Error) {
    super(
      `Failed to deliver message to ${topic}${cause ? ' - ' + cause.message : ''}`,
      'MESSAGE_DELIVERY_FAILED'
    );
    this.name = 'MessageDeliveryException';
  }
}

export class HandlerException extends MicroserviceException {
  constructor(handlerName: string, originalError: Error) {
    super(`Handler ${handlerName} threw error: ${originalError.message}`, 'HANDLER_ERROR');
    this.originalError = originalError;
    this.name = 'HandlerException';
  }

  originalError: Error;
}

export class IdempotencyException extends MicroserviceException {
  constructor(messageId: string) {
    super(`Message already processed: ${messageId}`, 'DUPLICATE_MESSAGE');
    this.name = 'IdempotencyException';
  }
}

export class DeadLetterException extends MicroserviceException {
  constructor(messageId: string, topic: string) {
    super(`Message moved to dead-letter queue: ${messageId} from topic ${topic}`, 'DEAD_LETTER');
    this.name = 'DeadLetterException';
  }
}
