import { Job } from './types.js';

export interface RetryPolicy {
  maxRetries: number;
  backoffStrategy: 'fixed' | 'linear' | 'exponential';
  baseDelay: number;
  maxDelay?: number;
  jitter?: boolean;
}

export interface RetryContext {
  job: Job;
  attempt: number;
  totalAttempts: number;
  error: Error;
  lastError?: Error;
}

export type RetryDecider = (context: RetryContext) => boolean;

export class RetryHandler {
  static calculateDelay(
    policy: RetryPolicy,
    attempt: number
  ): number {
    let delay: number;

    switch (policy.backoffStrategy) {
      case 'fixed':
        delay = policy.baseDelay;
        break;

      case 'linear':
        delay = policy.baseDelay * attempt;
        break;

      case 'exponential':
        delay = policy.baseDelay * Math.pow(2, attempt - 1);
        break;

      default:
        delay = policy.baseDelay;
    }

    // Apply max delay cap
    if (policy.maxDelay) {
      delay = Math.min(delay, policy.maxDelay);
    }

    // Apply jitter
    if (policy.jitter) {
      const jitterAmount = delay * 0.1; // 10% jitter
      delay += Math.random() * jitterAmount - jitterAmount / 2;
    }

    return Math.max(0, Math.floor(delay));
  }

  static shouldRetry(policy: RetryPolicy, attempt: number): boolean {
    return attempt <= policy.maxRetries;
  }

  static getRetryDelay(policy: RetryPolicy, attempt: number): number {
    if (!this.shouldRetry(policy, attempt)) {
      return 0;
    }

    return this.calculateDelay(policy, attempt);
  }

  static createExponentialPolicy(
    maxRetries: number = 3,
    baseDelay: number = 1000,
    maxDelay: number = 60000
  ): RetryPolicy {
    return {
      maxRetries,
      backoffStrategy: 'exponential',
      baseDelay,
      maxDelay,
      jitter: true,
    };
  }

  static createLinearPolicy(
    maxRetries: number = 3,
    baseDelay: number = 1000,
    maxDelay: number = 30000
  ): RetryPolicy {
    return {
      maxRetries,
      backoffStrategy: 'linear',
      baseDelay,
      maxDelay,
      jitter: false,
    };
  }

  static createFixedPolicy(
    maxRetries: number = 3,
    delay: number = 5000
  ): RetryPolicy {
    return {
      maxRetries,
      backoffStrategy: 'fixed',
      baseDelay: delay,
      jitter: false,
    };
  }
}

export class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private failureThreshold: number = 5,
    private resetTimeout: number = 60000 // 1 minute
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();

      if (this.state === 'half-open') {
        this.state = 'closed';
        this.failureCount = 0;
      }

      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'open';
    }
  }

  reset(): void {
    this.failureCount = 0;
    this.state = 'closed';
  }

  getState(): 'closed' | 'open' | 'half-open' {
    return this.state;
  }

  getFailureCount(): number {
    return this.failureCount;
  }
}

export class DeadLetterQueue {
  private deadLetters: Map<string, { job: Job; error: Error; timestamp: number }> = new Map();

  add(jobId: string, job: Job, error: Error): void {
    this.deadLetters.set(jobId, {
      job,
      error,
      timestamp: Date.now(),
    });
  }

  get(jobId: string): { job: Job; error: Error; timestamp: number } | undefined {
    return this.deadLetters.get(jobId);
  }

  getAll(): Array<{ jobId: string; job: Job; error: Error; timestamp: number }> {
    return Array.from(this.deadLetters.entries()).map(([jobId, data]) => ({
      jobId,
      ...data,
    }));
  }

  remove(jobId: string): boolean {
    return this.deadLetters.delete(jobId);
  }

  clear(): void {
    this.deadLetters.clear();
  }

  size(): number {
    return this.deadLetters.size;
  }
}
