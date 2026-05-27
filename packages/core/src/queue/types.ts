export type JobStatus = 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'paused';
export type JobEvent = 'progress' | 'completed' | 'failed' | 'retry' | 'stalled';

export interface JobOptions {
  attempts?: number;
  backoff?: {
    type: 'fixed' | 'exponential';
    delay: number;
  };
  delay?: number;
  priority?: number;
  timeout?: number;
  removeOnComplete?: boolean | { age?: number; count?: number };
  removeOnFail?: boolean;
}

export interface QueueOptions {
  name: string;
  maxStalledCount?: number;
  maxStalledInterval?: number;
  stalledInterval?: number;
  lockDuration?: number;
  lockRenewTime?: number;
  defaultJobOptions?: JobOptions;
}

export interface Job<T = any> {
  id: string;
  name: string;
  data: T;
  progress: number;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  failedReason?: string;
  stackTrace?: string[];
  delay?: number;
  timestamp: number;
  processedOn?: number;
  finishedOn?: number;
}

export interface JobProgressEvent {
  jobId: string;
  progress: number;
  data?: any;
}

export interface JobCompleteEvent {
  jobId: string;
  result: any;
  duration: number;
}

export interface JobFailEvent {
  jobId: string;
  error: Error;
  attempt: number;
  duration: number;
}

export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
  totalProcessed: number;
  totalFailed: number;
}

export interface WorkerOptions {
  concurrency?: number;
  lockDuration?: number;
  lockRenewTime?: number;
  maxStalledCount?: number;
}

export type JobProcessor<T = any, R = any> = (
  job: Job<T>
) => Promise<R>;

export interface QueueAdapter {
  name: string;

  // Queue management
  add<T = any>(jobName: string, data: T, options?: JobOptions): Promise<Job<T>>;
  addBulk<T = any>(jobs: Array<{ name: string; data: T; options?: JobOptions }>): Promise<Job<T>[]>;

  // Job retrieval
  getJob(jobId: string): Promise<Job | null>;
  getJobs(statuses: JobStatus[]): Promise<Job[]>;

  // Worker registration
  process<T = any, R = any>(
    jobName: string,
    processor: JobProcessor<T, R>,
    options?: WorkerOptions
  ): Promise<void>;

  // Event handling
  on(event: JobEvent, handler: (job: Job, ...args: any[]) => void): void;
  off(event: JobEvent, handler: (job: Job, ...args: any[]) => void): void;

  // Queue control
  pause(): Promise<void>;
  resume(): Promise<void>;
  clean(grace: number, limit?: number, status?: JobStatus): Promise<number>;
  drain(): Promise<void>;

  // Statistics
  getStats(): Promise<QueueStats>;
  getMetrics(): Promise<any>;

  // Cleanup
  close(): Promise<void>;
}

export const QUEUE_METADATA_KEY = Symbol('queue:metadata');
export const JOB_HANDLER_METADATA_KEY = Symbol('job-handler:metadata');
export const JOB_EVENT_HANDLER_METADATA_KEY = Symbol('job-event-handler:metadata');
