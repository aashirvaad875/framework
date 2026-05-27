/**
 * Scheduler Examples
 * Comprehensive examples demonstrating all scheduler features and patterns
 * Framework: @framework/core
 */

import 'reflect-metadata';
import {
  Scheduler,
  Cron,
  Interval,
  Timeout,
  setGlobalScheduler,
  getGlobalScheduler,
  SchedulerModule,
  SchedulerModuleBuilder,
} from '@framework/core';

// =============================================================================
// Example 1: Basic Cron Job (@Cron decorator)
// =============================================================================

class BasicCronExample {
  /**
   * Run a task at a specific time using cron expression
   * This example runs every day at 9:00 AM
   */
  @Cron('0 9 * * *', { timezone: 'America/New_York' })
  async dailyReportJob() {
    console.log('[BasicCron] Generating daily report at', new Date().toISOString());
    // Simulate report generation
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log('[BasicCron] Report generated successfully');
  }
}

export async function exampleBasicCronJob() {
  console.log('\n=== Example 1: Basic Cron Job ===');

  const scheduler = new Scheduler({
    checkInterval: 1000,
    maxConcurrency: 10,
    queueManager: {
      addJob: async () => 'queue-job-id',
    },
  });

  const instance = new BasicCronExample();
  scheduler.registerJobsFromInstance(instance);

  await scheduler.initialize();
  console.log('Scheduler initialized with cron job');
  console.log('Jobs registered:', scheduler.listJobs());

  // Let it run for a bit
  await new Promise((resolve) => setTimeout(resolve, 2000));

  await scheduler.shutdown();
  console.log('Example 1 completed\n');
}

// =============================================================================
// Example 2: Interval Job (@Interval decorator)
// =============================================================================

class IntervalJobExample {
  private counter = 0;

  /**
   * Run a task at regular intervals
   * This example runs every 5 seconds
   */
  @Interval(5000)
  async healthCheckJob() {
    this.counter++;
    console.log(`[IntervalJob] Health check #${this.counter} at ${new Date().toISOString()}`);
    console.log('[IntervalJob] System is healthy');
  }
}

export async function exampleIntervalJob() {
  console.log('\n=== Example 2: Interval Job ===');

  const scheduler = new Scheduler({
    checkInterval: 500,
    maxConcurrency: 10,
    queueManager: {
      addJob: async () => 'queue-job-id',
    },
  });

  const instance = new IntervalJobExample();
  scheduler.registerJobsFromInstance(instance);

  await scheduler.initialize();
  console.log('Scheduler initialized with interval job (5 second interval)');

  // Run for 12 seconds to see multiple executions
  await new Promise((resolve) => setTimeout(resolve, 12000));

  await scheduler.shutdown();
  console.log('Example 2 completed\n');
}

// =============================================================================
// Example 3: Timeout Job (@Timeout decorator)
// =============================================================================

class TimeoutJobExample {
  /**
   * Run a task once after a delay
   * This example runs 3 seconds after scheduler initialization
   */
  @Timeout(3000)
  async delayedStartupTask() {
    console.log('[TimeoutJob] Delayed startup task executed at', new Date().toISOString());
    console.log('[TimeoutJob] This task runs only once');
  }
}

export async function exampleTimeoutJob() {
  console.log('\n=== Example 3: Timeout Job ===');

  const scheduler = new Scheduler({
    checkInterval: 500,
    maxConcurrency: 10,
    queueManager: {
      addJob: async () => 'queue-job-id',
    },
  });

  const instance = new TimeoutJobExample();
  scheduler.registerJobsFromInstance(instance);

  await scheduler.initialize();
  console.log('Scheduler initialized with timeout job (3 second delay)');

  // Wait for the timeout job to execute
  await new Promise((resolve) => setTimeout(resolve, 5000));

  await scheduler.shutdown();
  console.log('Example 3 completed\n');
}

// =============================================================================
// Example 4: Multiple Jobs in One Class
// =============================================================================

class MultipleJobsExample {
  @Cron('*/30 * * * * *', { timezone: 'UTC' })
  async everyThirtySecondsJob() {
    console.log('[MultiJob1] Every 30 seconds:', new Date().toISOString());
  }

  @Interval(10000)
  async tenSecondIntervalJob() {
    console.log('[MultiJob2] Every 10 seconds:', new Date().toISOString());
  }

  @Timeout(2000)
  async startupTask() {
    console.log('[MultiJob3] Startup task executed at:', new Date().toISOString());
  }
}

export async function exampleMultipleJobs() {
  console.log('\n=== Example 4: Multiple Jobs in One Class ===');

  const scheduler = new Scheduler({
    checkInterval: 500,
    maxConcurrency: 10,
    queueManager: {
      addJob: async () => 'queue-job-id',
    },
  });

  const instance = new MultipleJobsExample();
  scheduler.registerJobsFromInstance(instance);

  await scheduler.initialize();
  console.log('Scheduler initialized with 3 different job types');
  console.log('Total jobs registered:', scheduler.listJobs().length);

  await new Promise((resolve) => setTimeout(resolve, 15000));

  await scheduler.shutdown();
  console.log('Example 4 completed\n');
}

// =============================================================================
// Example 5: Timezone-Aware Cron Scheduling
// =============================================================================

class TimezoneAwareExample {
  @Cron('0 9 * * 1-5', { timezone: 'Europe/London' })
  async weekdayMorningJob() {
    console.log('[Timezone] Weekday job (Europe/London):', new Date().toISOString());
  }

  @Cron('0 6 * * *', { timezone: 'Asia/Tokyo' })
  async tokyoMorningJob() {
    console.log('[Timezone] Tokyo morning job (Asia/Tokyo):', new Date().toISOString());
  }

  @Cron('0 0 * * 0', { timezone: 'America/Los_Angeles' })
  async sundayMidnightJob() {
    console.log('[Timezone] Sunday midnight (America/Los_Angeles):', new Date().toISOString());
  }
}

export async function exampleTimezoneAware() {
  console.log('\n=== Example 5: Timezone-Aware Cron Scheduling ===');

  const scheduler = new Scheduler({
    checkInterval: 1000,
    maxConcurrency: 10,
    queueManager: {
      addJob: async () => 'queue-job-id',
    },
  });

  const instance = new TimezoneAwareExample();
  scheduler.registerJobsFromInstance(instance);

  await scheduler.initialize();
  console.log('Scheduler initialized with timezone-aware jobs');
  const jobs = scheduler.listJobs();
  jobs.forEach((job) => {
    console.log(`- ${job.name} (timezone: ${job.timezone})`);
  });

  await new Promise((resolve) => setTimeout(resolve, 2000));

  await scheduler.shutdown();
  console.log('Example 5 completed\n');
}

// =============================================================================
// Example 6: Job Control (pause, resume, cancel)
// =============================================================================

class JobControlExample {
  private counter = 0;

  @Interval(2000)
  async controllableJob() {
    this.counter++;
    console.log(`[JobControl] Job execution #${this.counter}`);
  }
}

export async function exampleJobControl() {
  console.log('\n=== Example 6: Job Control (pause, resume, cancel) ===');

  const scheduler = new Scheduler({
    checkInterval: 500,
    maxConcurrency: 10,
    queueManager: {
      addJob: async () => 'queue-job-id',
    },
  });

  const instance = new JobControlExample();
  scheduler.registerJobsFromInstance(instance);

  await scheduler.initialize();

  const job = scheduler.getJobByName('JobControlExample.controllableJob');
  console.log('Job registered:', job?.name);

  // Let it run for 4 seconds
  await new Promise((resolve) => setTimeout(resolve, 4000));

  // Pause the job
  if (job) {
    scheduler.pauseJob(job.id);
    console.log('Job paused');
  }

  await new Promise((resolve) => setTimeout(resolve, 3000));
  console.log('Job is paused (should see no executions)');

  // Resume the job
  if (job) {
    scheduler.resumeJob(job.id);
    console.log('Job resumed');
  }

  await new Promise((resolve) => setTimeout(resolve, 3000));
  console.log('Job resumed (executions should resume)');

  // Cancel the job
  if (job) {
    scheduler.cancelJob(job.id);
    console.log('Job cancelled');
  }

  await new Promise((resolve) => setTimeout(resolve, 2000));

  await scheduler.shutdown();
  console.log('Example 6 completed\n');
}

// =============================================================================
// Example 7: Job Statistics
// =============================================================================

class StatsExample {
  private counter = 0;

  @Cron('*/10 * * * * *', { timezone: 'UTC' })
  async statsJob() {
    this.counter++;
    console.log(`[Stats] Execution #${this.counter}`);
  }

  @Interval(5000)
  async intervalStatsJob() {
    console.log('[Stats] Interval job running');
  }
}

export async function exampleJobStatistics() {
  console.log('\n=== Example 7: Job Statistics ===');

  const scheduler = new Scheduler({
    checkInterval: 500,
    maxConcurrency: 10,
    queueManager: {
      addJob: async () => 'queue-job-id',
    },
  });

  const instance = new StatsExample();
  scheduler.registerJobsFromInstance(instance);

  await scheduler.initialize();

  // Run for 15 seconds and collect statistics
  for (let i = 0; i < 3; i++) {
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const stats = scheduler.getStats();
    console.log('Scheduler Stats:', {
      totalJobs: stats.totalJobs,
      enabledJobs: stats.enabledJobs,
      cronJobs: stats.cronJobs,
      intervalJobs: stats.intervalJobs,
      timeoutJobs: stats.timeoutJobs,
      totalExecutions: stats.totalExecutions,
      isLeader: stats.isLeader,
    });
  }

  // Get individual job stats
  const jobs = scheduler.listJobs();
  console.log('\nIndividual Job Stats:');
  jobs.forEach((job) => {
    console.log(`- ${job.name}:`, {
      type: job.type,
      enabled: job.enabled,
      executionCount: job.executionCount,
      lastRunAt: job.lastRunAt?.toISOString(),
      nextRunAt: job.nextRunAt?.toISOString(),
    });
  });

  await scheduler.shutdown();
  console.log('Example 7 completed\n');
}

// =============================================================================
// Example 8: Distributed Jobs
// =============================================================================

class DistributedJobExample {
  @Cron('0 * * * *', {
    timezone: 'UTC',
    distributed: true,
    queueName: 'distributed-hourly-job'
  })
  async distributedHourlyJob() {
    console.log('[Distributed] This job runs only on the leader node at:', new Date().toISOString());
    console.log('[Distributed] Performing distributed task...');
  }
}

export async function exampleDistributedJobs() {
  console.log('\n=== Example 8: Distributed Jobs ===');

  // Note: In a real scenario, you would have Redis configured for distributed coordination
  const scheduler = new Scheduler({
    checkInterval: 1000,
    maxConcurrency: 10,
    distributed: false, // Set to true with proper Redis config in production
    queueManager: {
      addJob: async () => 'queue-job-id',
    },
  });

  const instance = new DistributedJobExample();
  scheduler.registerJobsFromInstance(instance);

  await scheduler.initialize();

  const isLeader = scheduler.isLeader();
  console.log(`This scheduler instance is ${isLeader ? 'LEADER' : 'FOLLOWER'}`);

  const job = scheduler.getJobByName('DistributedJobExample.distributedHourlyJob');
  if (job) {
    console.log(`Job "${job.name}" is distributed: ${job.distributed}`);
    console.log('Distributed jobs only execute on the leader node in a cluster');
  }

  await new Promise((resolve) => setTimeout(resolve, 2000));

  await scheduler.shutdown();
  console.log('Example 8 completed\n');
}

// =============================================================================
// Example 9: Cron Expression Patterns
// =============================================================================

class CronPatternsExample {
  @Cron('0 0 * * *', { timezone: 'UTC' })
  async everyDay() {
    console.log('[CronPattern] Every day at midnight');
  }

  @Cron('0 0 1 * *', { timezone: 'UTC' })
  async everyMonth() {
    console.log('[CronPattern] First day of every month');
  }

  @Cron('0 0 0 * * 1', { timezone: 'UTC' })
  async everyMonday() {
    console.log('[CronPattern] Every Monday at midnight');
  }

  @Cron('*/15 * * * *', { timezone: 'UTC' })
  async everyFifteenMinutes() {
    console.log('[CronPattern] Every 15 minutes');
  }

  @Cron('0 9-17 * * 1-5', { timezone: 'UTC' })
  async businessHoursWeekdays() {
    console.log('[CronPattern] Every hour during business hours (9am-5pm) on weekdays');
  }

  @Cron('30 2 * * *', { timezone: 'UTC' })
  async customTime() {
    console.log('[CronPattern] Daily at 2:30 AM');
  }
}

export async function exampleCronExpressions() {
  console.log('\n=== Example 9: Cron Expression Patterns ===');

  const scheduler = new Scheduler({
    checkInterval: 1000,
    maxConcurrency: 10,
    queueManager: {
      addJob: async () => 'queue-job-id',
    },
  });

  const instance = new CronPatternsExample();
  scheduler.registerJobsFromInstance(instance);

  await scheduler.initialize();

  console.log('Cron expression patterns registered:');
  const jobs = scheduler.listJobs({ type: 'cron' });
  jobs.forEach((job) => {
    console.log(`- ${job.name}: "${job.expression}"`);
  });

  console.log('\nCron Expression Guide:');
  console.log('┌───────────── minute (0 - 59)');
  console.log('│ ┌───────────── hour (0 - 23)');
  console.log('│ │ ┌───────────── day of month (1 - 31)');
  console.log('│ │ │ ┌───────────── month (1 - 12)');
  console.log('│ │ │ │ ┌───────────── day of week (0 - 6) (Sunday to Saturday)');
  console.log('│ │ │ │ │');
  console.log('│ │ │ │ │');
  console.log('* * * * *');

  await new Promise((resolve) => setTimeout(resolve, 2000));

  await scheduler.shutdown();
  console.log('Example 9 completed\n');
}

// =============================================================================
// Example 10: Concurrency Control
// =============================================================================

class ConcurrencyControlExample {
  private isRunning = false;

  @Interval(3000, { concurrency: 'skip' })
  async skipConcurrencyJob() {
    if (this.isRunning) {
      console.log('[Concurrency] Previous job still running, skipping this execution');
      return;
    }

    this.isRunning = true;
    console.log('[Concurrency] Job started at:', new Date().toISOString());

    // Simulate long-running task
    await new Promise((resolve) => setTimeout(resolve, 5000));

    this.isRunning = false;
    console.log('[Concurrency] Job completed at:', new Date().toISOString());
  }
}

export async function exampleConcurrencyControl() {
  console.log('\n=== Example 10: Concurrency Control ===');

  const scheduler = new Scheduler({
    checkInterval: 500,
    maxConcurrency: 10,
    queueManager: {
      addJob: async () => 'queue-job-id',
    },
  });

  const instance = new ConcurrencyControlExample();
  scheduler.registerJobsFromInstance(instance);

  await scheduler.initialize();

  console.log('Job configured with "skip" concurrency mode');
  console.log('If a job execution takes longer than the interval, subsequent runs will be skipped');

  await new Promise((resolve) => setTimeout(resolve, 20000));

  await scheduler.shutdown();
  console.log('Example 10 completed\n');
}

// =============================================================================
// Example 11: Event-Driven Scheduling
// =============================================================================

class EventEmitterMock {
  private listeners: Map<string, Function[]> = new Map();

  on(event: string, listener: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  async emit(event: string, data: any) {
    const listeners = this.listeners.get(event) || [];
    for (const listener of listeners) {
      await Promise.resolve(listener(data));
    }
  }
}

class EventDrivenExample {
  @Interval(5000)
  async eventGeneratorJob() {
    console.log('[EventDriven] Generating event at:', new Date().toISOString());
  }
}

export async function exampleEventDrivenScheduling() {
  console.log('\n=== Example 11: Event-Driven Scheduling ===');

  const eventBus = new EventEmitterMock();

  // Listen to scheduler events
  eventBus.on('scheduler:job:triggered', (data) => {
    console.log('[EventListener] Job triggered:', {
      jobId: data.jobId,
      jobName: data.jobName,
      jobType: data.jobType,
    });
  });

  eventBus.on('scheduler:job:queued', (data) => {
    console.log('[EventListener] Job queued:', {
      jobId: data.jobId,
      jobName: data.jobName,
      queueJobId: data.queueJobId,
    });
  });

  eventBus.on('scheduler:job:error', (data) => {
    console.log('[EventListener] Job error:', {
      jobId: data.jobId,
      jobName: data.jobName,
      error: data.error,
    });
  });

  const scheduler = new Scheduler({
    checkInterval: 500,
    maxConcurrency: 10,
    eventBus,
    queueManager: {
      addJob: async () => 'queue-job-id',
    },
  });

  const instance = new EventDrivenExample();
  scheduler.registerJobsFromInstance(instance);

  await scheduler.initialize();

  console.log('Event listeners registered for scheduler events');

  await new Promise((resolve) => setTimeout(resolve, 12000));

  await scheduler.shutdown();
  console.log('Example 11 completed\n');
}

// =============================================================================
// Example 12: Real-World Production Scenario
// =============================================================================

class LoggerMock {
  error(message: string, data: any) {
    console.log(`[Logger] ERROR: ${message}`, data);
  }

  info(message: string, data: any) {
    console.log(`[Logger] INFO: ${message}`, data);
  }

  debug(message: string, data: any) {
    console.log(`[Logger] DEBUG: ${message}`, data);
  }
}

class ProductionSchedulerExample {
  private emailsSent = 0;
  private reportsGenerated = 0;
  private dataBackedUp = 0;

  /**
   * Send daily digest emails every morning at 8:00 AM
   */
  @Cron('0 8 * * *', {
    timezone: 'America/New_York',
    queueName: 'daily-digest-emails',
  })
  async sendDailyDigestEmails() {
    this.emailsSent++;
    console.log(`[Production] Sending daily digest emails (total: ${this.emailsSent})`);
    // Queue jobs for email sending
  }

  /**
   * Generate analytics reports every week on Monday at 9:00 AM
   */
  @Cron('0 9 * * 1', {
    timezone: 'America/New_York',
    queueName: 'weekly-reports',
  })
  async generateWeeklyReports() {
    this.reportsGenerated++;
    console.log(`[Production] Generating weekly analytics reports (total: ${this.reportsGenerated})`);
    // Generate and store reports
  }

  /**
   * Backup database every day at 2:00 AM
   */
  @Cron('0 2 * * *', {
    timezone: 'America/New_York',
    queueName: 'database-backups',
    distributed: true, // Only run on one node
  })
  async backupDatabase() {
    this.dataBackedUp++;
    console.log(`[Production] Backing up database (total: ${this.dataBackedUp})`);
    // Perform database backup
  }

  /**
   * Sync with external APIs every 30 minutes
   */
  @Interval(30 * 60 * 1000, {
    queueName: 'external-api-sync',
  })
  async syncExternalAPIs() {
    console.log('[Production] Syncing with external APIs');
    // Fetch and sync data from external services
  }

  /**
   * Monitor system health every minute
   */
  @Interval(60 * 1000, {
    queueName: 'health-monitoring',
  })
  async monitorSystemHealth() {
    console.log('[Production] Checking system health metrics');
    // Check CPU, memory, disk usage, database connections, etc.
  }

  /**
   * Clean up old logs and temporary files every night at 3:00 AM
   */
  @Cron('0 3 * * *', {
    timezone: 'America/New_York',
    queueName: 'cleanup-jobs',
  })
  async cleanupOldFiles() {
    console.log('[Production] Cleaning up old logs and temporary files');
    // Archive and delete old files
  }
}

export async function exampleProductionScenario() {
  console.log('\n=== Example 12: Real-World Production Scenario ===');
  console.log('This example demonstrates a typical production application with multiple scheduled tasks\n');

  const logger = new LoggerMock();
  const eventBus = new EventEmitterMock();

  // Set up event listeners for production logging
  eventBus.on('scheduler:job:triggered', (data) => {
    logger.info('Job triggered', {
      jobId: data.jobId,
      jobName: data.jobName,
      jobType: data.jobType,
    });
  });

  eventBus.on('scheduler:job:error', (data) => {
    logger.error('Job failed', {
      jobId: data.jobId,
      jobName: data.jobName,
      error: data.error,
    });
  });

  const scheduler = new Scheduler({
    checkInterval: 5000, // Check every 5 seconds in production
    maxConcurrency: 10,
    distributed: false, // In production, enable with Redis for multi-node deployments
    logger,
    eventBus,
    queueManager: {
      addJob: async (queueName: string, data: any) => {
        logger.debug('Job queued', { queueName, data });
        return `queue-${Date.now()}`;
      },
    },
  });

  const instance = new ProductionSchedulerExample();
  scheduler.registerJobsFromInstance(instance);

  await scheduler.initialize();
  logger.info('Production scheduler initialized', {
    totalJobs: scheduler.listJobs().length,
  });

  // Display scheduler statistics
  console.log('\nScheduler Configuration:');
  const stats = scheduler.getStats();
  console.log({
    totalJobs: stats.totalJobs,
    enabledJobs: stats.enabledJobs,
    cronJobs: stats.cronJobs,
    intervalJobs: stats.intervalJobs,
    isLeader: stats.isLeader,
  });

  console.log('\nRegistered Jobs:');
  scheduler.listJobs().forEach((job) => {
    console.log(`- ${job.name} (${job.type}) [Queue: ${job.queueName}]`);
  });

  await new Promise((resolve) => setTimeout(resolve, 10000));

  // Get final statistics
  const finalStats = scheduler.getStats();
  console.log('\nFinal Scheduler Statistics:');
  console.log({
    totalJobs: finalStats.totalJobs,
    enabledJobs: finalStats.enabledJobs,
    totalExecutions: finalStats.totalExecutions,
  });

  await scheduler.shutdown();
  logger.info('Scheduler shutdown gracefully', {});
  console.log('Example 12 completed\n');
}

// =============================================================================
// Runner Function
// =============================================================================

/**
 * Run all examples in sequence
 */
export async function runAllExamples() {
  console.log('╔════════════════════════════════════════════════════════════════════════╗');
  console.log('║                  SCHEDULER EXAMPLES - RUNNING ALL                       ║');
  console.log('╚════════════════════════════════════════════════════════════════════════╝');

  const examples = [
    { name: 'Basic Cron Job', fn: exampleBasicCronJob },
    { name: 'Interval Job', fn: exampleIntervalJob },
    { name: 'Timeout Job', fn: exampleTimeoutJob },
    { name: 'Multiple Jobs', fn: exampleMultipleJobs },
    { name: 'Timezone-Aware Scheduling', fn: exampleTimezoneAware },
    { name: 'Job Control', fn: exampleJobControl },
    { name: 'Job Statistics', fn: exampleJobStatistics },
    { name: 'Distributed Jobs', fn: exampleDistributedJobs },
    { name: 'Cron Expression Patterns', fn: exampleCronExpressions },
    { name: 'Concurrency Control', fn: exampleConcurrencyControl },
    { name: 'Event-Driven Scheduling', fn: exampleEventDrivenScheduling },
    { name: 'Production Scenario', fn: exampleProductionScenario },
  ];

  for (const { name, fn } of examples) {
    try {
      console.log(`\n${'─'.repeat(76)}`);
      console.log(`Running: ${name}`);
      console.log(`${'─'.repeat(76)}`);
      await fn();
    } catch (error) {
      console.error(`Error in ${name}:`, error);
    }
  }

  console.log('\n╔════════════════════════════════════════════════════════════════════════╗');
  console.log('║                     ALL EXAMPLES COMPLETED                              ║');
  console.log('╚════════════════════════════════════════════════════════════════════════╝\n');
}

// =============================================================================
// Main Entry Point
// =============================================================================

if (require.main === module) {
  runAllExamples().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
