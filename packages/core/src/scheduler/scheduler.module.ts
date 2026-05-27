// packages/core/src/scheduler/scheduler.module.ts

import { Scheduler, setGlobalScheduler } from './scheduler.js';
import { SchedulerRegistry } from './scheduler-registry.js';
import { SchedulerConfig } from './types.js';

export interface SchedulerModuleOptions {
  checkInterval?: number;
  maxConcurrency?: number;
  distributed?: boolean;
  queueManager: any;
  eventBus?: any;
  logger?: any;
  redisConfig?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  global?: boolean;
}

export function SchedulerModule(options: SchedulerModuleOptions) {
  return {
    module: 'SchedulerModule',
    providers: [
      {
        provide: Scheduler,
        useFactory: async () => {
          const config: SchedulerConfig = {
            checkInterval: options.checkInterval || 1000,
            maxConcurrency: options.maxConcurrency || 10,
            distributed: options.distributed || false,
            queueManager: options.queueManager,
            eventBus: options.eventBus,
            logger: options.logger,
            redisConfig: options.redisConfig,
          };

          const scheduler = new Scheduler(config);
          await scheduler.initialize();

          if (options.global) {
            setGlobalScheduler(scheduler);
          }

          return scheduler;
        },
      },
      {
        provide: SchedulerRegistry,
        useFactory: (scheduler: Scheduler) => scheduler.getRegistry(),
        inject: [Scheduler],
      },
    ],
    exports: [Scheduler, SchedulerRegistry],
  };
}

export class SchedulerModuleBuilder {
  private options: SchedulerModuleOptions = {
    queueManager: null as any,
    global: true,
  };

  setCheckInterval(ms: number): this {
    this.options.checkInterval = ms;
    return this;
  }

  setMaxConcurrency(max: number): this {
    this.options.maxConcurrency = max;
    return this;
  }

  setQueueManager(queueManager: any): this {
    this.options.queueManager = queueManager;
    return this;
  }

  setEventBus(eventBus: any): this {
    this.options.eventBus = eventBus;
    return this;
  }

  setLogger(logger: any): this {
    this.options.logger = logger;
    return this;
  }

  enableDistributed(enable: boolean): this {
    this.options.distributed = enable;
    return this;
  }

  setRedisConfig(config: { host: string; port: number; password?: string; db?: number }): this {
    this.options.redisConfig = config;
    return this;
  }

  setGlobal(global: boolean): this {
    this.options.global = global;
    return this;
  }

  build(): any {
    if (!this.options.queueManager) {
      throw new Error('QueueManager is required');
    }

    return SchedulerModule(this.options);
  }
}
