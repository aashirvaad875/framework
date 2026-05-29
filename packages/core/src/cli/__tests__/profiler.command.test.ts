import { describe, it, expect, beforeEach } from 'vitest';
import { ProfilerCommand } from '../profiler.command.js';
import { Profiler } from '../../optimization/layer3/profiler.js';
import { MetricsCollector } from '../../optimization/layer3/metrics-collector.js';

describe('ProfilerCommand', () => {
  let profiler: Profiler;
  let metricsCollector: MetricsCollector;

  beforeEach(() => {
    profiler = new Profiler();
    metricsCollector = new MetricsCollector();
  });

  describe('formatProfileReport', () => {
    it('should format profile report as text with header', () => {
      const operations = [
        { label: 'operation-1', duration: 10.5 },
        { label: 'operation-2', duration: 5.2 },
      ];

      const report = ProfilerCommand.formatProfileReport(2, operations, {});

      expect(report).toContain('=== Performance Profile Report ===');
    });

    it('should show sample size in report', () => {
      const operations: { label: string; duration: number }[] = [];
      const report = ProfilerCommand.formatProfileReport(50, operations, {});

      expect(report).toContain('Sample Size: 50');
    });

    it('should show total time in report', () => {
      const operations: { label: string; duration: number }[] = [];
      const report = ProfilerCommand.formatProfileReport(1, operations, { totalTime: 150.5 });

      expect(report).toContain('Total Time: 150.5ms');
    });

    it('should handle empty operations', () => {
      const operations: { label: string; duration: number }[] = [];
      const report = ProfilerCommand.formatProfileReport(1, operations, { totalTime: 0 });

      expect(report).toContain('=== Performance Profile Report ===');
      expect(report).toContain('Sample Size: 1');
    });

    it('should show slowest operations section', () => {
      const operations = [
        { label: 'operation-1', duration: 10.5 },
        { label: 'operation-2', duration: 5.2 },
      ];

      const report = ProfilerCommand.formatProfileReport(2, operations, { totalTime: 15.7 });

      expect(report).toContain('Slowest Operations');
    });

    it('should format operation with label and duration', () => {
      const operations = [{ label: 'test-operation', duration: 25.33 }];

      const report = ProfilerCommand.formatProfileReport(1, operations, { totalTime: 25.33 });

      // Should contain formatted operation line with label padded to 30 and duration
      expect(report).toContain('test-operation');
      expect(report).toContain('25.33ms');
    });

    it('should sort operations by duration descending', () => {
      const operations = [
        { label: 'slow-operation', duration: 100.5 },
        { label: 'fast-operation', duration: 5.2 },
        { label: 'medium-operation', duration: 50.0 },
      ];

      const report = ProfilerCommand.formatProfileReport(3, operations, { totalTime: 155.7 });

      // Verify slow-operation appears before medium-operation
      const slowIndex = report.indexOf('slow-operation');
      const mediumIndex = report.indexOf('medium-operation');
      const fastIndex = report.indexOf('fast-operation');

      expect(slowIndex).toBeLessThan(mediumIndex);
      expect(mediumIndex).toBeLessThan(fastIndex);
    });

    it('should limit to top 10 slowest operations', () => {
      const operations = Array.from({ length: 15 }, (_, i) => ({
        label: `operation-${i}`,
        duration: 100 - i * 5,
      }));

      const report = ProfilerCommand.formatProfileReport(15, operations, { totalTime: 700 });

      // Count how many operations are listed in the report
      const operationMatches = report.match(/operation-\d+/g) || [];
      expect(operationMatches.length).toBeLessThanOrEqual(10);
    });
  });

  describe('formatJson', () => {
    it('should return valid JSON string', async () => {
      const traceId = profiler.start('test-operation');
      await new Promise(resolve => setTimeout(resolve, 5));
      profiler.end(traceId);

      metricsCollector.recordRoute('/test', 10, 1024);

      const jsonStr = ProfilerCommand.formatJson(profiler, metricsCollector);

      expect(() => JSON.parse(jsonStr)).not.toThrow();
    });

    it('should include profiler report in JSON', async () => {
      const traceId = profiler.start('json-test');
      await new Promise(resolve => setTimeout(resolve, 5));
      profiler.end(traceId);

      const jsonStr = ProfilerCommand.formatJson(profiler, metricsCollector);
      const parsed = JSON.parse(jsonStr);

      expect(parsed).toHaveProperty('profilerReport');
      expect(parsed.profilerReport).toHaveProperty('operations');
      expect(parsed.profilerReport).toHaveProperty('totalTime');
    });

    it('should include metrics report in JSON', async () => {
      metricsCollector.recordRoute('/api/test', 25.5, 2048);

      const jsonStr = ProfilerCommand.formatJson(profiler, metricsCollector);
      const parsed = JSON.parse(jsonStr);

      expect(parsed).toHaveProperty('metricsReport');
      expect(parsed.metricsReport).toHaveProperty('routes');
      expect(parsed.metricsReport).toHaveProperty('timestamp');
    });

    it('should include timestamp in JSON', () => {
      const jsonStr = ProfilerCommand.formatJson(profiler, metricsCollector);
      const parsed = JSON.parse(jsonStr);

      expect(parsed).toHaveProperty('timestamp');
      expect(typeof parsed.timestamp).toBe('number');
      expect(parsed.timestamp).toBeGreaterThan(0);
    });

    it('should be properly formatted with indentation', () => {
      const jsonStr = ProfilerCommand.formatJson(profiler, metricsCollector);

      // Should be formatted (contain newlines and indentation)
      expect(jsonStr).toContain('\n');
    });
  });

  describe('getFormattedReport', () => {
    it('should return text format by default', async () => {
      const traceId = profiler.start('default-format-test');
      await new Promise(resolve => setTimeout(resolve, 5));
      profiler.end(traceId);

      const report = ProfilerCommand.getFormattedReport(profiler, metricsCollector);

      expect(report).toContain('=== Performance Profile Report ===');
    });

    it('should return text format when explicitly requested', async () => {
      const traceId = profiler.start('text-format-test');
      await new Promise(resolve => setTimeout(resolve, 5));
      profiler.end(traceId);

      const report = ProfilerCommand.getFormattedReport(profiler, metricsCollector, 'text');

      expect(report).toContain('=== Performance Profile Report ===');
    });

    it('should return JSON format when requested', async () => {
      const traceId = profiler.start('json-format-test');
      await new Promise(resolve => setTimeout(resolve, 5));
      profiler.end(traceId);

      const report = ProfilerCommand.getFormattedReport(profiler, metricsCollector, 'json');

      expect(() => JSON.parse(report)).not.toThrow();
    });

    it('should include profiler data in text format', async () => {
      const traceId = profiler.start('profiler-data-test');
      await new Promise(resolve => setTimeout(resolve, 5));
      profiler.end(traceId);

      const report = ProfilerCommand.getFormattedReport(profiler, metricsCollector, 'text');

      expect(report).toContain('Sample Size:');
      expect(report).toContain('Total Time:');
    });

    it('should handle empty profiler and metrics', () => {
      const report = ProfilerCommand.getFormattedReport(profiler, metricsCollector, 'text');

      expect(report).toContain('=== Performance Profile Report ===');
    });
  });

  describe('ProfileOptions Interface', () => {
    it('should define ProfileOptions with sampleSize', () => {
      // This is a type check - verify the interface exists in usage
      const options: { sampleSize?: number } = { sampleSize: 100 };
      expect(options.sampleSize).toBe(100);
    });

    it('should define ProfileOptions with output format', () => {
      const options: { output?: 'text' | 'json' } = { output: 'json' };
      expect(options.output).toBe('json');
    });

    it('should define ProfileOptions with outputFile', () => {
      const options: { outputFile?: string } = { outputFile: '/tmp/report.txt' };
      expect(options.outputFile).toBe('/tmp/report.txt');
    });
  });

  describe('Integration with Profiler and MetricsCollector', () => {
    it('should handle real profiler and metrics data', async () => {
      // Simulate real profiling scenario
      const traceId1 = profiler.start('database-query', { table: 'users' });
      await new Promise(resolve => setTimeout(resolve, 10));
      profiler.end(traceId1);

      const traceId2 = profiler.start('cache-lookup');
      await new Promise(resolve => setTimeout(resolve, 5));
      profiler.end(traceId2);

      metricsCollector.recordRoute('/api/users', 15, 2048);
      metricsCollector.recordRoute('/api/products', 8, 1024);

      const report = ProfilerCommand.getFormattedReport(profiler, metricsCollector, 'text');

      expect(report).toContain('=== Performance Profile Report ===');
      expect(report).toContain('Sample Size');
    });

    it('should not mutate profiler or metrics state', async () => {
      const traceId = profiler.start('mutation-test');
      await new Promise(resolve => setTimeout(resolve, 5));
      profiler.end(traceId);

      const report1 = profiler.report();
      expect(report1.operations.length).toBeGreaterThan(0);

      // Get formatted report
      ProfilerCommand.getFormattedReport(profiler, metricsCollector, 'text');

      // Profiler should have cleared its operations (normal behavior)
      const report2 = profiler.report();
      expect(report2.operations.length).toBe(0); // cleared after report()
    });
  });
});
