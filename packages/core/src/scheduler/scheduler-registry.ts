// packages/core/src/scheduler/scheduler-registry.ts

import { JobDefinition } from './types.js';

export class SchedulerRegistry {
  private jobs = new Map<string, JobDefinition>();
  private jobsByName = new Map<string, string>();

  register(jobDef: JobDefinition): void {
    if (this.jobs.has(jobDef.id)) {
      throw new Error(`Job already registered: ${jobDef.id}`);
    }

    this.jobs.set(jobDef.id, jobDef);
    this.jobsByName.set(jobDef.name, jobDef.id);
  }

  unregister(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    this.jobs.delete(jobId);
    this.jobsByName.delete(job.name);
    return true;
  }

  getJob(jobId: string): JobDefinition | null {
    return this.jobs.get(jobId) ?? null;
  }

  getJobByName(name: string): JobDefinition | null {
    const jobId = this.jobsByName.get(name);
    if (!jobId) return null;
    return this.jobs.get(jobId) ?? null;
  }

  listJobs(filter?: { type?: string; enabled?: boolean }): JobDefinition[] {
    const jobs = Array.from(this.jobs.values());

    if (!filter) return jobs;

    return jobs.filter((job) => {
      if (filter.type && job.type !== filter.type) return false;
      if (filter.enabled !== undefined && job.enabled !== filter.enabled) return false;
      return true;
    });
  }

  findByPattern(pattern: RegExp): JobDefinition[] {
    return Array.from(this.jobs.values()).filter((job) => pattern.test(job.name));
  }

  updateJobState(jobId: string, updates: Partial<JobDefinition>): void {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    Object.assign(job, updates);
  }

  pauseJob(jobId: string): void {
    this.updateJobState(jobId, { enabled: false });
  }

  resumeJob(jobId: string): void {
    this.updateJobState(jobId, { enabled: true });
  }

  resetJob(jobId: string): void {
    this.updateJobState(jobId, {
      lastRunAt: undefined,
      executionCount: 0,
      isRunning: false,
    });
  }

  clear(): void {
    this.jobs.clear();
    this.jobsByName.clear();
  }

  getJobCount(): number {
    return this.jobs.size;
  }

  getAllJobs(): JobDefinition[] {
    return Array.from(this.jobs.values());
  }
}
