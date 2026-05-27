import { describe, it, expect, beforeEach } from 'vitest';
import { defaultOptimizationConfig } from '../config.js';
import type { OptimizationConfig } from '../types.js';

describe('Optimization Config', () => {
  beforeEach(() => {
    delete process.env.ENABLE_PROFILING;
  });

  describe('defaultOptimizationConfig', () => {
    it('should return development defaults when environment is "development"', () => {
      const config = defaultOptimizationConfig('development');

      expect(config.layer1.enabled).toBe(true);
      expect(config.layer2.enabled).toBe(false);
      expect(config.layer3.enabled).toBe(false);
    });

    it('should return production defaults when environment is "production"', () => {
      const config = defaultOptimizationConfig('production');

      expect(config.layer1.enabled).toBe(true);
      expect(config.layer2.enabled).toBe(true);
      expect(config.layer3.enabled).toBe(false);
    });

    it('should enable layer2 caching in production with default TTL', () => {
      const config = defaultOptimizationConfig('production');

      expect(config.layer2.caching.enabled).toBe(true);
      expect(config.layer2.caching.ttl).toBe(300);
    });

    it('should set layer2 memory poolSize to 100 by default', () => {
      const config = defaultOptimizationConfig('production');

      expect(config.layer2.memory.poolSize).toBe(100);
    });

    it('should set layer3 metricsPort to 9090 when enabled', () => {
      process.env.ENABLE_PROFILING = 'true';
      const config = defaultOptimizationConfig('production');

      expect(config.layer3.enabled).toBe(true);
      expect(config.layer3.metricsPort).toBe(9090);
    });

    it('should set layer3 sampleSize to 100 when enabled', () => {
      process.env.ENABLE_PROFILING = 'true';
      const config = defaultOptimizationConfig('production');

      expect(config.layer3.sampleSize).toBe(100);
    });

    it('should disable layer3 when ENABLE_PROFILING is not set or false', () => {
      const config1 = defaultOptimizationConfig('production');
      expect(config1.layer3.enabled).toBe(false);

      process.env.ENABLE_PROFILING = 'false';
      const config2 = defaultOptimizationConfig('production');
      expect(config2.layer3.enabled).toBe(false);
    });

    it('should merge partial config with defaults for development', () => {
      const partial: Partial<OptimizationConfig> = {
        layer1: {
          enabled: false,
        },
      };
      const config = defaultOptimizationConfig('development', partial);

      expect(config.layer1.enabled).toBe(false);
      expect(config.layer2.enabled).toBe(false);
      expect(config.layer3.enabled).toBe(false);
    });

    it('should merge partial config with defaults for production', () => {
      const partial: Partial<OptimizationConfig> = {
        layer2: {
          caching: {
            ttl: 600,
          },
        },
      };
      const config = defaultOptimizationConfig('production', partial);

      expect(config.layer1.enabled).toBe(true);
      expect(config.layer2.enabled).toBe(true);
      expect(config.layer2.caching.ttl).toBe(600);
      expect(config.layer2.caching.enabled).toBe(true);
      expect(config.layer2.memory.poolSize).toBe(100);
    });

    it('should deep merge nested config objects', () => {
      const partial: Partial<OptimizationConfig> = {
        layer2: {
          memory: {
            poolSize: 200,
          },
        },
      };
      const config = defaultOptimizationConfig('production', partial);

      expect(config.layer2.enabled).toBe(true);
      expect(config.layer2.memory.poolSize).toBe(200);
      expect(config.layer2.caching.ttl).toBe(300);
    });

    it('should use defaults when no environment is provided', () => {
      const config = defaultOptimizationConfig();

      expect(config.layer1.enabled).toBe(true);
      expect(config.layer2.enabled).toBe(false);
      expect(config.layer3.enabled).toBe(false);
    });
  });
});
