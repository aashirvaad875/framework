// packages/core/src/scheduler/types.ts

export type JobType = 'cron' | 'interval' | 'timeout';
export type ConcurrencyMode = 'skip' | 'unlimited';

export interface JobDefinition {
  id: string;
  name: string;
  type: JobType;
  handler: Function;

  // Cron-specific
  expression?: string;
  timezone?: string;

  // Interval/Timeout-specific
  delayMs?: number;

  // Common options
  queueName?: string;
  distributed?: boolean;
  concurrency?: ConcurrencyMode;
  enabled?: boolean;
  maxExecutions?: number;

  // State tracking
  createdAt: Date;
  lastRunAt?: Date;
  nextRunAt?: Date;
  executionCount: number;
  isRunning?: boolean;
}

export interface JobMetadata {
  eventType: string;
  timezone?: string;
  delayMs?: number;
  distributed?: boolean;
  concurrency?: ConcurrencyMode;
  queueName?: string;
  maxExecutions?: number;
}

export interface JobExecutionContext {
  jobId: string;
  jobName: string;
  triggeredAt: number;
  queueJobId?: string;
  error?: Error;
}

export interface SchedulerConfig {
  checkInterval?: number;
  maxConcurrency?: number;
  distributed?: boolean;
  redisConfig?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  queueManager: any;
  eventBus?: any;
  logger?: any;
}

export interface CronExpression {
  expression: string;
  timezone?: string;
}

export interface SchedulerRegistry {
  register(jobDef: JobDefinition): void;
  unregister(jobId: string): boolean;
  getJob(jobId: string): JobDefinition | null;
  getJobByName(name: string): JobDefinition | null;
  listJobs(filter?: { type?: string; enabled?: boolean }): JobDefinition[];
  updateJobState(jobId: string, updates: Partial<JobDefinition>): void;
}

export const CRON_METADATA_KEY = Symbol('scheduler:cron:metadata');
export const INTERVAL_METADATA_KEY = Symbol('scheduler:interval:metadata');
export const TIMEOUT_METADATA_KEY = Symbol('scheduler:timeout:metadata');
