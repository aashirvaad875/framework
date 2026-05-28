import type { OperationTrace } from '../types.js';

/**
 * Profile report containing timing information
 */
export interface ProfileReport {
  operations: OperationTrace[];
  totalTime: number;
  operationCount: number;
  startTime: number;
  endTime: number;
}

/**
 * Execution timing tracer for measuring operation performance
 */
export class Profiler {
  private activeTraces: Map<string, OperationTrace> = new Map();
  private completedOperations: OperationTrace[] = [];
  private reportStartTime: number = 0;

  /**
   * Start a new trace
   * @param label - Label for the operation
   * @param context - Optional context data
   * @returns Unique trace ID
   */
  start(label: string, context?: Record<string, unknown>): string {
    const traceId = this.generateTraceId();
    const startTime = performance.now();

    const trace: OperationTrace = {
      label,
      traceId,
      startTime,
      context,
    };

    if (this.reportStartTime === 0) {
      this.reportStartTime = startTime;
    }

    this.activeTraces.set(traceId, trace);
    return traceId;
  }

  /**
   * End a trace and return its duration
   * @param traceId - The trace ID to end
   * @returns Duration in milliseconds
   */
  end(traceId: string): number {
    const trace = this.activeTraces.get(traceId);
    if (!trace) {
      return 0;
    }

    const endTime = performance.now();
    const duration = endTime - trace.startTime;

    trace.endTime = endTime;
    trace.duration = duration;

    this.activeTraces.delete(traceId);
    this.completedOperations.push(trace);

    return duration;
  }

  /**
   * Measure a function's execution time
   * @param label - Label for the measurement
   * @param fn - Function to measure (sync or async)
   * @param context - Optional context data
   * @returns Result of the function
   */
  async measure<T>(
    label: string,
    fn: () => T | Promise<T>,
    context?: Record<string, unknown>
  ): Promise<T> {
    const traceId = this.start(label, context);
    try {
      const result = await fn();
      this.end(traceId);
      return result;
    } catch (error) {
      this.end(traceId);
      throw error;
    }
  }

  /**
   * Generate a report and clear operations
   * @returns Profile report with all operations
   */
  report(): ProfileReport {
    const endTime = performance.now();
    const totalTime = endTime - this.reportStartTime;

    const report: ProfileReport = {
      operations: [...this.completedOperations],
      totalTime,
      operationCount: this.completedOperations.length,
      startTime: this.reportStartTime,
      endTime,
    };

    // Clear operations after report
    this.completedOperations = [];
    this.reportStartTime = 0;

    return report;
  }

  /**
   * Clear all operations and reset state
   */
  clear(): void {
    this.activeTraces.clear();
    this.completedOperations = [];
    this.reportStartTime = 0;
  }

  /**
   * Check if any traces are currently active
   * @returns True if traces are in flight
   */
  isActive(): boolean {
    return this.activeTraces.size > 0;
  }

  /**
   * Generate a unique trace ID
   */
  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}
