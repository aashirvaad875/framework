import { Module } from '../modules/index.js';
import { EventBus } from './event-bus.js';
import { EventDispatcher } from './event-dispatcher.js';
import { ListenerRegistry } from './listener-registry.js';

export interface EventBusModuleConfig {
  maxListeners?: number;
  async?: boolean;
  concurrency?: number;
  timeout?: number;
  enableDistributed?: boolean;
  errorHandler?: (error: Error, event: any, listener: any) => void;
}

export class EventsModule implements Module {
  private eventBus: EventBus;
  private eventDispatcher: EventDispatcher;
  private listenerRegistry: ListenerRegistry;

  constructor(config?: EventBusModuleConfig) {
    this.listenerRegistry = new ListenerRegistry();
    this.listenerRegistry.setMaxListeners(config?.maxListeners ?? 10);

    this.eventBus = new EventBus({
      maxListeners: config?.maxListeners ?? 10,
      async: config?.async ?? true,
      concurrency: config?.concurrency ?? 10,
      timeout: config?.timeout ?? 30000,
      enableDistributed: config?.enableDistributed ?? false,
      errorHandler: config?.errorHandler,
    });

    this.eventDispatcher = new EventDispatcher(this.eventBus);
  }

  getEventBus(): EventBus {
    return this.eventBus;
  }

  getEventDispatcher(): EventDispatcher {
    return this.eventDispatcher;
  }

  getListenerRegistry(): ListenerRegistry {
    return this.listenerRegistry;
  }

  async initialize(): Promise<void> {
    // Initialization logic if needed
  }

  async shutdown(): Promise<void> {
    // Cleanup logic
    this.eventBus.removeAllListeners();
  }

  onModuleInit?(): void | Promise<void> {
    // Module initialization hook
  }

  onModuleDestroy?(): void | Promise<void> {
    // Module destruction hook
  }
}

export class EventBusModuleBuilder {
  private config: EventBusModuleConfig = {};

  setMaxListeners(max: number): this {
    this.config.maxListeners = max;
    return this;
  }

  setAsync(async: boolean): this {
    this.config.async = async;
    return this;
  }

  setConcurrency(concurrency: number): this {
    this.config.concurrency = concurrency;
    return this;
  }

  setTimeout(timeout: number): this {
    this.config.timeout = timeout;
    return this;
  }

  enableDistributed(enable: boolean): this {
    this.config.enableDistributed = enable;
    return this;
  }

  setErrorHandler(handler: (error: Error, event: any, listener: any) => void): this {
    this.config.errorHandler = handler;
    return this;
  }

  build(): EventsModule {
    return new EventsModule(this.config);
  }
}

let globalEventsModule: EventsModule | null = null;

export function setGlobalEventsModule(module: EventsModule): void {
  globalEventsModule = module;
}

export function getGlobalEventsModule(): EventsModule {
  if (!globalEventsModule) {
    globalEventsModule = new EventsModule();
  }
  return globalEventsModule;
}

export function getGlobalEventBus(): EventBus {
  return getGlobalEventsModule().getEventBus();
}

export function getGlobalEventDispatcher(): EventDispatcher {
  return getGlobalEventsModule().getEventDispatcher();
}
