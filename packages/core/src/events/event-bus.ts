import { Event, EventListener, EventBusConfig, EventStats, EventDispatchResult, ListenerContext } from './types.js';
import { ListenerRegistry } from './listener-registry.js';
import { v4 as uuidv4 } from 'crypto';

export class EventBus {
  private registry: ListenerRegistry;
  private config: EventBusConfig;
  private stats: EventStats = {
    totalEvents: 0,
    eventsByType: {},
    totalListeners: 0,
    failedEvents: 0,
    successfulEvents: 0,
    averageProcessingTime: 0,
  };
  private processingTimes: number[] = [];
  private queueManager: any; // Will be injected

  constructor(config: EventBusConfig = {}) {
    this.config = {
      async: config.async ?? true,
      concurrency: config.concurrency ?? 10,
      maxListeners: config.maxListeners ?? 10,
      timeout: config.timeout ?? 30000,
      enableDistributed: config.enableDistributed ?? false,
      ...config,
    };

    this.registry = new ListenerRegistry();
    this.registry.setMaxListeners(this.config.maxListeners!);
  }

  on<T = any>(
    eventType: string,
    listener: EventListener<T>,
    options?: any
  ): () => void {
    this.registry.registerListener(eventType, listener, options);
    this.stats.totalListeners++;

    // Return unsubscribe function
    return () => {
      this.off(eventType, listener);
    };
  }

  once<T = any>(
    eventType: string,
    listener: EventListener<T>
  ): void {
    const wrappedListener = async (event: Event<T>, context?: ListenerContext) => {
      await listener(event, context);
      this.off(eventType, wrappedListener);
    };

    this.on(eventType, wrappedListener as EventListener);
  }

  off(eventType: string, listener: EventListener): boolean {
    const listeners = this.registry.getListeners(eventType);
    const index = listeners.findIndex((l) => l.handler === listener);

    if (index !== -1) {
      this.registry.unregisterListener(eventType, `${eventType}:${index}`);
      this.stats.totalListeners--;
      return true;
    }

    return false;
  }

  async emit<T = any>(
    eventType: string,
    data?: T,
    context?: Partial<ListenerContext>
  ): Promise<EventDispatchResult> {
    const event: Event<T> = {
      type: eventType,
      data: data as T,
      timestamp: Date.now(),
      source: context?.source || 'unknown',
      correlationId: context?.correlationId || uuidv4().toString(),
      causationId: context?.causationId || uuidv4().toString(),
    };

    return this.dispatch(event);
  }

  async dispatch<T = any>(event: Event<T>): Promise<EventDispatchResult> {
    const startTime = Date.now();
    const listeners = this.registry.getListeners(event.type);

    const result: EventDispatchResult = {
      event,
      listeners: listeners.length,
      successful: 0,
      failed: 0,
      duration: 0,
      errors: [],
    };

    this.stats.totalEvents++;
    this.stats.eventsByType[event.type] = (this.stats.eventsByType[event.type] || 0) + 1;

    if (listeners.length === 0) {
      result.duration = Date.now() - startTime;
      return result;
    }

    const context: ListenerContext = {
      correlationId: event.correlationId || uuidv4().toString(),
      causationId: event.causationId || uuidv4().toString(),
      timestamp: event.timestamp,
      source: event.source || 'unknown',
    };

    try {
      if (this.config.async) {
        // Parallel execution with concurrency limit
        await this.executeListenersWithConcurrency(
          listeners,
          event,
          context,
          result
        );
      } else {
        // Sequential execution
        for (const listener of listeners) {
          await this.executeListener(listener.handler, event, context, result);
        }
      }

      if (result.successful > 0) {
        this.stats.successfulEvents++;
      }
      if (result.failed > 0) {
        this.stats.failedEvents++;
      }
    } catch (error) {
      if (this.config.errorHandler) {
        for (const listener of listeners) {
          this.config.errorHandler(error as Error, event, listener.handler);
        }
      }
    }

    result.duration = Date.now() - startTime;
    this.processingTimes.push(result.duration);

    // Keep last 1000 times
    if (this.processingTimes.length > 1000) {
      this.processingTimes.shift();
    }

    this.updateAverageTime();

    return result;
  }

  private async executeListenersWithConcurrency(
    listeners: any[],
    event: Event,
    context: ListenerContext,
    result: EventDispatchResult
  ): Promise<void> {
    const concurrency = this.config.concurrency!;
    const groups = [];

    for (let i = 0; i < listeners.length; i += concurrency) {
      groups.push(listeners.slice(i, i + concurrency));
    }

    for (const group of groups) {
      const promises = group.map((listener) =>
        this.executeListener(listener.handler, event, context, result)
      );

      await Promise.allSettled(promises);
    }
  }

  private async executeListener(
    listener: EventListener,
    event: Event,
    context: ListenerContext,
    result: EventDispatchResult
  ): Promise<void> {
    try {
      const promise = listener(event, context);

      if (promise instanceof Promise) {
        await Promise.race([
          promise,
          this.createTimeout(this.config.timeout!),
        ]);
      }

      result.successful++;
    } catch (error) {
      result.failed++;
      result.errors?.push(error as Error);

      if (this.config.errorHandler) {
        this.config.errorHandler(error as Error, event, listener);
      }
    }
  }

  private createTimeout(ms: number): Promise<never> {
    return new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`Listener timeout after ${ms}ms`)),
        ms
      )
    );
  }

  async emitDistributed<T = any>(
    eventType: string,
    data?: T,
    context?: Partial<ListenerContext>,
    queueName?: string
  ): Promise<void> {
    if (!this.queueManager) {
      throw new Error('Queue manager not configured for distributed events');
    }

    const event: Event<T> = {
      type: eventType,
      data: data as T,
      timestamp: Date.now(),
      source: context?.source || 'unknown',
      correlationId: context?.correlationId || uuidv4().toString(),
      causationId: context?.causationId || uuidv4().toString(),
    };

    await this.queueManager.addJob(
      `distributed-event:${eventType}`,
      event,
      { retries: 3, backoff: { type: 'exponential', delay: 1000 } }
    );
  }

  getStats(): EventStats {
    return { ...this.stats };
  }

  getListenerCount(eventType?: string): number {
    return this.registry.getListenerCount(eventType);
  }

  getEventTypes(): string[] {
    return this.registry.getEventTypes();
  }

  removeAllListeners(eventType?: string): void {
    this.registry.clear(eventType);
    if (!eventType) {
      this.stats.totalListeners = 0;
    }
  }

  setQueueManager(manager: any): void {
    this.queueManager = manager;
  }

  private updateAverageTime(): void {
    if (this.processingTimes.length === 0) {
      this.stats.averageProcessingTime = 0;
      return;
    }

    const sum = this.processingTimes.reduce((a, b) => a + b, 0);
    this.stats.averageProcessingTime = sum / this.processingTimes.length;
  }

  async waitFor<T = any>(
    eventType: string,
    timeout: number = 30000
  ): Promise<Event<T>> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => {
          this.off(eventType, handler);
          reject(new Error(`Timeout waiting for event: ${eventType}`));
        },
        timeout
      );

      const handler = (event: Event<T>) => {
        clearTimeout(timer);
        this.off(eventType, handler);
        resolve(event);
      };

      this.on(eventType, handler);
    });
  }
}

// Global instance
let globalEventBus: EventBus | null = null;

export function setGlobalEventBus(bus: EventBus): void {
  globalEventBus = bus;
}

export function getGlobalEventBus(): EventBus {
  if (!globalEventBus) {
    globalEventBus = new EventBus();
  }
  return globalEventBus;
}
