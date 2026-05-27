import { Queue, Worker, Job as BullJob, QueueEvents, MetricsTime } from 'bullmq';
import { Redis } from 'ioredis';
import {
  QueueAdapter,
  QueueOptions,
  JobOptions,
  Job,
  JobStatus,
  JobEvent,
  JobProcessor,
  WorkerOptions,
  QueueStats,
} from '../types.js';

export class BullMQAdapter implements QueueAdapter {
  name = 'bullmq';
  private queue: Queue | null = null;
  private workers = new Map<string, Worker>();
  private queueEvents: QueueEvents | null = null;
  private config: QueueOptions;
  private redisConnection: Redis;

  constructor(redisConnection: Redis, config: QueueOptions) {
    this.redisConnection = redisConnection;
    this.config = config;
  }

  async initialize(): Promise<void> {
    this.queue = new Queue(this.config.name, {
      connection: this.redisConnection,
      defaultJobOptions: this.config.defaultJobOptions || {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
      },
      settings: {
        maxStalledCount: this.config.maxStalledCount ?? 2,
        maxStalledInterval: this.config.maxStalledInterval ?? 30000,
        stalledInterval: this.config.stalledInterval ?? 5000,
        lockDuration: this.config.lockDuration ?? 30000,
        lockRenewTime: this.config.lockRenewTime ?? 15000,
      },
    });

    this.queueEvents = new QueueEvents(this.config.name, {
      connection: this.redisConnection,
    });
  }

  async add<T = any>(jobName: string, data: T, options?: JobOptions): Promise<Job<T>> {
    if (!this.queue) throw new Error('Queue not initialized');

    const bullJob = await this.queue.add(jobName, data, {
      attempts: options?.attempts || 3,
      backoff: options?.backoff || {
        type: 'exponential',
        delay: 2000,
      },
      delay: options?.delay,
      priority: options?.priority,
      timeout: options?.timeout,
      removeOnComplete: options?.removeOnComplete,
      removeOnFail: options?.removeOnFail,
    });

    return this.bullJobToJob(bullJob);
  }

  async addBulk<T = any>(
    jobs: Array<{ name: string; data: T; options?: JobOptions }>
  ): Promise<Job<T>[]> {
    if (!this.queue) throw new Error('Queue not initialized');

    const bullJobs = await this.queue.addBulk(
      jobs.map((j) => ({
        name: j.name,
        data: j.data,
        opts: {
          attempts: j.options?.attempts || 3,
          backoff: j.options?.backoff || {
            type: 'exponential',
            delay: 2000,
          },
          delay: j.options?.delay,
          priority: j.options?.priority,
          timeout: j.options?.timeout,
          removeOnComplete: j.options?.removeOnComplete,
          removeOnFail: j.options?.removeOnFail,
        },
      }))
    );

    return bullJobs.map((j) => this.bullJobToJob(j));
  }

  async getJob(jobId: string): Promise<Job | null> {
    if (!this.queue) throw new Error('Queue not initialized');

    const bullJob = await this.queue.getJob(jobId);
    return bullJob ? this.bullJobToJob(bullJob) : null;
  }

  async getJobs(statuses: JobStatus[]): Promise<Job[]> {
    if (!this.queue) throw new Error('Queue not initialized');

    const bullJobs = await this.queue.getJobs(statuses as any);
    return bullJobs.map((j) => this.bullJobToJob(j));
  }

  async process<T = any, R = any>(
    jobName: string,
    processor: JobProcessor<T, R>,
    options?: WorkerOptions
  ): Promise<void> {
    if (!this.queue) throw new Error('Queue not initialized');

    const worker = new Worker(this.config.name, async (bullJob: BullJob<T>) => {
      const job = this.bullJobToJob(bullJob);
      try {
        const result = await processor(job);
        return result;
      } catch (error) {
        throw error;
      }
    }, {
      connection: this.redisConnection,
      concurrency: options?.concurrency || 1,
      lockDuration: options?.lockDuration || 30000,
      lockRenewTime: options?.lockRenewTime || 15000,
      maxStalledCount: options?.maxStalledCount || 2,
    });

    this.workers.set(jobName, worker);

    worker.on('failed', (job, error) => {
      this.queueEvents?.emit('failed', { jobId: job.id, error });
    });

    worker.on('completed', (job, result) => {
      this.queueEvents?.emit('completed', { jobId: job.id, result });
    });
  }

  on(event: JobEvent, handler: (job: Job, ...args: any[]) => void): void {
    if (!this.queueEvents) throw new Error('Queue events not initialized');

    this.queueEvents.on(event as any, async (...args: any[]) => {
      const jobId = args[0]?.jobId || args[0];
      const job = await this.getJob(jobId);
      if (job) {
        handler(job, ...args);
      }
    });
  }

  off(event: JobEvent, handler: (job: Job, ...args: any[]) => void): void {
    if (!this.queueEvents) throw new Error('Queue events not initialized');

    this.queueEvents.off(event as any, handler);
  }

  async pause(): Promise<void> {
    if (!this.queue) throw new Error('Queue not initialized');
    await this.queue.pause();
  }

  async resume(): Promise<void> {
    if (!this.queue) throw new Error('Queue not initialized');
    await this.queue.resume();
  }

  async clean(grace: number, limit?: number, status?: JobStatus): Promise<number> {
    if (!this.queue) throw new Error('Queue not initialized');

    const result = await this.queue.clean(grace, limit, status as any);
    return result.length;
  }

  async drain(): Promise<void> {
    if (!this.queue) throw new Error('Queue not initialized');
    await this.queue.drain();
  }

  async getStats(): Promise<QueueStats> {
    if (!this.queue) throw new Error('Queue not initialized');

    const counts = await this.queue.getJobCounts();

    return {
      waiting: counts.waiting || 0,
      active: counts.active || 0,
      completed: counts.completed || 0,
      failed: counts.failed || 0,
      delayed: counts.delayed || 0,
      paused: counts.paused || 0,
      totalProcessed: counts.completed || 0,
      totalFailed: counts.failed || 0,
    };
  }

  async getMetrics(): Promise<any> {
    if (!this.queue) throw new Error('Queue not initialized');

    try {
      const metrics = await this.queue.getMetrics('hour', 1);
      return metrics;
    } catch {
      return null;
    }
  }

  async close(): Promise<void> {
    for (const worker of this.workers.values()) {
      await worker.close();
    }
    if (this.queueEvents) {
      await this.queueEvents.close();
    }
    if (this.queue) {
      await this.queue.close();
    }
  }

  private bullJobToJob(bullJob: BullJob): Job {
    return {
      id: bullJob.id!,
      name: bullJob.name,
      data: bullJob.data,
      progress: typeof bullJob.progress() === 'number' ? (bullJob.progress() as number) : 0,
      status: bullJob.getState() as JobStatus,
      attempts: bullJob.attemptsMade,
      maxAttempts: bullJob.opts.attempts || 3,
      failedReason: bullJob.failedReason,
      stackTrace: bullJob.stacktrace,
      delay: bullJob.opts.delay,
      timestamp: bullJob.timestamp || Date.now(),
      processedOn: bullJob.processedOn,
      finishedOn: bullJob.finishedOn,
    };
  }
}
