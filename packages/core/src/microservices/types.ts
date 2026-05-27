// packages/core/src/microservices/types.ts

export interface ServiceAddress {
  host: string;
  port: number;
  metadata?: Record<string, string>;
}

export interface MessageEnvelope {
  messageId: string;
  topic?: string;
  replyTo?: string;
  inReplyTo?: string;
  payload: unknown;
  headers?: Record<string, string>;
  timestamp: number;
  retryCount: number;
}

export interface TransportOptions {
  transport: 'rabbitmq' | 'kafka' | 'redis' | 'grpc' | 'tcp';
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  [key: string]: unknown;
}

export interface RegistryOptions {
  type: 'static' | 'dynamic';
  config?: Record<string, unknown>;
}

export interface MicroserviceOptions {
  transport: TransportOptions;
  registry: RegistryOptions;
  serviceName: string;
  port: number;
  retryPolicy?: {
    maxRetries: number;
    backoffMultiplier: number;
    initialDelayMs: number;
  };
}

export interface RequestOptions {
  service: string;
  handler: string;
  payload: unknown;
  timeout?: number;
}

export interface PublishOptions {
  topic: string;
  payload: unknown;
  headers?: Record<string, string>;
}

export interface SubscribeOptions {
  topic: string;
  consumerGroup?: string;
  concurrency?: number;
}

export interface RequestHandlerMetadata {
  handler: string;
  fn: (payload: unknown) => Promise<unknown>;
}

export interface MessageListenerMetadata {
  topic: string;
  fn: (payload: unknown) => Promise<void>;
}
