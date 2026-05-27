import type { OptimizationConfig } from './types.js';

/**
 * Deep merge utility for nested objects
 */
function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key];
      const targetValue = target[key];

      if (
        sourceValue &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue) &&
        targetValue &&
        typeof targetValue === 'object' &&
        !Array.isArray(targetValue)
      ) {
        result[key] = deepMerge(
          targetValue as Record<string, any>,
          sourceValue as Record<string, any>
        ) as any;
      } else if (sourceValue !== undefined) {
        result[key] = sourceValue as any;
      }
    }
  }

  return result;
}

/**
 * Get the default optimization configuration for a given environment
 *
 * Development: Layer1 enabled only
 * Production: Layer1 and Layer2 enabled
 * Layer3: Only enabled if ENABLE_PROFILING env var is 'true'
 *
 * @param environment - The environment ('development', 'production', etc.)
 * @param partial - Optional partial configuration to merge with defaults
 * @returns The complete optimization configuration
 */
export function defaultOptimizationConfig(
  environment: string = 'development',
  partial?: Partial<OptimizationConfig>
): OptimizationConfig {
  const isProduction = environment === 'production';
  const enableProfiling = process.env.ENABLE_PROFILING === 'true';

  const defaults: OptimizationConfig = {
    layer1: {
      enabled: true,
    },
    layer2: {
      enabled: isProduction,
      caching: {
        enabled: isProduction,
        ttl: 300,
      },
      middlewareChain: isProduction,
      di: {
        memoization: isProduction,
      },
      memory: {
        pooling: isProduction,
        poolSize: 100,
      },
    },
    layer3: {
      enabled: enableProfiling,
      metricsPort: 9090,
      sampleSize: 100,
    },
  };

  if (!partial) {
    return defaults;
  }

  return deepMerge(defaults, partial);
}
