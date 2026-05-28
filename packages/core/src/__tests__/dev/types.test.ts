import { describe, it, expect } from 'vitest';
import type {
  RequestSnapshot,
  ModuleDependency,
  MiddlewareTrace,
  HandlerTrace,
  WatcherConfig,
  DevToolingConfig,
} from '../../dev/types.js';

describe('dev/types', () => {
  it('should export RequestSnapshot type', () => {
    const middlewareTrace: MiddlewareTrace = {
      name: 'auth',
      duration: 10,
      index: 0,
    };
    const snapshot: RequestSnapshot = {
      id: 'test-id',
      timestamp: Date.now(),
      method: 'GET',
      path: '/test',
      query: {},
      body: undefined,
      headers: {},
      status: 200,
      responseTime: 10,
      middlewareTraces: [middlewareTrace],
      handlerTrace: {
        controller: 'TestController',
        method: 'test',
        duration: 5,
      },
    };
    expect(snapshot.id).toBe('test-id');
  });

  it('should export ModuleDependency type', () => {
    const handlerTrace: HandlerTrace = {
      controller: 'UserController',
      method: 'getUser',
      duration: 25,
      resultSize: 1024,
    };
    const dep: ModuleDependency = {
      id: 'mod-1',
      filepath: '/src/services/user.ts',
      imports: ['/src/database.ts'],
      importedBy: ['/src/controllers/user.ts'],
      type: 'service',
      exports: ['UserService'],
    };
    expect(dep.type).toBe('service');
    expect(handlerTrace.method).toBe('getUser');
  });

  it('should export DevToolingConfig type', () => {
    const watcherConfig: WatcherConfig = {
      enabled: true,
      directories: ['src', 'test'],
      excludePatterns: ['*.spec.ts'],
      debounceMs: 500,
    };
    const config: DevToolingConfig = {
      enabled: true,
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
    expect(config.enabled).toBe(true);
    expect(watcherConfig.enabled).toBe(true);
  });
});
