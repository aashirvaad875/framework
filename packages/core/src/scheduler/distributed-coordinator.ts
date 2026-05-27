// packages/core/src/scheduler/distributed-coordinator.ts

import { Redis } from 'ioredis';
import { JobDefinition } from './types.js';

export class DistributedCoordinator {
  private redis: Redis | null = null;
  private lockKey = 'scheduler:leader:lock';
  private lockTTL = 30000;
  private isLeader = false;
  private lockRenewalInterval: ReturnType<typeof setInterval> | null = null;

  constructor(redisConfig?: { host: string; port: number; password?: string; db?: number }) {
    if (redisConfig) {
      this.redis = new Redis({
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
        db: redisConfig.db ?? 0,
        retryStrategy: (times) => Math.min(times * 50, 2000),
      });
    }
  }

  async initialize(): Promise<void> {
    if (!this.redis) return;

    try {
      await this.redis.ping();
      await this.acquireLock();
      this.startLockRenewal();
    } catch (error) {
      console.error('Failed to initialize distributed coordinator:', error);
      this.isLeader = false;
    }
  }

  async shutdown(): Promise<void> {
    if (this.lockRenewalInterval) {
      clearInterval(this.lockRenewalInterval);
    }

    if (this.isLeader) {
      await this.releaseLock();
    }

    if (this.redis) {
      await this.redis.quit();
    }
  }

  async acquireLock(): Promise<boolean> {
    if (!this.redis) return false;

    try {
      const result = await this.redis.set(
        this.lockKey,
        Date.now().toString(),
        'PX',
        this.lockTTL,
        'NX',
      );

      this.isLeader = result === 'OK';
      return this.isLeader;
    } catch (error) {
      console.error('Failed to acquire lock:', error);
      return false;
    }
  }

  async renewLock(): Promise<boolean> {
    if (!this.redis) return false;

    try {
      const result = await this.redis.set(
        this.lockKey,
        Date.now().toString(),
        'PX',
        this.lockTTL,
        'XX',
      );

      this.isLeader = result === 'OK';
      if (!this.isLeader) {
        console.warn('Lost leadership, attempting to re-acquire');
        return await this.acquireLock();
      }

      return true;
    } catch (error) {
      console.error('Failed to renew lock:', error);
      this.isLeader = false;
      return false;
    }
  }

  async releaseLock(): Promise<void> {
    if (!this.redis) return;

    try {
      await this.redis.del(this.lockKey);
      this.isLeader = false;
    } catch (error) {
      console.error('Failed to release lock:', error);
    }
  }

  async persistJobDefinitions(jobs: JobDefinition[]): Promise<void> {
    if (!this.redis) return;

    try {
      const jobsKey = 'scheduler:jobs';
      await this.redis.del(jobsKey);

      for (const job of jobs) {
        await this.redis.hset(jobsKey, job.id, JSON.stringify(job));
      }
    } catch (error) {
      console.error('Failed to persist jobs:', error);
    }
  }

  async loadJobDefinitions(): Promise<JobDefinition[]> {
    if (!this.redis) return [];

    try {
      const jobsKey = 'scheduler:jobs';
      const jobs = await this.redis.hgetall(jobsKey);

      return Object.values(jobs).map((jobJson) => JSON.parse(jobJson)) as JobDefinition[];
    } catch (error) {
      console.error('Failed to load jobs:', error);
      return [];
    }
  }

  private startLockRenewal(): void {
    this.lockRenewalInterval = setInterval(async () => {
      await this.renewLock();
    }, this.lockTTL / 2);
  }

  getIsLeader(): boolean {
    return this.isLeader;
  }

  getRedis(): Redis | null {
    return this.redis;
  }
}
