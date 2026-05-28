import { describe, it, expect, beforeEach } from 'vitest';
import { MetricsCollector } from '../layer3/metrics-collector.js';
import type { Token } from '../../di/types.js';

describe('MetricsCollector', () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    collector = new MetricsCollector();
  });

  describe('Route Metrics Recording', () => {
    it('should record a single route metric', () => {
      collector.recordRoute('/api/users', 100, 1024);

      const stats = collector.getRouteMetrics('/api/users');
      expect(stats).toBeDefined();
      expect(stats?.path).toBe('/api/users');
      expect(stats?.count).toBe(1);
      expect(stats?.totalTime).toBe(100);
      expect(stats?.totalMemory).toBe(1024);
    });

    it('should aggregate multiple calls to same route', () => {
      collector.recordRoute('/api/users', 100, 512);
      collector.recordRoute('/api/users', 200, 512);
      collector.recordRoute('/api/users', 150, 1024);

      const stats = collector.getRouteMetrics('/api/users');
      expect(stats?.count).toBe(3);
      expect(stats?.totalTime).toBe(450);
      expect(stats?.totalMemory).toBe(2048);
    });

    it('should calculate average time for route', () => {
      collector.recordRoute('/api/posts', 100, 512);
      collector.recordRoute('/api/posts', 200, 512);

      const stats = collector.getRouteMetrics('/api/posts');
      expect(stats?.avgTime).toBe(150);
    });

    it('should track minimum time for route', () => {
      collector.recordRoute('/api/data', 200, 512);
      collector.recordRoute('/api/data', 50, 512);
      collector.recordRoute('/api/data', 150, 512);

      const stats = collector.getRouteMetrics('/api/data');
      expect(stats?.minTime).toBe(50);
    });

    it('should track maximum time for route', () => {
      collector.recordRoute('/api/data', 100, 512);
      collector.recordRoute('/api/data', 300, 512);
      collector.recordRoute('/api/data', 150, 512);

      const stats = collector.getRouteMetrics('/api/data');
      expect(stats?.maxTime).toBe(300);
    });

    it('should calculate p99 time as maxTime * 0.99', () => {
      collector.recordRoute('/api/slow', 100, 512);
      collector.recordRoute('/api/slow', 1000, 512);

      const stats = collector.getRouteMetrics('/api/slow');
      expect(stats?.p99Time).toBe(1000 * 0.99);
    });

    it('should return undefined for non-existent route', () => {
      const stats = collector.getRouteMetrics('/api/nonexistent');
      expect(stats).toBeUndefined();
    });

    it('should track memory separately for each route', () => {
      collector.recordRoute('/api/small', 100, 256);
      collector.recordRoute('/api/large', 100, 2048);

      const smallStats = collector.getRouteMetrics('/api/small');
      const largeStats = collector.getRouteMetrics('/api/large');

      expect(smallStats?.totalMemory).toBe(256);
      expect(largeStats?.totalMemory).toBe(2048);
    });
  });

  describe('Provider Metrics Recording', () => {
    it('should record a single provider metric', () => {
      const token: Token = 'UserService';
      collector.recordProvider(token, 150);

      const stats = collector.getProviderMetrics(token);
      expect(stats).toBeDefined();
      expect(stats?.token).toBe(token);
      expect(stats?.count).toBe(1);
      expect(stats?.totalTime).toBe(150);
    });

    it('should aggregate multiple calls to same provider', () => {
      const token: Token = 'AuthService';
      collector.recordProvider(token, 100);
      collector.recordProvider(token, 200);
      collector.recordProvider(token, 50);

      const stats = collector.getProviderMetrics(token);
      expect(stats?.count).toBe(3);
      expect(stats?.totalTime).toBe(350);
    });

    it('should calculate average time for provider', () => {
      const token: Token = 'DatabaseService';
      collector.recordProvider(token, 100);
      collector.recordProvider(token, 200);

      const stats = collector.getProviderMetrics(token);
      expect(stats?.avgTime).toBe(150);
    });

    it('should track minimum time for provider', () => {
      const token: Token = 'CacheService';
      collector.recordProvider(token, 300);
      collector.recordProvider(token, 50);
      collector.recordProvider(token, 200);

      const stats = collector.getProviderMetrics(token);
      expect(stats?.minTime).toBe(50);
    });

    it('should track maximum and slowestTime for provider', () => {
      const token: Token = 'SlowService';
      collector.recordProvider(token, 100);
      collector.recordProvider(token, 500);
      collector.recordProvider(token, 200);

      const stats = collector.getProviderMetrics(token);
      expect(stats?.maxTime).toBe(500);
      expect(stats?.slowestTime).toBe(500);
    });

    it('should track different providers independently', () => {
      const token1: Token = 'Service1';
      const token2: Token = 'Service2';

      collector.recordProvider(token1, 100);
      collector.recordProvider(token1, 150);
      collector.recordProvider(token2, 500);

      const stats1 = collector.getProviderMetrics(token1);
      const stats2 = collector.getProviderMetrics(token2);

      expect(stats1?.count).toBe(2);
      expect(stats1?.totalTime).toBe(250);
      expect(stats2?.count).toBe(1);
      expect(stats2?.totalTime).toBe(500);
    });

    it('should return undefined for non-existent provider', () => {
      const token: Token = 'NonExistent';
      const stats = collector.getProviderMetrics(token);
      expect(stats).toBeUndefined();
    });

    it('should support string tokens', () => {
      const token: Token = 'StringService';
      collector.recordProvider(token, 100);
      const stats = collector.getProviderMetrics(token);
      expect(stats?.token).toBe(token);
    });

    it('should support symbol tokens', () => {
      const token: Token = Symbol('SymbolService');
      collector.recordProvider(token, 100);
      const stats = collector.getProviderMetrics(token);
      expect(stats?.token).toBe(token);
    });

    it('should support class tokens', () => {
      class TestService {}
      const token: Token = TestService;
      collector.recordProvider(token, 100);
      const stats = collector.getProviderMetrics(token);
      expect(stats?.token).toBe(token);
    });
  });

  describe('Middleware Metrics Recording', () => {
    it('should record a single middleware metric', () => {
      collector.recordMiddleware('authMiddleware', 50);

      const report = collector.report();
      expect(report.middleware.length).toBe(1);
      expect(report.middleware[0].name).toBe('authMiddleware');
      expect(report.middleware[0].count).toBe(1);
      expect(report.middleware[0].totalTime).toBe(50);
    });

    it('should aggregate multiple calls to same middleware', () => {
      collector.recordMiddleware('cors', 10);
      collector.recordMiddleware('cors', 15);
      collector.recordMiddleware('cors', 20);

      const report = collector.report();
      const corsStats = report.middleware.find(m => m.name === 'cors');
      expect(corsStats?.count).toBe(3);
      expect(corsStats?.totalTime).toBe(45);
    });

    it('should calculate average time for middleware', () => {
      collector.recordMiddleware('validation', 100);
      collector.recordMiddleware('validation', 200);

      const report = collector.report();
      const stats = report.middleware[0];
      expect(stats.avgTime).toBe(150);
    });

    it('should track min and max time for middleware', () => {
      collector.recordMiddleware('logging', 50);
      collector.recordMiddleware('logging', 200);
      collector.recordMiddleware('logging', 100);

      const report = collector.report();
      const stats = report.middleware[0];
      expect(stats.minTime).toBe(50);
      expect(stats.maxTime).toBe(200);
    });

    it('should track different middleware independently', () => {
      collector.recordMiddleware('auth', 100);
      collector.recordMiddleware('auth', 150);
      collector.recordMiddleware('cors', 30);

      const report = collector.report();
      expect(report.middleware.length).toBe(2);
    });
  });

  describe('Report Generation', () => {
    it('should generate report with all metrics', () => {
      collector.recordRoute('/api/users', 100, 512);
      const token: Token = 'UserService';
      collector.recordProvider(token, 150);
      collector.recordMiddleware('auth', 50);

      const report = collector.report();

      expect(report.routes.length).toBe(1);
      expect(report.providers.length).toBe(1);
      expect(report.middleware.length).toBe(1);
      expect(report.timestamp).toBeDefined();
      expect(report.timestamp).toBeGreaterThan(0);
    });

    it('should sort routes by avgTime descending', () => {
      collector.recordRoute('/api/fast', 50, 512);
      collector.recordRoute('/api/slow', 200, 512);
      collector.recordRoute('/api/medium', 100, 512);

      const report = collector.report();
      const avgTimes = report.routes.map(r => r.avgTime);

      expect(avgTimes).toEqual([200, 100, 50]);
    });

    it('should sort providers by avgTime descending', () => {
      const token1: Token = 'Fast';
      const token2: Token = 'Slow';
      const token3: Token = 'Medium';

      collector.recordProvider(token1, 50);
      collector.recordProvider(token2, 200);
      collector.recordProvider(token3, 100);

      const report = collector.report();
      const avgTimes = report.providers.map(p => p.avgTime);

      expect(avgTimes).toEqual([200, 100, 50]);
    });

    it('should clear metrics after report', () => {
      collector.recordRoute('/api/users', 100, 512);

      const report1 = collector.report();
      expect(report1.routes.length).toBe(1);

      const report2 = collector.report();
      expect(report2.routes.length).toBe(0);
      expect(report2.providers.length).toBe(0);
      expect(report2.middleware.length).toBe(0);
    });
  });

  describe('Clear Method', () => {
    it('should clear all metrics', () => {
      collector.recordRoute('/api/users', 100, 512);
      const token: Token = 'Service';
      collector.recordProvider(token, 150);
      collector.recordMiddleware('auth', 50);

      collector.clear();

      expect(collector.getRouteMetrics('/api/users')).toBeUndefined();
      expect(collector.getProviderMetrics(token)).toBeUndefined();

      const report = collector.report();
      expect(report.routes.length).toBe(0);
      expect(report.providers.length).toBe(0);
      expect(report.middleware.length).toBe(0);
    });
  });

  describe('Statistics Calculation', () => {
    it('should correctly calculate p99 for single record', () => {
      collector.recordRoute('/api/test', 1000, 512);

      const stats = collector.getRouteMetrics('/api/test');
      expect(stats?.p99Time).toBe(1000 * 0.99);
    });

    it('should handle zero duration metrics', () => {
      collector.recordRoute('/api/instant', 0, 512);

      const stats = collector.getRouteMetrics('/api/instant');
      expect(stats?.totalTime).toBe(0);
      expect(stats?.avgTime).toBe(0);
      expect(stats?.minTime).toBe(0);
      expect(stats?.maxTime).toBe(0);
    });

    it('should handle large numbers', () => {
      const largeNumber = 9999999;
      collector.recordRoute('/api/large', largeNumber, 512);

      const stats = collector.getRouteMetrics('/api/large');
      expect(stats?.totalTime).toBe(largeNumber);
      expect(stats?.avgTime).toBe(largeNumber);
    });
  });

  describe('Edge Cases', () => {
    it('should handle many routes', () => {
      for (let i = 0; i < 100; i++) {
        collector.recordRoute(`/api/route${i}`, 100 + i, 512);
      }

      const report = collector.report();
      expect(report.routes.length).toBe(100);
    });

    it('should handle many providers', () => {
      for (let i = 0; i < 50; i++) {
        collector.recordProvider(`Service${i}` as Token, 100);
      }

      const report = collector.report();
      expect(report.providers.length).toBe(50);
    });

    it('should handle empty path string', () => {
      collector.recordRoute('', 100, 512);

      const stats = collector.getRouteMetrics('');
      expect(stats?.path).toBe('');
    });

    it('should handle duplicate reports', () => {
      collector.recordRoute('/api/test', 100, 512);

      const report1 = collector.report();
      const report2 = collector.report();

      expect(report1.routes.length).toBe(1);
      expect(report2.routes.length).toBe(0);
    });
  });
});
