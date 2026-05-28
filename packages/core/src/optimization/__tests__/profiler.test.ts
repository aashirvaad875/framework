import { describe, it, expect, beforeEach } from 'vitest';
import { Profiler } from '../layer3/profiler.js';

describe('Profiler', () => {
  let profiler: Profiler;

  beforeEach(() => {
    profiler = new Profiler();
  });

  describe('Basic Timing Operations', () => {
    it('should start a trace and return a traceId', () => {
      const traceId = profiler.start('test-operation');

      expect(traceId).toBeDefined();
      expect(typeof traceId).toBe('string');
      expect(traceId.length).toBeGreaterThan(0);
    });

    it('should track start time when starting a trace', async () => {
      const label = 'timing-test';
      const traceId = profiler.start(label);

      await new Promise(resolve => setTimeout(resolve, 5));
      profiler.end(traceId);
      const report = profiler.report();

      expect(report.operations.length).toBe(1);
      expect(report.operations[0].label).toBe(label);
      expect(report.operations[0].traceId).toBe(traceId);
      expect(report.operations[0].startTime).toBeDefined();
      expect(report.operations[0].startTime).toBeGreaterThan(0);
    });

    it('should end a trace and return duration', async () => {
      const traceId = profiler.start('duration-test');

      // Wait a bit to ensure measurable duration
      await new Promise(resolve => setTimeout(resolve, 10));
      const duration = profiler.end(traceId);

      expect(duration).toBeGreaterThan(0);
      expect(duration).toBeLessThan(100); // Should be a few milliseconds
    });

    it('should record endTime and duration when ending trace', async () => {
      const traceId = profiler.start('end-test');

      await new Promise(resolve => setTimeout(resolve, 5));
      profiler.end(traceId);
      const report = profiler.report();

      expect(report.operations.length).toBe(1);
      expect(report.operations[0].endTime).toBeDefined();
      expect(report.operations[0].duration).toBeDefined();
      expect(report.operations[0].duration).toBeGreaterThan(0);
    });

    it('should accept context when starting a trace', async () => {
      const context = { userId: 123, route: '/api/users' };
      const traceId = profiler.start('context-test', context);

      await new Promise(resolve => setTimeout(resolve, 5));
      profiler.end(traceId);
      const report = profiler.report();

      expect(report.operations[0].context).toEqual(context);
    });

    it('should handle multiple traces simultaneously', async () => {
      const traceId1 = profiler.start('operation-1');
      const traceId2 = profiler.start('operation-2');
      const traceId3 = profiler.start('operation-3');

      await new Promise(resolve => setTimeout(resolve, 10));
      profiler.end(traceId2);
      profiler.end(traceId1);
      profiler.end(traceId3);

      const report = profiler.report();
      expect(report.operations.length).toBe(3);
      expect(report.operationCount).toBe(3);
      expect(report.operations[0].duration).toBeDefined();
      expect(report.operations[1].duration).toBeDefined();
      expect(report.operations[2].duration).toBeDefined();
    });
  });

  describe('Measure Method', () => {
    it('should measure synchronous function execution time', async () => {
      const result = await profiler.measure('sync-function', () => {
        return 'result';
      });

      expect(result).toBe('result');
      const report = profiler.report();
      expect(report.operations.length).toBe(1);
      expect(report.operations[0].duration).toBeGreaterThanOrEqual(0);
    });

    it('should measure asynchronous function execution time', async () => {
      const result = await profiler.measure('async-function', async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'async-result';
      });

      expect(result).toBe('async-result');
      const report = profiler.report();
      expect(report.operations.length).toBe(1);
      expect(report.operations[0].duration).toBeGreaterThan(5);
    });

    it('should accept context in measure', async () => {
      const context = { service: 'auth' };
      await profiler.measure('measure-with-context', () => 'result', context);

      const report = profiler.report();
      expect(report.operations[0].context).toEqual(context);
    });

    it('should propagate errors from measured function', async () => {
      await expect(
        profiler.measure('error-function', async () => {
          throw new Error('Intentional error');
        })
      ).rejects.toThrow('Intentional error');
    });

    it('should still record trace even when function throws', async () => {
      try {
        await profiler.measure('failing-function', () => {
          throw new Error('Failed');
        });
      } catch {
        // Expected to fail
      }

      const report = profiler.report();
      expect(report.operations.length).toBe(1);
      expect(report.operations[0].duration).toBeDefined();
    });
  });

  describe('Report Generation', () => {
    it('should return operations in report', async () => {
      const traceId = profiler.start('report-test');

      await new Promise(resolve => setTimeout(resolve, 5));
      profiler.end(traceId);
      const report = profiler.report();

      expect(report.operations).toBeDefined();
      expect(Array.isArray(report.operations)).toBe(true);
      expect(report.operations.length).toBe(1);
      expect(report.operations[0].label).toBe('report-test');
    });

    it('should calculate total time in report', async () => {
      const traceId1 = profiler.start('op1');

      await new Promise(resolve => setTimeout(resolve, 5));
      profiler.end(traceId1);

      const traceId2 = profiler.start('op2');
      await new Promise(resolve => setTimeout(resolve, 5));
      profiler.end(traceId2);

      const report = profiler.report();

      expect(report.totalTime).toBeGreaterThan(0);
      expect(report.totalTime).toBeGreaterThanOrEqual(
        (report.operations[0].duration || 0) + (report.operations[1].duration || 0)
      );
    });

    it('should include operation count in report', async () => {
      // Track trace IDs for all operations
      const traceId1 = profiler.start('op1-tracked');
      const traceId2 = profiler.start('op2-tracked');
      const traceId3 = profiler.start('op3-tracked');

      await new Promise(resolve => setTimeout(resolve, 5));
      profiler.end(traceId1);
      profiler.end(traceId2);
      profiler.end(traceId3);

      const report = profiler.report();
      expect(report.operationCount).toBe(3);
    });

    it('should include startTime and endTime in report', async () => {
      const traceId = profiler.start('timing-report');

      await new Promise(resolve => setTimeout(resolve, 5));
      profiler.end(traceId);
      const report = profiler.report();

      expect(report.startTime).toBeDefined();
      expect(report.endTime).toBeDefined();
      expect(report.endTime).toBeGreaterThanOrEqual(report.startTime);
    });

    it('should clear operations after report', async () => {
      const traceId = profiler.start('clear-test');

      await new Promise(resolve => setTimeout(resolve, 5));
      profiler.end(traceId);
      const report1 = profiler.report();
      expect(report1.operations.length).toBe(1);

      const report2 = profiler.report();
      expect(report2.operations.length).toBe(0);
    });

    it('should return a copy of operations not reference', async () => {
      const traceId = profiler.start('copy-test');

      await new Promise(resolve => setTimeout(resolve, 5));
      profiler.end(traceId);
      const report1 = profiler.report();
      const report2 = profiler.report();

      expect(report1.operations).not.toBe(report2.operations);
    });
  });

  describe('Clear Method', () => {
    it('should clear all operations', async () => {
      const traceId1 = profiler.start('op1');
      const traceId2 = profiler.start('op2');

      await new Promise(resolve => setTimeout(resolve, 5));
      profiler.end(traceId1);
      profiler.end(traceId2);

      let report = profiler.report();
      expect(report.operations.length).toBe(2);

      profiler.clear();
      report = profiler.report();
      expect(report.operations.length).toBe(0);
    });

    it('should clear active traces', () => {
      profiler.start('active-1');
      profiler.start('active-2');

      profiler.clear();

      expect(profiler.isActive()).toBe(false);
    });
  });

  describe('Active Traces Tracking', () => {
    it('should return true if traces are in flight', () => {
      profiler.start('active-test');
      expect(profiler.isActive()).toBe(true);
    });

    it('should return false if no traces are in flight', () => {
      expect(profiler.isActive()).toBe(false);
    });

    it('should return false after all traces are ended', async () => {
      const traceId1 = profiler.start('op1');
      const traceId2 = profiler.start('op2');

      await new Promise(resolve => setTimeout(resolve, 5));
      expect(profiler.isActive()).toBe(true);

      profiler.end(traceId1);
      expect(profiler.isActive()).toBe(true);

      profiler.end(traceId2);
      expect(profiler.isActive()).toBe(false);
    });

    it('should return false after report clears operations', async () => {
      const traceId = profiler.start('report-clear-test');

      await new Promise(resolve => setTimeout(resolve, 5));
      profiler.end(traceId);
      expect(profiler.isActive()).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle ending non-existent trace gracefully', () => {
      expect(() => {
        profiler.end('non-existent-id');
      }).not.toThrow();
    });

    it('should generate unique traceIds', () => {
      const traceId1 = profiler.start('op1');
      const traceId2 = profiler.start('op2');
      const traceId3 = profiler.start('op3');

      expect(traceId1).not.toBe(traceId2);
      expect(traceId2).not.toBe(traceId3);
      expect(traceId1).not.toBe(traceId3);
    });

    it('should handle empty label', () => {
      const emptyLabelTraceId = profiler.start('');
      profiler.end(emptyLabelTraceId);
      const report = profiler.report();
      expect(report.operations[0].label).toBe('');
    });

    it('should support very long labels', () => {
      const longLabel = 'a'.repeat(1000);
      const longLabelTraceId = profiler.start(longLabel);
      profiler.end(longLabelTraceId);
      const report = profiler.report();
      expect(report.operations[0].label).toBe(longLabel);
    });
  });
});
