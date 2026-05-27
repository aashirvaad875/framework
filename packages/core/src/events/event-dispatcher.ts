import { EventBus } from './event-bus.js';
import { Event, EventListener } from './types.js';
import { scanEventListeners } from './decorators.js';

export class EventDispatcher {
  constructor(private eventBus: EventBus) {}

  registerListenersFromClass(target: any, instance: any): void {
    const listeners = scanEventListeners(target);

    for (const listener of listeners) {
      const handler: EventListener = async (event: Event, context) => {
        await listener.handler.call(instance, event, context);
      };

      this.eventBus.on(listener.eventType, handler, listener.options);
    }
  }

  registerListenersFromInstance(instance: any): void {
    this.registerListenersFromClass(instance.constructor, instance);
  }

  async dispatchToListeners<T = any>(
    eventType: string,
    data?: T,
    context?: any,
  ): Promise<{ successful: number; failed: number; errors: Error[] }> {
    const result = await this.eventBus.emit(eventType, data, context);
    return {
      successful: result.successful,
      failed: result.failed,
      errors: result.errors || [],
    };
  }

  async dispatchDistributedEvent<T = any>(
    eventType: string,
    data?: T,
    context?: any,
    queueName?: string,
  ): Promise<void> {
    await this.eventBus.emitDistributed(eventType, data, context, queueName);
  }

  getListenerCount(eventType?: string): number {
    return this.eventBus.getListenerCount(eventType);
  }

  getEventTypes(): string[] {
    return this.eventBus.getEventTypes();
  }

  removeAllListeners(eventType?: string): void {
    this.eventBus.removeAllListeners(eventType);
  }

  getStats() {
    return this.eventBus.getStats();
  }

  async waitForEvent<T = any>(eventType: string, timeout: number = 30000): Promise<Event<T>> {
    return this.eventBus.waitFor<T>(eventType, timeout);
  }
}
