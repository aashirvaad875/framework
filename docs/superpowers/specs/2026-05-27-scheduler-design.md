# Enterprise Scheduler System Design Spec

**Date:** May 27, 2026  
**Status:** Approved  
**Scope:** Complete scheduling system with cron, interval, timeout, and distributed support

---

## Executive Summary

An enterprise-grade scheduler system that provides three complementary scheduling mechanisms (cron, interval, timeout) with full integration into the existing queue system for job execution. Features include timezone-aware cron expressions, distributed coordination via Redis, configurable concurrency, and graceful error handling.

---

## Requirements

### Functional Requirements

1. **Cron Jobs** - Recurring schedules with standard cron expressions and timezone support
2. **Interval Jobs** - Repeating execution every N milliseconds
3. **Timeout Jobs** - One-time delayed execution after N milliseconds
4. **Distributed Scheduling** - Optional Redis-based coordination for multi-instance deployments
5. **Queue Integration** - Delegate job execution to existing queue system
6. **Decorators** - `@Cron()`, `@Interval()`, `@Timeout()` for declarative job definition
7. **Scheduler Registry** - Store, query, and manage job definitions
8. **Concurrency Control** - Configurable per-job concurrency (skip if running or allow multiple)
9. **Timezone Support** - Cron expressions respect specified timezones (e.g., America/New_York)
10. **Job Lifecycle** - Start, pause, resume, cancel operations

### Non-Functional Requirements

1. **Reliability** - Jobs trigger reliably even across process restarts
2. **Scalability** - Support 1000+ scheduled jobs per instance
3. **Performance** - Minimal overhead checking triggers (every 1 second default)
4. **Fault Tolerance** - Graceful degradation if Redis unavailable
5. **Type Safety** - Full TypeScript support
6. **DI Integration** - Seamless dependency injection for job handlers

---

## Architecture

### Overview

```
┌─────────────────────────────────────────────────┐
│         Application/Services (with jobs)        │
│  @Cron, @Interval, @Timeout decorators         │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│      Scheduler Module (DI Integration)          │
│  - Initializes scheduler & registers jobs       │
└────────────────┬────────────────────────────────┘
                 │
      ┌──────────┴──────────┐
      │                     │
      ▼                     ▼
┌──────────────┐    ┌──────────────────┐
│  Scheduler   │    │ Scheduler        │
│ (Triggers)   │    │ Registry (Store) │
└──────┬───────┘    └──────────────────┘
       │
       ├─ Cron Manager (Parse, timezone)
       ├─ Job State Tracker
       └─ Distributed Coordinator (Redis)
       │
       ▼
┌──────────────────────┐
│  Queue System        │
│  (Execution + Retry) │
└──────────────────────┘
       │
       ▼
┌──────────────────────┐
│  Event System        │
│  (Trigger events)    │
└──────────────────────┘
```

### Component Responsibilities

| Component | Responsibility |
|-----------|---|
| **Decorator Metadata** | Capture job definition (@Cron, @Interval, @Timeout) |
| **Scheduler Registry** | Store jobs, query by name/pattern, track state |
| **Cron Manager** | Parse expressions, calculate next run, handle timezones |
| **Scheduler** | Main loop checking for triggers, queue delegation |
| **Distributed Coordinator** | Redis locks, leader election, job persistence |
| **Scheduler Module** | DI setup, configuration, lifecycle management |

---

## Detailed Specification

### 1. Job Definition Model

```typescript
interface JobDefinition {
  id: string;                    // Unique identifier
  name: string;                  // Job name
  type: 'cron' | 'interval' | 'timeout';
  handler: Function;             // The actual job function
  
  // Cron-specific
  expression?: string;           // Cron expression (e.g., '0 9 * * *')
  timezone?: string;             // Timezone (e.g., 'America/New_York')
  
  // Interval/Timeout-specific
  delayMs?: number;              // Milliseconds
  
  // Common options
  queueName?: string;            // Queue to use (default: job name)
  distributed?: boolean;         // Only one scheduler runs (default: false)
  concurrency?: 'skip' | 'unlimited';  // Concurrent runs (default: 'skip')
  enabled?: boolean;             // Active or paused
  maxExecutions?: number;        // Limit total runs (null = unlimited)
  
  // Metadata
  createdAt: Date;
  lastRunAt?: Date;
  nextRunAt?: Date;
  executionCount: number;
}

interface JobExecutionContext {
  jobId: string;
  jobName: string;
  triggeredAt: number;
  queueJobId?: string;
  error?: Error;
}
```

### 2. Scheduler Registry (`scheduler-registry.ts`)

**Responsibility:** In-memory + optional Redis storage of job definitions

```typescript
class SchedulerRegistry {
  // Storage
  private jobs = new Map<string, JobDefinition>();
  private redis?: RedisClient;
  
  // Operations
  register(jobDef: JobDefinition): void;
  unregister(jobId: string): boolean;
  getJob(jobId: string): JobDefinition | null;
  getJobByName(name: string): JobDefinition | null;
  listJobs(filter?: { type?: string; enabled?: boolean }): JobDefinition[];
  findByPattern(pattern: RegExp): JobDefinition[];
  
  // State
  updateJobState(jobId: string, updates: Partial<JobDefinition>): void;
  getJobState(jobId: string): JobDefinition | null;
  
  // Persistence (optional Redis)
  async syncToRedis(): Promise<void>;
  async loadFromRedis(): Promise<void>;
  
  // Control
  pauseJob(jobId: string): void;
  resumeJob(jobId: string): void;
  resetJob(jobId: string): void;
}
```

### 3. Cron Manager (`cron-manager.ts`)

**Responsibility:** Parse cron expressions, calculate next run times with timezone support

```typescript
class CronManager {
  // Parsing & validation
  static parseExpression(expression: string): CronExpression;
  static validateExpression(expression: string): boolean;
  
  // Scheduling
  static getNextRunTime(
    expression: string,
    timezone: string,
    fromTime?: Date
  ): Date;
  
  // Utilities
  static isTimeToRun(
    expression: string,
    timezone: string,
    currentTime: Date,
    lastRunTime?: Date
  ): boolean;
  
  static getScheduleDescription(expression: string): string;
  // Example: '0 9 * * *' → 'Every day at 9:00 AM'
}
```

**Cron Expression Format:** Standard 5-field (minute hour day month dayofweek)
- `0 9 * * *` - Every day at 9:00 AM
- `0 */6 * * *` - Every 6 hours
- `30 2 * * 0` - Every Sunday at 2:30 AM
- `0 9 * * 1-5` - Weekdays at 9:00 AM

### 4. Scheduler (`scheduler.ts`)

**Responsibility:** Main orchestrator, triggers jobs, delegates to queue

```typescript
class Scheduler {
  private registry: SchedulerRegistry;
  private queueManager: QueueManager;
  private eventBus: EventBus;
  private checkInterval: NodeJS.Timer;
  
  // Initialization
  constructor(config: SchedulerConfig);
  async initialize(): Promise<void>;
  async shutdown(): Promise<void>;
  
  // Job triggering (internal)
  private async checkAndTriggerJobs(): Promise<void>;
  private async triggerJob(jobDef: JobDefinition): Promise<void>;
  
  // Queue delegation
  private async queueJobForExecution(jobDef: JobDefinition): Promise<string>;
  
  // Job control
  async pauseJob(jobId: string): Promise<void>;
  async resumeJob(jobId: string): Promise<void>;
  async cancelJob(jobId: string): Promise<void>;
  
  // Query
  getJobStatus(jobId: string): JobDefinition | null;
  listActiveJobs(): JobDefinition[];
}
```

**Trigger Flow:**
1. Check every 1 second (configurable)
2. For each enabled job:
   - Determine if it should run (cron time, interval elapsed, timeout due)
   - Check concurrency: if previous run still executing and concurrency='skip', skip
   - Queue job to execution queue: `queueManager.addJob(jobName, jobData)`
   - Update `lastRunAt`, `nextRunAt`, `executionCount`
   - Emit event: `scheduler:triggered` with job metadata
3. Job executes in queue system with full retry/backoff support

### 5. Distributed Coordinator (`distributed-coordinator.ts`)

**Responsibility:** Redis-based coordination for singleton scheduler behavior (optional)

```typescript
class DistributedCoordinator {
  private redis: RedisClient;
  private lockKey = 'scheduler:leader:lock';
  private lockTTL = 30000;  // 30 seconds
  
  // Leader election
  async acquireLock(): Promise<boolean>;
  async renewLock(): Promise<boolean>;
  async releaseLock(): Promise<void>;
  
  // Job persistence
  async persistJobDefinitions(jobs: JobDefinition[]): Promise<void>;
  async loadJobDefinitions(): Promise<JobDefinition[]>;
  
  // Helpers
  private isLeader(): boolean;
}
```

**How It Works (Optional Mode):**
1. When distributed mode enabled, try to acquire lock in Redis
2. If lock acquired: this scheduler is "leader" and triggers distributed jobs
3. If lock fails: this scheduler only runs local (non-distributed) jobs
4. Lock renewed every 15 seconds; if failed, leadership lost
5. If leader crashes, next scheduler acquires lock within 30 seconds

### 6. Decorators (`decorators.ts`)

```typescript
// Cron job
@Cron('0 9 * * *', {
  name: 'daily-report',
  timezone: 'America/New_York',
  distributed: true,
  concurrency: 'skip'
})
async generateDailyReport() { }

// Interval job
@Interval(5000, {
  name: 'health-check',
  distributed: false
})
async checkHealth() { }

// Timeout job
@Timeout(30000, {
  name: 'delayed-action'
})
async delayedAction() { }
```

**Metadata Captured:**
- Job expression/delay
- Job name
- Timezone (for cron)
- Distributed flag
- Concurrency setting
- Method reference

### 7. Scheduler Module (`scheduler.module.ts`)

**Responsibility:** DI integration and lifecycle management

```typescript
class SchedulerModule {
  private scheduler: Scheduler;
  private registry: SchedulerRegistry;
  
  constructor(config: SchedulerModuleConfig);
  async initialize(): Promise<void>;
  async shutdown(): Promise<void>;
  
  getScheduler(): Scheduler;
  getRegistry(): SchedulerRegistry;
}

class SchedulerModuleBuilder {
  setInterval(ms: number): this;
  setMaxConcurrency(max: number): this;
  setQueueManager(queueManager: QueueManager): this;
  enableDistributed(enable: boolean): this;
  setRedisConfig(config: RedisConfig): this;
  build(): SchedulerModule;
}

// Global instance helpers
export function setGlobalSchedulerModule(module: SchedulerModule): void;
export function getGlobalSchedulerModule(): SchedulerModule;
export function getGlobalScheduler(): Scheduler;
```

---

## Configuration

### Default Configuration

```typescript
interface SchedulerModuleConfig {
  // Checking interval for triggers (default: 1 second)
  checkInterval?: number;
  
  // Max concurrent job queue operations (default: 10)
  maxConcurrency?: number;
  
  // Distributed mode (default: false)
  distributed?: boolean;
  
  // Redis config (required if distributed=true)
  redisConfig?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  
  // Queue manager instance
  queueManager: QueueManager;
  
  // Event bus for notifications
  eventBus?: EventBus;
  
  // Logger instance
  logger?: Logger;
}
```

### Example Usage

```typescript
// Simple single-process setup
const scheduler = new SchedulerModuleBuilder()
  .setQueueManager(queueManager)
  .build();

await scheduler.initialize();

// Distributed setup
const scheduler = new SchedulerModuleBuilder()
  .setQueueManager(queueManager)
  .enableDistributed(true)
  .setRedisConfig({
    host: 'localhost',
    port: 6379,
  })
  .build();

await scheduler.initialize();
```

---

## Data Flow Examples

### Example 1: Daily Cron Job (Timezone-Aware)

```
Define:
  @Cron('0 9 * * *', { timezone: 'America/New_York', distributed: true })
  async dailyReport() { ... }

Register:
  SchedulerRegistry stores job:
    {
      id: 'daily-report',
      type: 'cron',
      expression: '0 9 * * *',
      timezone: 'America/New_York',
      distributed: true,
      nextRunAt: 2026-05-28T13:00:00Z (9am EST = 1pm UTC)
    }

Trigger (when 1pm UTC reached):
  1. CronManager.isTimeToRun(...) returns true
  2. Scheduler.triggerJob() called
  3. Scheduler.queueJobForExecution() adds to queue:
     await queueManager.addJob('daily-report', {
       scheduledAt: Date.now(),
       jobDefinitionId: 'daily-report'
     })
  4. Update nextRunAt to tomorrow's 1pm UTC
  5. Emit event: 'scheduler:job:triggered'

Execute (in queue):
  1. QueueManager picks job from queue
  2. Calls handler with job data
  3. On success: emit 'scheduler:job:completed'
  4. On failure: retry with exponential backoff
```

### Example 2: Interval Job (Every 5 Seconds)

```
Define:
  @Interval(5000)
  async healthCheck() { ... }

Register:
  {
    id: 'health-check',
    type: 'interval',
    delayMs: 5000,
    distributed: false,
    lastRunAt: 2026-05-27T10:00:00.000Z,
    nextRunAt: 2026-05-27T10:00:05.000Z
  }

Check (every 1 second):
  2026-05-27T10:00:01Z → nextRunAt in future, skip
  2026-05-27T10:00:02Z → nextRunAt in future, skip
  ...
  2026-05-27T10:00:05Z → time to run! Queue job
  2026-05-27T10:00:10Z → time to run again! Queue another

Concurrency:
  If concurrency='skip' and previous execution running:
    → Skip this trigger, wait for next interval
  If concurrency='unlimited':
    → Queue regardless of prior status
```

### Example 3: Timeout Job (Run Once After Delay)

```
Define:
  @Timeout(30000)
  async delayedCleanup() { ... }

Register:
  {
    id: 'delayed-cleanup',
    type: 'timeout',
    delayMs: 30000,
    nextRunAt: 2026-05-27T10:00:30.000Z
  }

Trigger (after 30 seconds):
  1. Time >= nextRunAt
  2. Queue job
  3. After execution completes:
     - Set enabled=false (don't repeat)
     - Do NOT reschedule
```

---

## Error Handling & Resilience

### Job Queueing Failures

If queueManager.addJob() fails:
- Log error with job ID and details
- Reschedule to next trigger time
- Emit 'scheduler:job:queue_failed' event
- Do NOT throw (other jobs continue)

### Job Definition Errors

If job definition invalid (bad cron expression, invalid timezone):
- Log error
- Set job enabled=false
- Emit 'scheduler:job:error' event
- Admin can fix and re-enable

### Distributed Coordination Failures

If Redis unavailable:
- Fallback to local-only mode
- Non-distributed jobs run normally
- Distributed jobs skipped with warning log
- When Redis recovers, resume distributed operation

### Graceful Shutdown

```typescript
await scheduler.shutdown();
  1. Stop checking for new triggers
  2. Wait max 30s for in-flight job queueing to complete
  3. Close Redis connection if distributed
  4. Emit 'scheduler:shutdown' event
```

---

## Integration Points

### With Queue System
- Jobs triggered by scheduler are added to queue via `queueManager.addJob(jobName, jobData)`
- Queue handles execution, retries, monitoring
- Result/error logged back to scheduler

### With Event System
- `scheduler:job:triggered` - Job triggered
- `scheduler:job:queued` - Successfully queued
- `scheduler:job:completed` - Execution completed
- `scheduler:job:failed` - Execution failed
- `scheduler:job:error` - Job definition error

### With DI Container
- Job handlers receive full dependency injection
- Services can be injected into job methods
- Scoped providers work within job context

### With Logging
- All events logged with correlation ID
- Job execution tracked with timing
- Errors logged with full context

---

## Testing Strategy

1. **Unit Tests**
   - CronManager: expression parsing, next time calculation, timezone handling
   - SchedulerRegistry: CRUD operations, state tracking
   - Distributed coordinator: lock acquire/release, leader election

2. **Integration Tests**
   - Scheduler triggers jobs at correct times
   - Jobs queued successfully
   - Concurrency rules respected
   - Distributed coordination prevents duplication

3. **E2E Tests**
   - Full job lifecycle: define → trigger → execute → complete
   - Multi-instance distributed scheduling
   - Graceful shutdown and recovery

---

## Files to Create

### Core System
- `packages/core/src/scheduler/types.ts`
- `packages/core/src/scheduler/scheduler-registry.ts`
- `packages/core/src/scheduler/cron-manager.ts`
- `packages/core/src/scheduler/distributed-coordinator.ts`
- `packages/core/src/scheduler/scheduler.ts`
- `packages/core/src/scheduler/decorators.ts`
- `packages/core/src/scheduler/scheduler.module.ts`
- `packages/core/src/scheduler/index.ts`

### Documentation & Examples
- `docs/SCHEDULER.md` - User guide
- `examples/scheduler-example.ts` - Working examples

### Updates
- `packages/core/src/index.ts` - Export scheduler
- `packages/core/package.json` - Add `cron-parser` and `date-fns-tz` dependencies

---

## Dependencies

```json
{
  "cron-parser": "^4.0.0",    // Parse cron expressions
  "date-fns-tz": "^2.0.0"     // Timezone support
}
```

---

## Success Criteria

- ✅ All job types (cron, interval, timeout) trigger correctly
- ✅ Cron expressions with timezones calculate correctly
- ✅ Jobs queue to queue system with proper metadata
- ✅ Distributed mode prevents duplicate triggers
- ✅ Concurrency settings respected
- ✅ Graceful error handling and recovery
- ✅ Full TypeScript type safety
- ✅ Comprehensive documentation and examples
- ✅ Zero build errors for core and API packages

---

**Design Status:** ✅ **APPROVED AND READY FOR IMPLEMENTATION**
