# Enterprise Queue System

The framework provides a production-grade queue system built on BullMQ for reliable job processing with retries, delayed jobs, and comprehensive monitoring.

## Features

- **BullMQ Integration** - Reliable job queuing with Redis backend
- **Job Decorators** - Declarative job definitions with @Job, @OnJobComplete, etc.
- **Retry Handling** - Exponential, linear, and fixed backoff strategies
- **Delayed Jobs** - Schedule jobs for future execution
- **Job Monitoring** - Real-time health checks and performance metrics
- **Circuit Breaker** - Prevent cascading failures
- **Dead Letter Queue** - Track permanently failed jobs
- **Bulk Operations** - Add multiple jobs efficiently
- **Event Handling** - Listen to job progress, completion, and failures

## Quick Start

```typescript
import { QueueManager, QueueModule, QueueModuleBuilder } from '@framework/core';
import { Redis } from 'ioredis';

// Create queue manager
const redis = new Redis('localhost:6379');
const queueManager = QueueManager.createBullMQ(redis, {
  name: 'email',
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  },
});

await queueManager.initialize();

// Add job
const job = await queueManager.addJob('send-email', {
  to: 'user@example.com',
  subject: 'Hello',
});

// Process jobs
queueManager.registerProcessor('send-email', async (job) => {
  await sendEmail(job.data);
  return { success: true };
});

await queueManager.startProcessing('send-email', { concurrency: 5 });
```

## Job Management

### Adding Jobs

```typescript
// Single job
const job = await queueManager.addJob('send-email', {
  to: 'user@example.com',
  subject: 'Welcome!',
});

// Job with options
const delayedJob = await queueManager.addJob(
  'send-email',
  { to: 'user@example.com' },
  {
    delay: 3600000,      // 1 hour delay
    attempts: 5,         // Retry up to 5 times
    priority: 1,         // High priority
    timeout: 30000,      // 30 second timeout
  }
);

// Bulk jobs
const jobs = await queueManager.addJobs([
  {
    name: 'send-email',
    data: { to: 'user1@example.com' },
    options: { priority: 1 },
  },
  {
    name: 'send-email',
    data: { to: 'user2@example.com' },
    options: { priority: 2 },
  },
]);
```

### Job Options

| Option | Type | Description |
|--------|------|-------------|
| `attempts` | number | Number of retry attempts (default: 3) |
| `backoff` | object | Retry backoff strategy |
| `delay` | number | Delay before job starts (milliseconds) |
| `priority` | number | Lower number = higher priority |
| `timeout` | number | Job timeout (milliseconds) |
| `removeOnComplete` | boolean | Auto-remove after completion |
| `removeOnFail` | boolean | Auto-remove after failure |

## Processing Jobs

### Basic Processor

```typescript
queueManager.registerProcessor('send-email', async (job) => {
  console.log(`Processing ${job.id}`);
  
  // Do work
  const result = await sendEmail(job.data);
  
  // Return result
  return result;
});

// Start processing
await queueManager.startProcessing('send-email', {
  concurrency: 5,  // Process 5 jobs in parallel
});
```

### Progress Tracking

```typescript
queueManager.registerProcessor('process-video', async (job) => {
  const steps = 100;
  
  for (let i = 0; i < steps; i++) {
    // Do work
    job.progress = (i / steps) * 100;
    
    // Progress is automatically reported
    await delay(100);
  }
  
  return { videoId: job.data.videoId };
});

// Listen to progress
queueManager.on('progress', (job) => {
  console.log(`Job ${job.id} progress: ${job.progress}%`);
});
```

## Event Handling

```typescript
// Job completed
queueManager.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

// Job failed
queueManager.on('failed', (job, error) => {
  console.log(`Job ${job.id} failed: ${error.message}`);
});

// Job retrying
queueManager.on('retry', (job) => {
  console.log(`Job ${job.id} retrying. Attempt ${job.attempts}`);
});

// Job stalled
queueManager.on('stalled', (job) => {
  console.log(`Job ${job.id} stalled`);
});

// Job progress
queueManager.on('progress', (job) => {
  console.log(`Job ${job.id} progress: ${job.progress}%`);
});
```

## Decorators

### @Job

Define a job with decorator:

```typescript
class EmailService {
  @Job({ name: 'send-email', attempts: 5 })
  async sendEmail(to: string, subject: string) {
    // Job processing logic
  }
}
```

### Event Handlers

```typescript
class EmailService {
  @OnJobComplete()
  onEmailSent(job: Job) {
    logger.info(`Email sent: ${job.id}`);
  }

  @OnJobFailed()
  onEmailFailed(job: Job) {
    logger.error(`Email failed: ${job.id}`, job.failedReason);
  }

  @OnJobProgress()
  onProgress(job: Job) {
    logger.debug(`Job ${job.id} progress: ${job.progress}%`);
  }

  @OnJobRetry()
  onRetry(job: Job) {
    logger.warn(`Job ${job.id} retrying`);
  }

  @OnJobStalled()
  onStalled(job: Job) {
    logger.error(`Job ${job.id} stalled`);
  }
}
```

## Retry Strategies

### Exponential Backoff

Delay doubles with each attempt: 1s, 2s, 4s, 8s...

```typescript
const policy = RetryHandler.createExponentialPolicy(
  3,      // max retries
  1000,   // base delay (1s)
  60000   // max delay (1 min)
);

const delay = RetryHandler.getRetryDelay(policy, 2); // 2000ms
```

### Linear Backoff

Delay increases linearly: 5s, 10s, 15s...

```typescript
const policy = RetryHandler.createLinearPolicy(
  3,      // max retries
  5000,   // base delay (5s)
  30000   // max delay (30s)
);
```

### Fixed Backoff

Same delay each time: 5s, 5s, 5s...

```typescript
const policy = RetryHandler.createFixedPolicy(
  3,      // max retries
  5000    // delay (5s)
);
```

### Custom Calculation

```typescript
const delay = RetryHandler.calculateDelay(
  {
    backoffStrategy: 'exponential',
    baseDelay: 2000,
    maxDelay: 120000,
    jitter: true,
  },
  2  // attempt number
);
```

## Monitoring & Health

### Queue Health

```typescript
const monitor = new QueueMonitor(queueManager);

const health = await monitor.getHealth();
// Returns: { status, stats, avgProcessingTime, failureRate, recommendations }

if (health.status === 'critical') {
  console.log('Queue is degraded:', health.recommendations);
}
```

### Metrics

```typescript
const metrics = await monitor.captureMetrics();
// Returns: { timestamp, stats, processingRate, failureRate, avgProcessingTime }

// Get metrics history
const history = monitor.getMetricsHistory(100); // Last 100 captures
```

### Identifying Issues

```typescript
// Find slow jobs (> 30 seconds)
const slowJobs = await monitor.identifySlowJobs(30000);

// Find repeatedly failing jobs
const failingJobs = await monitor.identifyFailingJobs(5);

// Get queue size
const size = await monitor.getQueueSize();

// Get oldest pending job age
const age = await monitor.getAgeOfOldestJob();
```

### Health Report

```typescript
const report = await monitor.generateReport();
console.log(report);
// Outputs formatted health report with stats and recommendations
```

## Circuit Breaker

Prevent cascading failures:

```typescript
const breaker = new CircuitBreaker(
  5,      // failure threshold
  60000   // reset timeout (1 minute)
);

try {
  await breaker.execute(async () => {
    return await queueManager.addJob('task', data);
  });
} catch (error) {
  console.log('Circuit breaker is open');
}

// Reset when ready
breaker.reset();
```

## Dead Letter Queue

Track permanently failed jobs:

```typescript
const dlq = new DeadLetterQueue();

queueManager.on('failed', (job, error) => {
  if (job.attempts >= job.maxAttempts) {
    dlq.add(job.id, job, error);
  }
});

// Get dead letters
const deadLetters = dlq.getAll();

// Remove from DLQ
dlq.remove(jobId);

// Clear all
dlq.clear();
```

## Queue Control

```typescript
// Get statistics
const stats = await queueManager.getStats();
// { waiting, active, completed, failed, delayed, paused, totalProcessed, totalFailed }

// Pause queue (no new processing)
await queueManager.pause();

// Resume queue
await queueManager.resume();

// Clean completed jobs older than 1 hour
const cleaned = await queueManager.clean(3600000);

// Drain entire queue
await queueManager.drain();

// Close queue
await queueManager.close();
```

## Module Integration

```typescript
import { QueueModuleBuilder } from '@framework/core';

const queueModule = new QueueModuleBuilder()
  .setRedis({
    host: 'localhost',
    port: 6379,
  })
  .addQueue({
    name: 'email',
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    },
  })
  .addQueue({
    name: 'notifications',
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: 'fixed', delay: 5000 },
    },
  })
  .setGlobal(true)
  .build();

// Register in app
app.use(queueModule);
```

## Job Structure

```typescript
interface Job<T = any> {
  id: string;              // Unique job ID
  name: string;            // Job name
  data: T;                 // Job data
  progress: number;        // 0-100
  status: JobStatus;       // waiting, active, completed, failed, etc.
  attempts: number;        // Attempts made so far
  maxAttempts: number;     // Total attempts allowed
  failedReason?: string;   // Error message if failed
  stackTrace?: string[];   // Error stack trace
  delay?: number;          // Delay in ms
  timestamp: number;       // Job creation time
  processedOn?: number;    // When processing started
  finishedOn?: number;     // When job finished
}
```

## Best Practices

1. **Set Appropriate Timeouts** - Prevent long-running jobs from blocking
2. **Use Priorities** - Ensure critical jobs are processed first
3. **Monitor Health** - Regularly check queue health and metrics
4. **Implement Backoff** - Use exponential backoff for retries
5. **Handle Dead Letters** - Track permanently failed jobs
6. **Log Events** - Listen to job events for observability
7. **Set Concurrency** - Balance throughput with resource usage
8. **Clean Completed Jobs** - Remove old jobs to manage Redis memory
9. **Use Delayed Jobs** - Schedule future tasks efficiently
10. **Test Processors** - Test job handlers independently

## Common Patterns

### Retry Failed Jobs

```typescript
const failedJobs = await queueManager.getJobs(['failed']);
for (const job of failedJobs) {
  await queueManager.addJob(job.name, job.data);
}
```

### Schedule Daily Task

```typescript
// Run every day at midnight
const now = new Date();
const tomorrow = new Date(now);
tomorrow.setDate(tomorrow.getDate() + 1);
tomorrow.setHours(0, 0, 0, 0);

const delay = tomorrow.getTime() - now.getTime();

await queueManager.addJob('daily-report', {}, { delay });
```

### Priority Queue

```typescript
// Urgent emails (priority 1)
await queueManager.addJob('send-email', data, { priority: 1 });

// Normal emails (priority 5)
await queueManager.addJob('send-email', data, { priority: 5 });

// Low priority emails (priority 10)
await queueManager.addJob('send-email', data, { priority: 10 });
```

## Troubleshooting

### Jobs Not Processing
- Check if workers are running: `await queueManager.startProcessing(jobName)`
- Verify Redis connection is active
- Check queue pause status: `await queueManager.resume()`

### High Failure Rate
- Check processor error logs
- Adjust timeout settings
- Review retry strategy
- Check external service availability

### Memory Issues
- Clean completed jobs regularly
- Reduce job retention settings
- Monitor Redis memory usage
- Consider archiving old jobs

### Performance Degradation
- Monitor queue health: `await monitor.getHealth()`
- Increase worker concurrency
- Scale Redis cluster
- Review job processing time
