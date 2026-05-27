export interface Event<T = any> {
  type: string;
  data: T;
  timestamp: number;
  source?: string;
  correlationId?: string;
  causationId?: string;
  metadata?: Record<string, any>;
}

export interface EventMetadata {
  async?: boolean;
  priority?: number;
  timeout?: number;
  retries?: number;
  distributed?: boolean;
  queue?: string;
  filters?: ((event: Event) => boolean)[];
}

export type EventListener<T = any> = (
  event: Event<T>,
  context?: ListenerContext
) => Promise<void> | void;

export interface ListenerMetadata {
  eventType: string;
  handler: EventListener;
  options?: EventMetadata;
  isAsync: boolean;
}

export interface ListenerContext {
  correlationId: string;
  causationId: string;
  timestamp: number;
  source: string;
}

export interface EventBusConfig {
  async?: boolean;
  concurrency?: number;
  maxListeners?: number;
  errorHandler?: (error: Error, event: Event, listener: EventListener) => void;
  timeout?: number;
  enableDistributed?: boolean;
}

export interface EventStats {
  totalEvents: number;
  eventsByType: Record<string, number>;
  totalListeners: number;
  failedEvents: number;
  successfulEvents: number;
  averageProcessingTime: number;
}

export interface EventDispatchResult {
  event: Event;
  listeners: number;
  successful: number;
  failed: number;
  duration: number;
  errors?: Error[];
}

export interface DistributedEventOptions {
  queueName?: string;
  delay?: number;
  retries?: number;
  timeout?: number;
}

export const EVENT_LISTENER_METADATA_KEY = Symbol('event-listener:metadata');
export const EVENT_HANDLER_METADATA_KEY = Symbol('event-handler:metadata');
