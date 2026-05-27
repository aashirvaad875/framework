import {
  QueueManager,
  Job,
  JobDecoratorOptions,
  Job as JobDecorator,
  OnJobComplete,
  OnJobFailed,
  OnJobProgress,
  RetryHandler,
  QueueMonitor,
  QueueModule,
  QueueModuleBuilder,
} from '@framework/core';
import { Redis } from 'ioredis';

// Example 1: Basic queue setup
async function basicQueueSetup() {
  const redis = new Redis({
    host: 'localhost',
    port: 6379,
  });

  const queueManager = QueueManager.createBullMQ(redis, {
    name: 'email',
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    },
  });

  await queueManager.initialize();
  return queueManager;
}

// Example 2: Adding jobs to queue
async function addingJobs(queueManager: QueueManager) {
  // Single job
  const job = await queueManager.addJob('send-email', {
    to: 'user@example.com',
    subject: 'Welcome!',
    body: 'Welcome to our service',
  });

  console.log(`Job added: ${job.id}`);

  // Job with options
  const delayedJob = await queueManager.addJob(
    'send-email',
    {
      to: 'user@example.com',
      subject: 'Reminder',
    },
    {
      delay: 3600000, // 1 hour
      attempts: 5,
    }
  );

  // Bulk jobs
  const bulkJobs = await queueManager.addJobs([
    {
      name: 'send-email',
      data: { to: 'user1@example.com', subject: 'Hello' },
      options: { priority: 1 },
    },
    {
      name: 'send-email',
      data: { to: 'user2@example.com', subject: 'Hi' },
      options: { priority: 2 },
    },
  ]);

  return { job, delayedJob, bulkJobs };
}

// Example 3: Processing jobs
async function processingJobs(queueManager: QueueManager) {
  // Register processor
  queueManager.registerProcessor('send-email', async (job: any) => {
    console.log(`Processing email job ${job.id}:`, job.data);

    // Simulate email sending
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Update progress
    job.progress = 50;

    // More processing
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return { success: true, messageId: 'msg-123' };
  });

  // Start processing
  await queueManager.startProcessing('send-email', {
    concurrency: 5,
  });
}

// Example 4: Event handling
async function eventHandling(queueManager: QueueManager) {
  // Listen to job completion
  queueManager.on('completed', (job: any) => {
    console.log(`Job ${job.id} completed`);
  });

  // Listen to job failure
  queueManager.on('failed', (job: any, error: Error) => {
    console.log(`Job ${job.id} failed:`, error.message);
  });

  // Listen to progress
  queueManager.on('progress', (job: any) => {
    console.log(`Job ${job.id} progress:`, job.progress);
  });

  // Listen to retry
  queueManager.on('retry', (job: any) => {
    console.log(`Job ${job.id} retrying. Attempt ${job.attempts}`);
  });

  // Listen to stalled
  queueManager.on('stalled', (job: any) => {
    console.log(`Job ${job.id} stalled`);
  });
}

// Example 5: Retry handling
async function retryPolicies() {
  // Exponential backoff (1s, 2s, 4s, 8s...)
  const exponentialPolicy = RetryHandler.createExponentialPolicy(
    3, // max retries
    1000, // base delay (1s)
    60000 // max delay (1 min)
  );

  // Linear backoff (5s, 10s, 15s...)
  const linearPolicy = RetryHandler.createLinearPolicy(
    3, // max retries
    5000, // base delay (5s)
    30000 // max delay (30s)
  );

  // Fixed delay (5s, 5s, 5s...)
  const fixedPolicy = RetryHandler.createFixedPolicy(
    3, // max retries
    5000 // delay (5s)
  );

  // Calculate delay for specific attempt
  const delay = RetryHandler.getRetryDelay(exponentialPolicy, 2);
  console.log(`Delay for attempt 2: ${delay}ms`);
}

// Example 6: Queue monitoring
async function queueMonitoring(queueManager: QueueManager) {
  const monitor = new QueueMonitor(queueManager);

  // Get health status
  const health = await monitor.getHealth();
  console.log('Queue Health:', health.status);
  console.log('Failure Rate:', health.failureRate + '%');
  console.log('Recommendations:', health.recommendations);

  // Capture metrics
  const metrics = await monitor.captureMetrics();
  console.log('Metrics:', metrics);

  // Get metrics history
  const history = monitor.getMetricsHistory(10);
  console.log('Recent metrics:', history.length, 'entries');

  // Identify issues
  const slowJobs = await monitor.identifySlowJobs(30000); // > 30s
  console.log('Slow jobs:', slowJobs.length);

  const failingJobs = await monitor.identifyFailingJobs(3);
  console.log('Failing jobs:', failingJobs.length);

  // Generate report
  const report = await monitor.generateReport();
  console.log(report);
}

// Example 7: Service with @Job decorator
class EmailService {
  @JobDecorator({ name: 'send-email', attempts: 5 })
  async sendEmail(to: string, subject: string, body: string) {
    console.log(`Sending email to ${to}`);
    // Send email logic
    return { success: true };
  }

  @OnJobComplete()
  onEmailSent(job: any) {
    console.log(`Email sent: ${job.id}`);
  }

  @OnJobFailed()
  onEmailFailed(job: any) {
    console.log(`Email failed: ${job.id}`);
  }
}

// Example 8: Queue module with DI
function setupQueueModule() {
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

  return queueModule;
}

// Example 9: Job with delay and priority
async function jobsWithOptions(queueManager: QueueManager) {
  // High priority job
  await queueManager.addJob(
    'critical-email',
    { to: 'admin@example.com', subject: 'Alert' },
    { priority: 1 } // High priority
  );

  // Delayed job (run in 1 hour)
  await queueManager.addJob(
    'send-digest',
    { userId: '123' },
    { delay: 3600000 }
  );

  // Job with custom timeout
  await queueManager.addJob(
    'process-video',
    { videoId: '456' },
    { timeout: 600000 } // 10 minutes
  );
}

// Example 10: Queue control
async function queueControl(queueManager: QueueManager) {
  // Get queue stats
  const stats = await queueManager.getStats();
  console.log('Queue stats:', stats);

  // Pause queue (stop processing new jobs)
  await queueManager.pause();
  console.log('Queue paused');

  // Resume queue
  await queueManager.resume();
  console.log('Queue resumed');

  // Clean completed jobs older than 1 hour
  const cleaned = await queueManager.clean(3600000);
  console.log(`Cleaned ${cleaned} jobs`);

  // Drain queue (delete all jobs)
  // await queueManager.drain();
  // console.log('Queue drained');
}

// Example 11: Getting job information
async function jobInformation(queueManager: QueueManager) {
  // Get specific job
  const job = await queueManager.getJob('job-id-123');
  if (job) {
    console.log('Job:', {
      id: job.id,
      status: job.status,
      progress: job.progress,
      attempts: job.attempts,
      error: job.failedReason,
    });
  }

  // Get all waiting jobs
  const waitingJobs = await queueManager.getJobs(['waiting']);
  console.log(`Waiting jobs: ${waitingJobs.length}`);

  // Get all failed jobs
  const failedJobs = await queueManager.getJobs(['failed']);
  console.log(`Failed jobs: ${failedJobs.length}`);
}

// Example 12: Cleanup
async function cleanup(queueManager: QueueManager) {
  // Close queue manager
  await queueManager.close();
  console.log('Queue manager closed');
}
