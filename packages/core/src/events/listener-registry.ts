import { Event, EventListener, ListenerMetadata, EventMetadata } from './types.js';

export class ListenerRegistry {
  private listeners = new Map<string, ListenerMetadata[]>();
  private listenerCount = 0;
  private maxListeners = 10;

  registerListener(
    eventType: string,
    listener: EventListener,
    options?: EventMetadata
  ): string {
    const listeners = this.listeners.get(eventType) || [];

    if (listeners.length >= this.maxListeners) {
      console.warn(
        `Max listeners (${this.maxListeners}) exceeded for event: ${eventType}`
      );
    }

    const metadata: ListenerMetadata = {
      eventType,
      handler: listener,
      options,
      isAsync: this.isAsyncFunction(listener),
    };

    listeners.push(metadata);
    this.listeners.set(eventType, listeners);
    this.listenerCount++;

    return `${eventType}:${listeners.length - 1}`;
  }

  unregisterListener(eventType: string, id: string): boolean {
    const listeners = this.listeners.get(eventType);
    if (!listeners) return false;

    const indexStr = id.split(':')[1];
    const index = parseInt(indexStr, 10);

    if (isNaN(index) || index < 0 || index >= listeners.length) {
      return false;
    }

    listeners.splice(index, 1);
    this.listenerCount--;

    if (listeners.length === 0) {
      this.listeners.delete(eventType);
    }

    return true;
  }

  getListeners(eventType: string): ListenerMetadata[] {
    return this.listeners.get(eventType) || [];
  }

  getListenerCount(eventType?: string): number {
    if (eventType) {
      return this.listeners.get(eventType)?.length || 0;
    }
    return this.listenerCount;
  }

  getEventTypes(): string[] {
    return Array.from(this.listeners.keys());
  }

  getStats(): Record<string, any> {
    const stats: Record<string, any> = {};

    for (const [eventType, listeners] of this.listeners) {
      stats[eventType] = {
        count: listeners.length,
        async: listeners.filter((l) => l.isAsync).length,
        sync: listeners.filter((l) => !l.isAsync).length,
      };
    }

    return stats;
  }

  clear(eventType?: string): void {
    if (eventType) {
      const listeners = this.listeners.get(eventType);
      if (listeners) {
        this.listenerCount -= listeners.length;
        this.listeners.delete(eventType);
      }
    } else {
      this.listenerCount = 0;
      this.listeners.clear();
    }
  }

  setMaxListeners(max: number): void {
    this.maxListeners = max;
  }

  private isAsyncFunction(fn: Function): boolean {
    return fn.constructor.name === 'AsyncFunction';
  }

  hasListener(eventType: string, listener: EventListener): boolean {
    const listeners = this.listeners.get(eventType) || [];
    return listeners.some((l) => l.handler === listener);
  }

  getListenersByPattern(pattern: RegExp): ListenerMetadata[] {
    const result: ListenerMetadata[] = [];

    for (const [eventType, listeners] of this.listeners) {
      if (pattern.test(eventType)) {
        result.push(...listeners);
      }
    }

    return result;
  }
}
