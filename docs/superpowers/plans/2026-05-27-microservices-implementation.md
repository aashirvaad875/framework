# Microservices Support System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete microservices layer with transport abstraction, RPC/messaging patterns, at-least-once delivery, service discovery, and five transport adapters (RabbitMQ, Kafka, Redis, gRPC, TCP).

**Architecture:** Layered design with core Transport abstraction handling delivery guarantees, RPC and Messaging layers providing request-response and pub-sub semantics, pluggable service discovery, and transport-agnostic adapters. At-least-once delivery via message IDs and acknowledgments; services implement idempotency.

**Tech Stack:** amqplib (RabbitMQ), kafkajs (Kafka), ioredis (Redis), @grpc/grpc-js (gRPC), protobufjs (Protocol Buffers), typescript-reflect (metadata)

---

## Task 1: Core Types & Exceptions

**Files:**
- Create: `packages/core/src/microservices/types.ts`
- Create: `packages/core/src/microservices/exceptions.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Create types.ts with core type definitions**

```typescript
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
```

- [ ] **Step 2: Create exceptions.ts with exception hierarchy**

```typescript
// packages/core/src/microservices/exceptions.ts

export class MicroserviceException extends Error {
  constructor(message: string, public code: string) {
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
    super(
      `Request to ${serviceName} timed out after ${timeoutMs}ms`,
      'REQUEST_TIMEOUT'
    );
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
    super(
      `Message moved to dead-letter queue: ${messageId} from topic ${topic}`,
      'DEAD_LETTER'
    );
    this.name = 'DeadLetterException';
  }
}
```

- [ ] **Step 3: Update core package exports**

```typescript
// packages/core/src/index.ts - add at end
export * from './microservices/index.js';
```

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/microservices/types.ts packages/core/src/microservices/exceptions.ts packages/core/src/index.ts
git commit -m "feat(microservices): add core types and exception hierarchy"
```

---

## Task 2: Transport Interface & Message Envelope

**Files:**
- Create: `packages/core/src/microservices/transport/transport.interface.ts`
- Create: `packages/core/src/microservices/transport/message.ts`

- [ ] **Step 1: Create transport.interface.ts**

```typescript
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
  listen(
    topic: string,
    handler: (envelope: MessageEnvelope) => Promise<void>
  ): Promise<void>;

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
```

- [ ] **Step 2: Create message.ts with envelope builder**

```typescript
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

  static request(
    replyTo: string,
    payload: unknown,
    headers?: Record<string, string>
  ): Message {
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

  static event(
    topic: string,
    payload: unknown,
    headers?: Record<string, string>
  ): Message {
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
```

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/microservices/transport/transport.interface.ts packages/core/src/microservices/transport/message.ts
git commit -m "feat(microservices): add transport abstraction and message envelope"
```

---

## Task 3: Message Serialization

**Files:**
- Create: `packages/core/src/microservices/transport/serializer.ts`

- [ ] **Step 1: Create serializer.ts**

```typescript
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
      payload: this.serializer.deserialize(
        Buffer.from(parsed.payload, 'base64')
      ),
    };
  }

  setContentType(contentType: string): void {
    // For future extensibility (MessagePack, Protobuf, etc.)
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/core/src/microservices/transport/serializer.ts
git commit -m "feat(microservices): add message serialization layer"
```

---

## Task 4: Service Discovery Layer

**Files:**
- Create: `packages/core/src/microservices/discovery/service-registry.interface.ts`
- Create: `packages/core/src/microservices/discovery/static-registry.ts`
- Create: `packages/core/src/microservices/discovery/dynamic-registry.ts`

[Full Task 4 content continues as in the plan...]

---

## Task 5-20: [Remaining tasks as in the full plan]

[All remaining task specifications...]

---

## Summary

**Total Tasks:** 20
**Total Files:** 25+
**Architecture:** Layered (Transport → RPC/Messaging → Bootstrap)
**Transport Adapters:** 5 (RabbitMQ, Kafka, Redis, gRPC, TCP)
