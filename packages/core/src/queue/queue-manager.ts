import { Redis } from 'ioredis';
import { BullMQAdapter } from './adapters/bullmq-adapter.js';
import {
  QueueAdapter,
  QueueOptions,
  JobOptions,
  Job,
  JobProcessor,
  WorkerOptions,
  QueueStats,
  JobEvent,
} from './types.js';

export class QueueManager {
  private adapter: QueueAdapter;
  private redisConnection: Redis;
  private processors = new Map<string, JobProcessor>();

  constructor(redisConnection: Redis, adapter: QueueAdapter) {
    this.redisConnection = redisConnection;
    this.adapter = adapter;
  }

  static createBullMQ(redisConnection: Redis, config: QueueOptions): QueueManager {
    const adapter = new BullMQAdapter(redisConnection, config);
    return new QueueManager(redisConnection, adapter);
  }

  async initialize(): Promise<void> {
    if (this.adapter instanceof BullMQAdapter) {
      await (this.adapter as any).initialize();
    }
  }

  async addJob<T = any>(jobName: string, data: T, options?: JobOptions): Promise<Job<T>> {
    return this.adapter.add(jobName, data, options);
  }

  async addJobs<T = any>(
    jobs: Array<{ name: string; data: T; options?: JobOptions }>
  ): Promise<Job<T>[]> {
    return this.adapter.addBulk(jobs);
  }

  async getJob(jobId: string): Promise<Job | null> {
    return this.adapter.getJob(jobId);
  }

  async getJobs(statuses: any[]): Promise<Job[]> {
    return this.adapter.getJobs(statuses);
  }

  registerProcessor<T = any, R = any>(
    jobName: string,
    processor: JobProcessor<T, R>,
    options?: WorkerOptions
  ): void {
    this.processors.set(jobName, processor);
  }

  async startProcessing<T = any, R = any>(
    jobName: string,
    options?: WorkerOptions
  ): Promise<void> {
    const processor = this.processors.get(jobName);
    if (!processor) {
      throw new Error(`No processor registered for job: ${jobName}`);
    }

    await this.adapter.process(jobName, processor, options);
  }

  async startAllProcessors(options?: WorkerOptions): Promise<void> {
    for (const [jobName] of this.processors) {
      await this.startProcessing(jobName, options);
    }
  }

  on(event: JobEvent, handler: (job: Job, ...args: any[]) => void): void {
    this.adapter.on(event, handler);
  }

  async pause(): Promise<void> {
    await this.adapter.pause();
  }

  async resume(): Promise<void> {
    await this.adapter.resume();
  }

  async clean(grace: number, limit?: number, status?: string): Promise<number> {
    return this.adapter.clean(grace, limit, status as any);
  }

  async drain(): Promise<void> {
    await this.adapter.drain();
  }

  async getStats(): Promise<QueueStats> {
    return this.adapter.getStats();
  }

  async getMetrics(): Promise<any> {
    return this.adapter.getMetrics();
  }

  async close(): Promise<void> {
    await this.adapter.close();
  }

  getAdapter(): QueueAdapter {
    return this.adapter;
  }
}

// Global instance
let globalQueueManager: QueueManager | null = null;

export function setGlobalQueueManager(manager: QueueManager): void {
  globalQueueManager = manager;
}

export function getGlobalQueueManager(): QueueManager {
  if (!globalQueueManager) {
    throw new Error('Queue manager not initialized. Call setGlobalQueueManager first.');
  }
  return globalQueueManager;
}
