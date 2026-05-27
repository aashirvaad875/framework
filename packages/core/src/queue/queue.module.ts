import { Redis } from 'ioredis';
import { QueueManager, setGlobalQueueManager } from './queue-manager.js';
import { QueueOptions } from './types.js';

export interface QueueModuleOptions {
  redis?: {
    host?: string;
    port?: number;
    password?: string;
    db?: number;
  };
  redisConnection?: Redis;
  queues: QueueOptions[];
  global?: boolean;
}

export function QueueModule(options: QueueModuleOptions) {
  return {
    module: 'QueueModule',
    providers: [
      {
        provide: 'REDIS_CONNECTION',
        useFactory: async () => {
          if (options.redisConnection) {
            return options.redisConnection;
          }

          const redisOptions = {
            host: options.redis?.host || 'localhost',
            port: options.redis?.port || 6379,
            password: options.redis?.password,
            db: options.redis?.db || 0,
            retryStrategy: (times: number) => Math.min(times * 50, 2000),
          };

          const connection = new Redis(redisOptions);
          return connection;
        },
      },
      {
        provide: QueueManager,
        useFactory: async (redisConnection: Redis) => {
          // For now, create manager for first queue
          const queueConfig = options.queues[0];
          if (!queueConfig) {
            throw new Error('No queue configuration provided');
          }

          const manager = QueueManager.createBullMQ(redisConnection, queueConfig);
          await manager.initialize();

          if (options.global) {
            setGlobalQueueManager(manager);
          }

          return manager;
        },
        inject: ['REDIS_CONNECTION'],
      },
    ],
    exports: [QueueManager, 'REDIS_CONNECTION'],
  };
}

export class QueueModuleBuilder {
  private options: QueueModuleOptions = {
    queues: [],
    global: true,
  };

  setRedis(config: { host?: string; port?: number; password?: string; db?: number }): this {
    this.options.redis = config;
    return this;
  }

  setRedisConnection(connection: Redis): this {
    this.options.redisConnection = connection;
    return this;
  }

  addQueue(config: QueueOptions): this {
    this.options.queues.push(config);
    return this;
  }

  addQueues(configs: QueueOptions[]): this {
    this.options.queues.push(...configs);
    return this;
  }

  setGlobal(global: boolean): this {
    this.options.global = global;
    return this;
  }

  build(): any {
    if (this.options.queues.length === 0) {
      throw new Error('At least one queue configuration is required');
    }

    return QueueModule(this.options);
  }
}
