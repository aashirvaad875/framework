import type { DevToolingConfig } from './types.js';

export function getDefaultDevToolingConfig(): DevToolingConfig {
  return {
    enabled: process.env.NODE_ENV === 'development',
    hotReload: {
      enabled: true,
      directories: ['src'],
      debounceMs: 300,
    },
    debug: {
      enabled: true,
      captureRequestBody: true,
      maxHistorySize: 100,
    },
    dashboard: {
      enabled: true,
      path: '/__dev',
      wsEnabled: true,
    },
  };
}

export function createDevToolingConfig(overrides?: Partial<DevToolingConfig>): DevToolingConfig {
  return {
    ...getDefaultDevToolingConfig(),
    ...overrides,
  };
}
