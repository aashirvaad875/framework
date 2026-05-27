// packages/core/src/scheduler/scheduler.ts

import { randomUUID } from 'crypto';
import { JobDefinition, SchedulerConfig } from './types.js';
import { SchedulerRegistry } from './scheduler-registry.js';
import { CronManager } from './cron-manager.js';
import { DistributedCoordinator } from './distributed-coordinator.js';
import { scanScheduledMethods } from './decorators.js';

export class Scheduler {
  private registry: SchedulerRegistry;
  private config: SchedulerConfig;
  private checkInterval: NodeJS.Timeout | null = null;
  private coordinator: DistributedCoordinator | null = null;
  private isRunning = false;

  constructor(config: SchedulerConfig) {
    this.config = {
      checkInterval: config.checkInterval ?? 1000,
      maxConcurrency: config.maxConcurrency ?? 10,
      distributed: config.distributed ?? false,
      ...config,
    };

    this.registry = new SchedulerRegistry();

    if (this.config.distributed && config.redisConfig) {
      this.coordinator = new DistributedCoordinator(config.redisConfig);
    }
  }

  async initialize(): Promise<void> {
    if (this.isRunning) return;

    if (this.coordinator) {
      await this.coordinator.initialize();
    }

    this.isRunning = true;
    this.startChecking();
  }

  async shutdown(): Promise<void> {
    if (!this.isRunning) return;

    this.stopChecking();

    if (this.coordinator) {
      await this.coordinator.shutdown();
    }

    this.isRunning = false;
  }

  registerJobsFromInstance(instance: any): void {
    const methods = scanScheduledMethods(instance);

    for (const { method, handler, type, metadata } of methods) {
      const jobId = randomUUID();
      const jobName = metadata.queueName ?? `${instance.constructor.name}.${method}`;

      let jobDef: JobDefinition;

      if (type === 'cron') {
        jobDef = {
          id: jobId,
          name: jobName,
          type: 'cron',
          handler: handler.bind(instance),
          expression: metadata.eventType,
          timezone: metadata.timezone,
          queueName: metadata.queueName ?? jobName,
          distributed: metadata.distributed ?? false,
          concurrency: metadata.concurrency ?? 'skip',
          enabled: true,
          createdAt: new Date(),
          executionCount: 0,
        };
      } else if (type === 'interval') {
        jobDef = {
          id: jobId,
          name: jobName,
          type: 'interval',
          handler: handler.bind(instance),
          delayMs: metadata.delayMs,
          queueName: metadata.queueName ?? jobName,
          distributed: metadata.distributed ?? false,
          concurrency: metadata.concurrency ?? 'skip',
          enabled: true,
          createdAt: new Date(),
          nextRunAt: new Date(Date.now() + metadata.delayMs),
          executionCount: 0,
        };
      } else {
        // timeout
        jobDef = {
          id: jobId,
          name: jobName,
          type: 'timeout',
          handler: handler.bind(instance),
          delayMs: metadata.delayMs,
          queueName: metadata.queueName ?? jobName,
          distributed: metadata.distributed ?? false,
          concurrency: metadata.concurrency ?? 'skip',
          enabled: true,
          createdAt: new Date(),
          nextRunAt: new Date(Date.now() + metadata.delayMs),
          executionCount: 0,
        };
      }

      this.registry.register(jobDef);
    }
  }

  private startChecking(): void {
    this.checkInterval = setInterval(() => this.checkAndTriggerJobs(), this.config.checkInterval);
  }

  private stopChecking(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  private async checkAndTriggerJobs(): Promise<void> {
    const jobs = this.registry.listJobs({ enabled: true });
    const now = new Date();

    for (const job of jobs) {
      // Skip distributed jobs if not leader
      if (job.distributed && this.coordinator && !this.coordinator.getIsLeader()) {
        continue;
      }

      let shouldRun = false;

      if (job.type === 'cron' && job.expression && job.timezone) {
        shouldRun = CronManager.isTimeToRun(job.expression, job.timezone, now, job.lastRunAt);
      } else if (job.type === 'interval' && job.delayMs && job.nextRunAt) {
        shouldRun = now >= job.nextRunAt;
      } else if (job.type === 'timeout' && job.nextRunAt) {
        shouldRun = now >= job.nextRunAt;
      }

      if (shouldRun) {
        await this.triggerJob(job);
      }
    }
  }

  private async triggerJob(job: JobDefinition): Promise<void> {
    try {
      // Check concurrency
      if (job.concurrency === 'skip' && job.isRunning) {
        return;
      }

      // Update state
      this.registry.updateJobState(job.id, { isRunning: true });

      // Queue the job
      await this.queueJobForExecution(job);

      // Update tracking
      this.registry.updateJobState(job.id, {
        lastRunAt: new Date(),
        executionCount: (job.executionCount ?? 0) + 1,
      });

      // Calculate next run
      if (job.type === 'cron' && job.expression && job.timezone) {
        const nextRun = CronManager.getNextRunTime(job.expression, job.timezone, new Date());
        this.registry.updateJobState(job.id, { nextRunAt: nextRun });
      } else if (job.type === 'interval' && job.delayMs) {
        const nextRun = new Date(Date.now() + job.delayMs);
        this.registry.updateJobState(job.id, { nextRunAt: nextRun });
      } else if (job.type === 'timeout') {
        // One-time job, disable after execution
        this.registry.updateJobState(job.id, { enabled: false });
      }

      // Emit event if available
      if (this.config.eventBus) {
        await this.config.eventBus.emit('scheduler:job:triggered', {
          jobId: job.id,
          jobName: job.name,
          jobType: job.type,
          triggeredAt: Date.now(),
        });
      }

      this.registry.updateJobState(job.id, { isRunning: false });
    } catch (error) {
      this.registry.updateJobState(job.id, { isRunning: false });

      if (this.config.logger) {
        this.config.logger.error('Failed to trigger job', {
          jobId: job.id,
          jobName: job.name,
          error: (error as Error).message,
        });
      }

      if (this.config.eventBus) {
        await this.config.eventBus.emit('scheduler:job:error', {
          jobId: job.id,
          jobName: job.name,
          error: (error as Error).message,
        });
      }
    }
  }

  private async queueJobForExecution(job: JobDefinition): Promise<void> {
    if (!this.config.queueManager) {
      throw new Error('QueueManager not configured');
    }

    const queueJobId = await this.config.queueManager.addJob(
      job.queueName ?? job.name,
      {
        scheduledJobId: job.id,
        scheduledJobName: job.name,
        triggeredAt: Date.now(),
      },
    );

    if (this.config.eventBus) {
      await this.config.eventBus.emit('scheduler:job:queued', {
        jobId: job.id,
        jobName: job.name,
        queueJobId,
      });
    }
  }

  // Public API
  getRegistry(): SchedulerRegistry {
    return this.registry;
  }

  getJob(jobId: string): JobDefinition | null {
    return this.registry.getJob(jobId);
  }

  getJobByName(name: string): JobDefinition | null {
    return this.registry.getJobByName(name);
  }

  listJobs(filter?: { type?: string; enabled?: boolean }): JobDefinition[] {
    return this.registry.listJobs(filter);
  }

  pauseJob(jobId: string): void {
    this.registry.pauseJob(jobId);
  }

  resumeJob(jobId: string): void {
    this.registry.resumeJob(jobId);
  }

  cancelJob(jobId: string): void {
    this.registry.unregister(jobId);
  }

  resetJob(jobId: string): void {
    this.registry.resetJob(jobId);
  }

  isLeader(): boolean {
    return this.coordinator?.getIsLeader() ?? true;
  }

  getStats() {
    const jobs = this.registry.getAllJobs();
    return {
      totalJobs: jobs.length,
      enabledJobs: jobs.filter((j) => j.enabled).length,
      cronJobs: jobs.filter((j) => j.type === 'cron').length,
      intervalJobs: jobs.filter((j) => j.type === 'interval').length,
      timeoutJobs: jobs.filter((j) => j.type === 'timeout').length,
      distributedJobs: jobs.filter((j) => j.distributed).length,
      totalExecutions: jobs.reduce((sum, j) => sum + j.executionCount, 0),
      isLeader: this.isLeader(),
    };
  }
}

let globalScheduler: Scheduler | null = null;

export function setGlobalScheduler(scheduler: Scheduler): void {
  globalScheduler = scheduler;
}

export function getGlobalScheduler(): Scheduler {
  if (!globalScheduler) {
    throw new Error('Scheduler not initialized. Call setGlobalScheduler first.');
  }
  return globalScheduler;
}
