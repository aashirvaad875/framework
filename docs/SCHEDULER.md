# Scheduler System Documentation

A comprehensive, production-ready job scheduling system for Node.js applications with support for cron jobs, interval jobs, one-time timeouts, and distributed scheduling across multiple instances.

## Quick Start

### Installation

The scheduler system is included in the `@framework/core` package. No additional installation needed if you already have the framework set up.

### Basic Setup

```typescript
import { SchedulerModuleBuilder } from '@framework/core';
import { QueueManager } from '@framework/queue'; // Your queue manager
import { EventBus } from '@framework/events'; // Your event bus

// Create and configure the scheduler
const schedulerModule = new SchedulerModuleBuilder()
  .setQueueManager(queueManager)
  .setEventBus(eventBus)
  .build();

// Now register it in your application (module system specific)
// The scheduler will be initialized automatically
```

### Creating Your First Scheduled Job

Using decorators:

```typescript
import { Cron, Interval, Timeout } from '@framework/core';

class TaskService {
  // Run every day at 2 AM
  @Cron('0 2 * * *', { timezone: 'UTC' })
  async dailyCleanup() {
    console.log('Running daily cleanup...');
    // Your cleanup logic here
  }

  // Run every 5 minutes
  @Interval(5 * 60 * 1000)
  async checkStatus() {
    console.log('Checking status...');
    // Your status check logic here
  }

  // Run once after 10 seconds
  @Timeout(10 * 1000)
  async oneTimeTask() {
    console.log('One-time task executed');
    // Your one-time logic here
  }
}

// Register the service with the scheduler
const taskService = new TaskService();
scheduler.registerJobsFromInstance(taskService);
```

## Features Overview

### 1. **Cron Jobs**

Schedule tasks using standard cron expressions. Perfect for recurring tasks at specific times.

- Uses standard 5-field cron syntax (minute, hour, day, month, day-of-week)
- Timezone-aware execution
- Handles daylight saving time transitions
- First execution calculated automatically

**Example:**
```typescript
class ReportService {
  // Every Monday at 9 AM
  @Cron('0 9 * * 1', { timezone: 'Australia/Sydney' })
  async generateWeeklyReport() {
    // Generate report logic
  }

  // Every 15 minutes
  @Cron('*/15 * * * *')
  async syncData() {
    // Sync logic
  }
}
```

### 2. **Interval Jobs**

Run tasks repeatedly at fixed intervals. Ideal for polling or periodic maintenance.

- Specified in milliseconds
- Automatically calculates next run time after each execution
- Continues until job is paused or cancelled

**Example:**
```typescript
class HealthCheckService {
  // Every 30 seconds
  @Interval(30 * 1000)
  async healthCheck() {
    // Health check logic
    console.log('System healthy');
  }

  // Every 5 minutes
  @Interval(5 * 60 * 1000)
  async refreshCache() {
    // Cache refresh logic
  }
}
```

### 3. **Timeout Jobs**

Execute a task once after a specified delay. Use for one-time delayed execution.

- Specified in milliseconds
- Automatically disables after first execution
- Useful for time-delayed notifications or cleanup

**Example:**
```typescript
class NotificationService {
  // Send reminder after 1 hour
  @Timeout(60 * 60 * 1000)
  async sendReminderNotification() {
    // Send notification logic
  }
}
```

### 4. **Distributed Scheduling**

Run jobs across multiple application instances with automatic leader election. Only the leader instance executes distributed jobs.

- Redis-based coordination
- Automatic leader election with heartbeat
- Prevents duplicate execution across instances
- Perfect for clustered deployments

**Example:**
```typescript
class DataProcessingService {
  // Only executed by the leader instance
  @Cron('0 0 * * *', { 
    timezone: 'UTC',
    distributed: true,
    queueName: 'daily-processing'
  })
  async processDailyData() {
    // This runs only on the leader instance
  }
}

// Enable distributed mode in configuration
const schedulerModule = new SchedulerModuleBuilder()
  .setQueueManager(queueManager)
  .setEventBus(eventBus)
  .enableDistributed(true)
  .setRedisConfig({
    host: 'localhost',
    port: 6379,
    password: 'your-password', // optional
    db: 0
  })
  .build();
```

## Cron Expression Guide

Cron expressions follow the standard 5-field format:

```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6) (Sunday to Saturday)
│ │ │ │ │
│ │ │ │ │
* * * * *
```

### Common Cron Patterns

| Pattern | Description |
|---------|-------------|
| `0 0 * * *` | Every day at midnight (00:00) |
| `0 2 * * *` | Every day at 2 AM |
| `0 */6 * * *` | Every 6 hours (at 0, 6, 12, 18) |
| `0 9-17 * * 1-5` | Every hour from 9 AM to 5 PM, Monday to Friday |
| `*/15 * * * *` | Every 15 minutes |
| `0 0 1 * *` | First day of every month at midnight |
| `0 0 1 1 *` | January 1st at midnight (New Year) |
| `0 12 * * 0` | Every Sunday at noon |
| `30 2 * * *` | Every day at 2:30 AM |
| `0 0 * * 1` | Every Monday at midnight |
| `15,45 * * * *` | At minutes 15 and 45 of every hour |
| `0 0 * * 1,3,5` | Monday, Wednesday, Friday at midnight |

### Special Cron Characters

- `*` - Any value (all allowed values)
- `,` - List separator (e.g., `1,3,5` = 1st, 3rd, 5th)
- `-` - Range (e.g., `1-5` = 1 through 5)
- `/` - Step values (e.g., `*/5` = every 5th value)

### Examples with Timezone

```typescript
class GlobalService {
  // 9 AM Sydney time every weekday
  @Cron('0 9 * * 1-5', { timezone: 'Australia/Sydney' })
  async sydneyMorningTask() {}

  // 3 PM New York time daily
  @Cron('0 15 * * *', { timezone: 'America/New_York' })
  async newyorkAfternoonTask() {}

  // Midnight UTC
  @Cron('0 0 * * *', { timezone: 'UTC' })
  async midnightUTCTask() {}
}
```

## Configuration Guide

### SchedulerModuleBuilder API

The `SchedulerModuleBuilder` provides a fluent configuration interface:

```typescript
const schedulerModule = new SchedulerModuleBuilder()
  .setCheckInterval(1000)           // Check for jobs every 1 second (default)
  .setMaxConcurrency(10)            // Max concurrent jobs (default: 10)
  .setQueueManager(queueManager)    // Required: your queue manager
  .setEventBus(eventBus)            // Optional: for job events
  .setLogger(logger)                // Optional: for job logging
  .enableDistributed(true)          // Enable distributed scheduling
  .setRedisConfig({                 // Required if distributed
    host: 'localhost',
    port: 6379,
    password: 'secret',
    db: 0
  })
  .setGlobal(true)                  // Set as global scheduler (default: true)
  .build();
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `checkInterval` | number | 1000 | Interval in ms to check for due jobs |
| `maxConcurrency` | number | 10 | Maximum concurrent job executions |
| `distributed` | boolean | false | Enable distributed job coordination |
| `queueManager` | object | - | **Required** - Your queue manager instance |
| `eventBus` | object | - | Optional event bus for job lifecycle events |
| `logger` | object | - | Optional logger for job execution logs |
| `redisConfig` | object | - | Redis config for distributed mode |
| `global` | boolean | true | Set scheduler as global singleton |

### Redis Configuration

When using distributed scheduling, configure Redis connection:

```typescript
.setRedisConfig({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB) || 0
})
```

## Job Control API

### Pause a Job

Temporarily suspend job execution:

```typescript
const jobId = 'your-job-id'; // From registration
scheduler.pauseJob(jobId);
```

The job will not execute until resumed, but its state is maintained.

### Resume a Job

Resume a paused job:

```typescript
scheduler.resumeJob(jobId);
```

### Cancel a Job

Remove a job completely:

```typescript
scheduler.cancelJob(jobId);
```

The job is unregistered and cannot be resumed.

### Reset a Job

Reset job execution statistics:

```typescript
scheduler.resetJob(jobId);
```

Clears execution count and last run time, useful for restarting tracking.

### Get Job Information

```typescript
// Get a specific job
const job = scheduler.getJob(jobId);
console.log(job.executionCount);
console.log(job.lastRunAt);
console.log(job.nextRunAt);

// Get job by name
const dailyJob = scheduler.getJobByName('TaskService.dailyCleanup');

// List all jobs with optional filtering
const allJobs = scheduler.listJobs();
const enabledCronJobs = scheduler.listJobs({ 
  enabled: true, 
  type: 'cron' 
});
```

### Job Lifecycle Management

```typescript
import { Scheduler, getGlobalScheduler } from '@framework/core';

const scheduler = getGlobalScheduler();

// Get job statistics
const stats = scheduler.getStats();
console.log(`Total jobs: ${stats.totalJobs}`);
console.log(`Enabled jobs: ${stats.enabledJobs}`);
console.log(`Cron jobs: ${stats.cronJobs}`);
console.log(`Interval jobs: ${stats.intervalJobs}`);
console.log(`Timeout jobs: ${stats.timeoutJobs}`);
console.log(`Distributed jobs: ${stats.distributedJobs}`);
console.log(`Total executions: ${stats.totalExecutions}`);
console.log(`Is leader: ${stats.isLeader}`);

// Graceful shutdown
await scheduler.shutdown();
```

## Event System Integration

The scheduler emits events throughout the job lifecycle. Hook into these for monitoring, logging, and alerting.

### Configuring Event Bus

```typescript
import { EventBus } from '@framework/events';

const eventBus = new EventBus();

const schedulerModule = new SchedulerModuleBuilder()
  .setQueueManager(queueManager)
  .setEventBus(eventBus)
  .build();

// Listen for scheduler events
eventBus.on('scheduler:job:triggered', async (data) => {
  console.log(`Job triggered: ${data.jobName}`);
});

eventBus.on('scheduler:job:queued', async (data) => {
  console.log(`Job queued: ${data.jobName}`);
});

eventBus.on('scheduler:job:error', async (data) => {
  console.error(`Job error: ${data.jobName}`, data.error);
});
```

### Available Events

#### `scheduler:job:triggered`
Fired when a job is triggered and about to execute.

```typescript
{
  jobId: string;           // Unique job ID
  jobName: string;         // Job name
  jobType: 'cron' | 'interval' | 'timeout';
  triggeredAt: number;     // Timestamp in milliseconds
}
```

#### `scheduler:job:queued`
Fired when a job is queued for execution in the queue manager.

```typescript
{
  jobId: string;           // Scheduled job ID
  jobName: string;         // Job name
  queueJobId: string;      // Queue job ID (returned by queue manager)
}
```

#### `scheduler:job:error`
Fired when a job execution fails.

```typescript
{
  jobId: string;           // Scheduled job ID
  jobName: string;         // Job name
  error: string;           // Error message
}
```

### Practical Event Usage Examples

**Monitoring with alerts:**
```typescript
eventBus.on('scheduler:job:error', async (data) => {
  await sendSlackAlert({
    channel: '#alerts',
    message: `Scheduled job failed: ${data.jobName}\n${data.error}`
  });
});
```

**Logging to external service:**
```typescript
eventBus.on('scheduler:job:triggered', async (data) => {
  await metrics.recordJobExecution(data.jobName, data.triggeredAt);
});
```

**Tracking execution patterns:**
```typescript
const executionLog = {};

eventBus.on('scheduler:job:triggered', async (data) => {
  if (!executionLog[data.jobName]) {
    executionLog[data.jobName] = [];
  }
  executionLog[data.jobName].push({
    timestamp: new Date(data.triggeredAt),
    status: 'triggered'
  });
});
```

## Distributed Scheduling

### How Distributed Scheduling Works

In a clustered deployment with multiple application instances:

1. **Leader Election**: When distributed mode is enabled, instances compete for a distributed lock in Redis
2. **Leader Responsibilities**: Only the leader instance executes jobs marked as `distributed: true`
3. **Heartbeat & Renewal**: The leader maintains a heartbeat; if lost, another instance becomes leader
4. **Fallback**: Non-distributed jobs execute on all instances (useful for local tasks)

### Architecture

```
┌──────────────────────────────────────┐
│      Application Cluster             │
├──────────────┬──────────────┐─────────┤
│              │              │         │
│  Instance 1  │  Instance 2  │Instance 3
│  (Leader)    │ (Follower)   │(Follower)
│              │              │         │
│ Executes:    │ Executes:    │Executes:│
│ - Cron jobs  │ - Cron jobs  │- Cron   │
│   (dist=yes) │   (dist=no)  │  (dist  │
│ - Intervals  │ - Intervals  │  =no)   │
│   (dist=no)  │   (dist=yes) │         │
│ - Timeouts   │   - Timeouts │- Timeout│
│   (dist=no)  │   (dist=no)  │ (dist   │
│              │              │  =no)   │
│   ┌────────────────────────────────┐ │
│   │    Redis Lock (Distributed)    │ │
│   │    scheduler:leader:lock       │ │
│   └────────────────────────────────┘ │
│              │              │         │
└──────────────┴──────────────┴─────────┘
```

### Setting Up Distributed Scheduling

**1. Enable in Configuration:**

```typescript
const schedulerModule = new SchedulerModuleBuilder()
  .setQueueManager(queueManager)
  .setEventBus(eventBus)
  .enableDistributed(true)
  .setRedisConfig({
    host: 'redis.example.com',
    port: 6379,
    password: process.env.REDIS_PASSWORD,
    db: 0
  })
  .build();
```

**2. Mark Jobs as Distributed:**

```typescript
class DataProcessingService {
  // Only leader executes this
  @Cron('0 2 * * *', { 
    timezone: 'UTC',
    distributed: true,
    queueName: 'nightly-processing'
  })
  async processNightlyData() {
    // Heavy data processing - only runs once across cluster
  }

  // All instances execute this
  @Interval(60 * 1000)
  async localHealthCheck() {
    // Light health check - runs on all instances
  }
}
```

**3. Verify Leader Status:**

```typescript
const scheduler = getGlobalScheduler();

// Check if current instance is leader
if (scheduler.isLeader()) {
  console.log('This instance is the leader, executing distributed jobs');
} else {
  console.log('This instance is a follower, skipping distributed jobs');
}

// Check stats
const stats = scheduler.getStats();
console.log(`Is leader: ${stats.isLeader}`);
console.log(`Distributed jobs: ${stats.distributedJobs}`);
```

### Distributed Job Best Practices

- **Use distributed for resource-heavy jobs**: Data processing, report generation, bulk operations
- **Use local (non-distributed) for monitoring**: Health checks, status updates on all instances
- **Set appropriate queue names**: Helps with tracking and debugging
- **Monitor leader changes**: Log when leadership transfers for operational visibility
- **Test failover**: Simulate instance failures to verify leader election works

### Handling Leader Failover

```typescript
eventBus.on('scheduler:distributed:leader-change', async (data) => {
  console.log(`Leadership transferred to instance: ${data.newLeader}`);
  
  // Optional: trigger cleanup or sync on new leader
  if (data.isCurrentInstanceNewLeader) {
    await performLeaderInitialization();
  }
});
```

## Common Patterns and Examples

### Pattern 1: Daily Reports

Generate and send reports at specific times across timezones:

```typescript
class ReportService {
  @Cron('0 8 * * 1-5', { timezone: 'Australia/Sydney' })
  async generateDailyReport() {
    const report = await this.buildReport();
    await this.sendEmail('manager@example.com', report);
    await this.archiveReport(report);
  }

  private async buildReport() {
    // Report generation logic
  }

  private async sendEmail(to: string, report: any) {
    // Email sending logic
  }

  private async archiveReport(report: any) {
    // Archive logic
  }
}
```

### Pattern 2: Periodic Data Sync

Keep data synchronized across services:

```typescript
class SyncService {
  @Interval(5 * 60 * 1000) // Every 5 minutes
  async syncExternalData() {
    try {
      const remoteData = await this.fetchFromExternalAPI();
      await this.updateLocalDatabase(remoteData);
      console.log('Sync completed successfully');
    } catch (error) {
      console.error('Sync failed:', error);
      // Event system will handle error notification
    }
  }

  private async fetchFromExternalAPI() {
    // API call logic
  }

  private async updateLocalDatabase(data: any) {
    // Database update logic
  }
}
```

### Pattern 3: Cleanup and Maintenance

Periodic maintenance tasks:

```typescript
class MaintenanceService {
  // Clean old logs daily at 3 AM
  @Cron('0 3 * * *')
  async cleanOldLogs() {
    const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await this.deleteLogsOlderThan(cutoffDate);
  }

  // Optimize database weekly
  @Cron('0 2 * * 0', { timezone: 'UTC' }) // Sunday 2 AM
  async optimizeDatabase() {
    await this.runDatabaseOptimization();
  }

  // Archive data monthly
  @Cron('0 1 1 * *') // First day of month at 1 AM
  async archiveOldData() {
    await this.moveArchivedData();
  }
}
```

### Pattern 4: Queue-Based Processing

Leverage the scheduler with queue manager for scalable processing:

```typescript
class ProcessingService {
  // Trigger processing every 10 minutes
  @Interval(10 * 60 * 1000)
  async triggerBatchProcessing() {
    // Get items to process
    const items = await this.getUnprocessedItems();
    
    // Queue each item
    for (const item of items) {
      await this.queueManager.addJob('process-item', { itemId: item.id });
    }
    
    console.log(`Queued ${items.length} items for processing`);
  }

  private async getUnprocessedItems() {
    // Database query logic
  }
}
```

### Pattern 5: Monitoring with Conditional Logic

Execute different logic based on conditions:

```typescript
class MonitoringService {
  @Interval(60 * 1000) // Every minute
  async monitorSystemHealth() {
    const health = await this.checkSystemHealth();
    
    if (health.cpuUsage > 80) {
      await this.alertHighCPU(health.cpuUsage);
    }
    
    if (health.memoryUsage > 90) {
      await this.alertHighMemory(health.memoryUsage);
    }
    
    if (!health.isHealthy) {
      await this.triggerIncident(health);
    }
  }

  private async checkSystemHealth() {
    // Health check logic
  }

  private async alertHighCPU(usage: number) {
    // Alert logic
  }

  private async alertHighMemory(usage: number) {
    // Alert logic
  }

  private async triggerIncident(health: any) {
    // Incident creation logic
  }
}
```

### Pattern 6: Delayed Notifications

Send notifications after a delay:

```typescript
class NotificationService {
  @Timeout(1 * 60 * 60 * 1000) // 1 hour
  async sendDelayedFollowUp() {
    const users = await this.getInactiveUsers();
    
    for (const user of users) {
      await this.sendFollowUpEmail(user);
    }
  }

  // Or use interval for periodic follow-ups
  @Interval(24 * 60 * 60 * 1000) // Daily
  async sendDailyReminders() {
    const reminders = await this.getPendingReminders();
    
    for (const reminder of reminders) {
      await this.sendReminder(reminder);
    }
  }
}
```

### Pattern 7: Cascading Jobs

Schedule dependent jobs:

```typescript
class PipelineService {
  @Cron('0 0 * * *') // Daily at midnight
  async startDailyPipeline() {
    // Step 1: Data collection
    await this.collectData();
    console.log('Data collection complete');
    
    // Step 2: Processing (queued for execution)
    await this.queueManager.addJob('process-daily-data', {});
    
    // Step 3: Report generation (scheduled for later)
    this.scheduleReportGeneration();
  }

  @Timeout(2 * 60 * 60 * 1000) // 2 hours after start
  async generateDailyReport() {
    const processedData = await this.getProcessedData();
    await this.createAndDistributeReport(processedData);
  }

  private scheduleReportGeneration() {
    // Implementation for scheduling next step
  }
}
```

## Advanced Topics

### Custom Concurrency Control

Control how multiple executions of the same job are handled:

```typescript
class LongRunningService {
  // Skip execution if already running (default)
  @Cron('*/15 * * * *', { concurrency: 'skip' })
  async frequentTask() {
    // If this takes >15 minutes, next execution is skipped
  }

  // Allow unlimited concurrent executions
  @Interval(5 * 60 * 1000, { concurrency: 'unlimited' })
  async independentTasks() {
    // Multiple executions can run simultaneously
  }
}
```

### Accessing Job Context

Within your job handler, access context information:

```typescript
class ContextAwareService {
  async executeTask() {
    // Your scheduler automatically tracks:
    // - executionCount: How many times job has run
    // - lastRunAt: When job last executed
    // - nextRunAt: When job will next run
    // - createdAt: When job was registered
    
    const job = scheduler.getJobByName('TaskService.executeTask');
    console.log(`Execution count: ${job.executionCount}`);
    console.log(`Last run: ${job.lastRunAt}`);
    console.log(`Next run: ${job.nextRunAt}`);
  }
}
```

### Error Handling and Recovery

Implement robust error handling:

```typescript
class RobustJobService {
  @Cron('0 */6 * * *') // Every 6 hours
  async robustTask() {
    const maxRetries = 3;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.executeTaskLogic();
        return; // Success
      } catch (error) {
        lastError = error;
        console.warn(`Attempt ${attempt} failed:`, error);
        
        if (attempt < maxRetries) {
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries exhausted
    throw new Error(`Task failed after ${maxRetries} attempts: ${lastError}`);
  }

  private async executeTaskLogic() {
    // Task implementation
  }
}
```

## Troubleshooting

### Job Not Executing

1. **Check if scheduler is initialized:**
   ```typescript
   const scheduler = getGlobalScheduler();
   await scheduler.initialize();
   ```

2. **Verify job is enabled:**
   ```typescript
   const job = scheduler.getJob(jobId);
   console.log(`Enabled: ${job.enabled}`);
   ```

3. **Check cron expression validity:**
   ```typescript
   import { CronManager } from '@framework/core';
   const isValid = CronManager.validateExpression('0 2 * * *');
   ```

4. **Review event logs:**
   ```typescript
   eventBus.on('scheduler:job:error', (data) => {
     console.error(`Job error: ${data.error}`);
   });
   ```

### Distributed Jobs Not Running

1. **Verify Redis connectivity:**
   ```typescript
   const isLeader = scheduler.isLeader();
   console.log(`Is leader: ${isLeader}`);
   ```

2. **Check Redis configuration:**
   - Verify host, port, password
   - Ensure Redis is running and accessible

3. **Review distributed settings:**
   ```typescript
   const stats = scheduler.getStats();
   console.log(`Distributed jobs: ${stats.distributedJobs}`);
   ```

### High CPU Usage from Frequent Checks

Adjust check interval to balance responsiveness vs. CPU usage:

```typescript
// Less frequent checks (higher latency, lower CPU)
.setCheckInterval(5000) // Check every 5 seconds

// More frequent checks (lower latency, higher CPU)
.setCheckInterval(500)  // Check every 500ms
```

## Performance Optimization

### Best Practices

1. **Use appropriate check intervals**: Balance between job latency and CPU usage
2. **Limit concurrent executions**: Set reasonable maxConcurrency values
3. **Use distributed scheduling**: Prevent duplicate execution across instances
4. **Queue heavy jobs**: Offload processing to dedicated queue workers
5. **Monitor job duration**: Track execution time to identify slow jobs
6. **Clean up old jobs**: Periodically remove completed timeout jobs

### Monitoring Performance

```typescript
const scheduler = getGlobalScheduler();

// Get comprehensive statistics
const stats = scheduler.getStats();
console.log(`Total executions: ${stats.totalExecutions}`);
console.log(`Active jobs: ${stats.enabledJobs}`);

// Monitor individual job performance
eventBus.on('scheduler:job:triggered', (data) => {
  console.time(`job-${data.jobId}`);
});

eventBus.on('scheduler:job:queued', (data) => {
  console.timeEnd(`job-${data.jobId}`);
});
```

## API Reference

See the full API reference at `/packages/core/src/scheduler/` for:
- `Scheduler` class
- `SchedulerRegistry` class  
- `CronManager` utility
- `DistributedCoordinator` class
- Decorator functions (`@Cron`, `@Interval`, `@Timeout`)

## Examples

For complete working examples, see:
- `examples/scheduler-example.ts` - Basic scheduler setup and usage
- `examples/scheduler-distributed.ts` - Distributed scheduling example
- `examples/scheduler-events.ts` - Event system integration

## Support

For issues, questions, or contributions:
- Check the [Framework Documentation](../README.md)
- Review [Scheduler Implementation Plan](./superpowers/plans/2026-05-27-scheduler-implementation.md)
- Check [Scheduler Design Spec](./superpowers/specs/2026-05-27-scheduler-design.md)
