import { Job, JobStatus, QueueStats } from './types.js';
import { QueueManager } from './queue-manager.js';

export interface QueueHealth {
  status: 'healthy' | 'degraded' | 'critical';
  stats: QueueStats;
  avgProcessingTime: number;
  failureRate: number;
  oldestJob?: Job;
  recommendations: string[];
}

export interface QueueMetrics {
  timestamp: number;
  stats: QueueStats;
  processingRate: number; // jobs per minute
  failureRate: number; // percentage
  avgProcessingTime: number; // milliseconds
  memoryUsage?: number;
  connections?: number;
}

export class QueueMonitor {
  private metricsHistory: QueueMetrics[] = [];
  private maxHistorySize = 1000;

  constructor(private queueManager: QueueManager) {}

  async getHealth(): Promise<QueueHealth> {
    const stats = await this.queueManager.getStats();
    const pendingJobs = await this.queueManager.getJobs(['waiting', 'delayed']);
    const failedJobs = await this.queueManager.getJobs(['failed']);

    const avgProcessingTime = this.calculateAvgProcessingTime(
      await this.queueManager.getJobs(['completed'])
    );

    const failureRate =
      stats.totalProcessed === 0
        ? 0
        : (stats.totalFailed / stats.totalProcessed) * 100;

    // Determine status
    let status: 'healthy' | 'degraded' | 'critical';
    const recommendations: string[] = [];

    const totalWaiting = stats.waiting + stats.delayed;

    if (failureRate > 10 || totalWaiting > 10000) {
      status = 'critical';
      if (failureRate > 10) {
        recommendations.push(
          `High failure rate (${failureRate.toFixed(2)}%). Check job processors.`
        );
      }
      if (totalWaiting > 10000) {
        recommendations.push(
          `Large backlog (${totalWaiting} jobs). Increase worker concurrency.`
        );
      }
    } else if (failureRate > 5 || totalWaiting > 1000) {
      status = 'degraded';
      if (failureRate > 5) {
        recommendations.push(
          `Elevated failure rate (${failureRate.toFixed(2)}%). Review recent job failures.`
        );
      }
      if (totalWaiting > 1000) {
        recommendations.push(
          `Backlog building up (${totalWaiting} jobs). Consider scaling.`
        );
      }
    } else {
      status = 'healthy';
    }

    // Add general recommendations
    if (stats.active === 0 && stats.waiting > 0) {
      recommendations.push('Workers are not processing jobs. Start workers.');
    }

    return {
      status,
      stats,
      avgProcessingTime,
      failureRate,
      oldestJob: pendingJobs.length > 0 ? pendingJobs[0] : undefined,
      recommendations,
    };
  }

  async captureMetrics(): Promise<QueueMetrics> {
    const stats = await this.queueManager.getStats();
    const metrics: QueueMetrics = {
      timestamp: Date.now(),
      stats,
      processingRate: this.calculateProcessingRate(stats),
      failureRate:
        stats.totalProcessed === 0
          ? 0
          : (stats.totalFailed / stats.totalProcessed) * 100,
      avgProcessingTime: 0, // Would need historical data
    };

    this.metricsHistory.push(metrics);
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory.shift();
    }

    return metrics;
  }

  getMetricsHistory(limit: number = 100): QueueMetrics[] {
    return this.metricsHistory.slice(-limit);
  }

  clearMetricsHistory(): void {
    this.metricsHistory = [];
  }

  async getQueueSize(): Promise<number> {
    const stats = await this.queueManager.getStats();
    return (
      stats.waiting +
      stats.active +
      stats.delayed +
      stats.completed +
      stats.failed
    );
  }

  async getAgeOfOldestJob(): Promise<number | null> {
    const pendingJobs = await this.queueManager.getJobs(['waiting', 'delayed']);
    if (pendingJobs.length === 0) return null;

    const oldest = pendingJobs[0];
    return Date.now() - oldest.timestamp;
  }

  async identifySlowJobs(threshold: number = 60000): Promise<Job[]> {
    const activeJobs = await this.queueManager.getJobs(['active']);
    return activeJobs.filter((job) => {
      const duration = Date.now() - (job.processedOn || job.timestamp);
      return duration > threshold;
    });
  }

  async identifyFailingJobs(threshold: number = 5): Promise<Job[]> {
    const failedJobs = await this.queueManager.getJobs(['failed']);
    return failedJobs.filter((job) => job.attempts >= threshold);
  }

  private calculateAvgProcessingTime(jobs: Job[]): number {
    if (jobs.length === 0) return 0;

    const totalTime = jobs.reduce((sum, job) => {
      const duration = (job.finishedOn || 0) - (job.processedOn || 0);
      return sum + duration;
    }, 0);

    return totalTime / jobs.length;
  }

  private calculateProcessingRate(stats: QueueStats): number {
    // Jobs per minute (simplified)
    return stats.active > 0 ? stats.active * 60 : 0;
  }

  async generateReport(): Promise<string> {
    const health = await this.getHealth();
    const queueSize = await this.getQueueSize();
    const oldestJobAge = await this.getAgeOfOldestJob();
    const slowJobs = await this.identifySlowJobs();
    const failingJobs = await this.identifyFailingJobs();

    const report = `
Queue Health Report
==================
Status: ${health.status.toUpperCase()}
Timestamp: ${new Date().toISOString()}

Statistics:
- Total Queue Size: ${queueSize}
- Waiting: ${health.stats.waiting}
- Active: ${health.stats.active}
- Completed: ${health.stats.completed}
- Failed: ${health.stats.failed}
- Delayed: ${health.stats.delayed}

Metrics:
- Failure Rate: ${health.failureRate.toFixed(2)}%
- Avg Processing Time: ${health.avgProcessingTime.toFixed(0)}ms
- Oldest Job Age: ${oldestJobAge ? Math.round(oldestJobAge / 1000) + 's' : 'N/A'}

Issues:
- Slow Jobs: ${slowJobs.length}
- Failing Jobs: ${failingJobs.length}

Recommendations:
${health.recommendations.map((r) => `- ${r}`).join('\n')}
    `.trim();

    return report;
  }
}
