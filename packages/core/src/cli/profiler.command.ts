import type { Profiler } from '../optimization/layer3/profiler.js';
import type { MetricsCollector } from '../optimization/layer3/metrics-collector.js';

/**
 * Options for profiling output
 */
export interface ProfileOptions {
  sampleSize?: number;
  output?: 'text' | 'json';
  outputFile?: string;
}

/**
 * Command handler for formatting and displaying profiling reports
 */
export class ProfilerCommand {
  /**
   * Format a profile report as human-readable text
   * @param sampleSize - Number of samples collected
   * @param operations - Array of operations with label and duration
   * @param metrics - Additional metrics data
   * @returns Formatted text report
   */
  static formatProfileReport(
    sampleSize: number,
    operations: { label: string; duration: number }[],
    metrics: Record<string, unknown>
  ): string {
    const lines: string[] = [];

    // Header
    lines.push('=== Performance Profile Report ===');
    lines.push('');

    // Sample Size and Total Time
    lines.push(`Sample Size: ${sampleSize}`);
    if (metrics.totalTime !== undefined) {
      lines.push(`Total Time: ${metrics.totalTime}ms`);
    }
    lines.push('');

    // Slowest Operations section
    if (operations.length > 0) {
      lines.push('Slowest Operations');
      lines.push('-'.repeat(50));

      // Sort operations by duration descending
      const sorted = [...operations].sort((a, b) => b.duration - a.duration);

      // Take top 10 slowest
      const topTen = sorted.slice(0, 10);

      for (const op of topTen) {
        const label = op.label.padEnd(30);
        lines.push(`${label} ${op.duration.toFixed(2)}ms`);
      }
    } else {
      lines.push('No operations recorded');
    }

    lines.push('');

    return lines.join('\n');
  }

  /**
   * Format profiler and metrics data as JSON
   * @param profiler - Profiler instance
   * @param metricsCollector - MetricsCollector instance
   * @returns JSON string with profiler and metrics reports
   */
  static formatJson(profiler: Profiler, metricsCollector: MetricsCollector): string {
    const profilerReport = profiler.report();
    const metricsReport = metricsCollector.report();

    const report = {
      timestamp: Date.now(),
      profilerReport,
      metricsReport,
    };

    return JSON.stringify(report, null, 2);
  }

  /**
   * Get a formatted report in the specified format
   * @param profiler - Profiler instance
   * @param metricsCollector - MetricsCollector instance
   * @param format - Output format: 'text' or 'json' (default: 'text')
   * @returns Formatted report string
   */
  static getFormattedReport(
    profiler: Profiler,
    metricsCollector: MetricsCollector,
    format: 'text' | 'json' = 'text'
  ): string {
    if (format === 'json') {
      return this.formatJson(profiler, metricsCollector);
    }

    // Default to text format
    const profilerReport = profiler.report();
    metricsCollector.report();

    // Convert operations to format expected by formatProfileReport
    const operations = profilerReport.operations.map(op => ({
      label: op.label,
      duration: op.duration || 0,
    }));

    return this.formatProfileReport(profilerReport.operationCount, operations, {
      totalTime: profilerReport.totalTime,
    });
  }
}
