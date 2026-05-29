import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DeveloperDashboard } from '../../dev/dashboard/server.js';
import { RequestCapture } from '../../dev/debug/request-capture.js';
import { ModuleGraph } from '../../dev/debug/module-graph.js';
import type { ModuleDependency, WebSocketMessage } from '../../dev/types.js';

describe('DeveloperDashboard', () => {
  let dashboard: DeveloperDashboard;
  let requestCapture: RequestCapture;
  let moduleGraph: ModuleGraph;

  beforeEach(() => {
    requestCapture = new RequestCapture();
    moduleGraph = new ModuleGraph();
    dashboard = new DeveloperDashboard(requestCapture, moduleGraph);
    // Set NODE_ENV to development for tests
    process.env.NODE_ENV = 'development';
  });

  afterEach(() => {
    dashboard.closeAllConnections();
  });

  describe('initialization', () => {
    it('should initialize with default RequestCapture and ModuleGraph', () => {
      const defaultDashboard = new DeveloperDashboard();
      expect(defaultDashboard.getRequestCapture()).toBeDefined();
      expect(defaultDashboard.getModuleGraph()).toBeDefined();
      expect(defaultDashboard.getActiveConnections()).toBe(0);
    });

    it('should initialize with provided RequestCapture and ModuleGraph', () => {
      expect(dashboard.getRequestCapture()).toBe(requestCapture);
      expect(dashboard.getModuleGraph()).toBe(moduleGraph);
    });

    it('should start with no active WebSocket connections', () => {
      expect(dashboard.getActiveConnections()).toBe(0);
    });
  });

  describe('formatRequests', () => {
    it('should format requests without sensitive data', () => {
      const snapshot = requestCapture.createSnapshot('GET', '/users', { id: '123' }, {});
      snapshot.status = 200;
      snapshot.responseTime = 45;
      requestCapture.addSnapshot(snapshot);

      // Access private method through handleApiRequests simulation
      const req = { method: 'GET', url: '/__dev/api/requests' };
      const res = {
        statusCode: 200,
        setHeader: vi.fn(),
        end: vi.fn(),
      };

      dashboard.handleApiRequests(req, res);

      const responseBody = res.end.mock.calls[0][0];
      const formatted = JSON.parse(responseBody);

      expect(Array.isArray(formatted)).toBe(true);
      expect(formatted).toHaveLength(1);
      expect(formatted[0].id).toBe(snapshot.id);
      expect(formatted[0].method).toBe('GET');
      expect(formatted[0].path).toBe('/users');
      expect(formatted[0].status).toBe(200);
      expect(formatted[0].responseTime).toBe(45);
    });

    it('should include error messages in formatted requests', () => {
      const snapshot = requestCapture.createSnapshot('POST', '/data', {}, {});
      snapshot.status = 500;
      snapshot.errorMessage = 'Internal Server Error';
      requestCapture.addSnapshot(snapshot);

      const req = { method: 'GET', url: '/__dev/api/requests' };
      const res = {
        statusCode: 200,
        setHeader: vi.fn(),
        end: vi.fn(),
      };

      dashboard.handleApiRequests(req, res);

      const responseBody = res.end.mock.calls[0][0];
      const formatted = JSON.parse(responseBody);

      expect(formatted[0].errorMessage).toBe('Internal Server Error');
    });
  });

  describe('formatModules', () => {
    it('should format modules with counts', () => {
      const module: ModuleDependency = {
        id: 'mod-1',
        filepath: '/src/user.controller.ts',
        imports: ['/src/user.service.ts', '/src/user.dto.ts'],
        importedBy: ['/src/app.module.ts'],
        type: 'controller',
        exports: ['UserController'],
      };
      moduleGraph.addDependency(module);

      const req = { method: 'GET', url: '/__dev/api/modules' };
      const res = {
        statusCode: 200,
        setHeader: vi.fn(),
        end: vi.fn(),
      };

      dashboard.handleApiModules(req, res);

      const responseBody = res.end.mock.calls[0][0];
      const formatted = JSON.parse(responseBody);

      expect(Array.isArray(formatted)).toBe(true);
      expect(formatted).toHaveLength(1);
      expect(formatted[0].id).toBe('mod-1');
      expect(formatted[0].filepath).toBe('/src/user.controller.ts');
      expect(formatted[0].type).toBe('controller');
      expect(formatted[0].imports).toBe(2);
      expect(formatted[0].importedBy).toBe(1);
      expect(formatted[0].exports).toBe(1);
    });
  });

  describe('getMetrics', () => {
    it('should calculate correct metrics from requests', () => {
      const snap1 = requestCapture.createSnapshot('GET', '/users', {}, {});
      snap1.status = 200;
      snap1.responseTime = 50;
      requestCapture.addSnapshot(snap1);

      const snap2 = requestCapture.createSnapshot('POST', '/users', {}, {});
      snap2.status = 201;
      snap2.responseTime = 100;
      requestCapture.addSnapshot(snap2);

      const snap3 = requestCapture.createSnapshot('DELETE', '/users/1', {}, {});
      snap3.status = 500;
      snap3.responseTime = 25;
      requestCapture.addSnapshot(snap3);

      const req = { method: 'GET', url: '/__dev/api/metrics' };
      const res = {
        statusCode: 200,
        setHeader: vi.fn(),
        end: vi.fn(),
      };

      dashboard.handleApiMetrics(req, res);

      const responseBody = res.end.mock.calls[0][0];
      const metrics = JSON.parse(responseBody);

      expect(metrics.totalRequests).toBe(3);
      expect(metrics.successfulRequests).toBe(2);
      expect(metrics.failedRequests).toBe(1);
      expect(metrics.slowestRequest).toBe(100);
      expect(metrics.fastestRequest).toBe(25);
      // Average is rounded to 2 decimal places
      expect(metrics.averageResponseTime).toBe(58.33);
    });

    it('should include module metrics', () => {
      const module: ModuleDependency = {
        id: 'mod-1',
        filepath: '/src/app.ts',
        imports: [],
        importedBy: [],
        type: 'module',
        exports: [],
      };
      moduleGraph.addDependency(module);

      const req = { method: 'GET', url: '/__dev/api/metrics' };
      const res = {
        statusCode: 200,
        setHeader: vi.fn(),
        end: vi.fn(),
      };

      dashboard.handleApiMetrics(req, res);

      const responseBody = res.end.mock.calls[0][0];
      const metrics = JSON.parse(responseBody);

      expect(metrics.totalModules).toBe(1);
    });

    it('should cache metrics for 5 seconds', () => {
      const snap1 = requestCapture.createSnapshot('GET', '/test', {}, {});
      snap1.status = 200;
      snap1.responseTime = 10;
      requestCapture.addSnapshot(snap1);

      const req1 = { method: 'GET', url: '/__dev/api/metrics' };
      const res1 = {
        statusCode: 200,
        setHeader: vi.fn(),
        end: vi.fn(),
      };

      dashboard.handleApiMetrics(req1, res1);
      JSON.parse(res1.end.mock.calls[0][0] as string);

      // Add another request
      const snap2 = requestCapture.createSnapshot('POST', '/test', {}, {});
      snap2.status = 201;
      snap2.responseTime = 20;
      requestCapture.addSnapshot(snap2);

      // Request metrics again immediately (within cache window)
      const req2 = { method: 'GET', url: '/__dev/api/metrics' };
      const res2 = {
        statusCode: 200,
        setHeader: vi.fn(),
        end: vi.fn(),
      };

      dashboard.handleApiMetrics(req2, res2);
      const metrics2 = JSON.parse(res2.end.mock.calls[0][0]);

      // Metrics should still show only 1 request (cached)
      expect(metrics2.totalRequests).toBe(1);
    });
  });

  describe('getRequestById', () => {
    it('should retrieve request by ID', () => {
      const snapshot = requestCapture.createSnapshot('GET', '/test', {}, {});
      requestCapture.addSnapshot(snapshot);

      const req = { method: 'GET', url: `/__dev/api/requests/${snapshot.id}` };
      const res = {
        statusCode: 200,
        setHeader: vi.fn(),
        end: vi.fn(),
      };

      dashboard.handleApiRequestDetail(req, res, snapshot.id);

      expect(res.statusCode).toBe(200);
      const responseBody = res.end.mock.calls[0][0];
      const retrieved = JSON.parse(responseBody);

      expect(retrieved.id).toBe(snapshot.id);
      expect(retrieved.method).toBe('GET');
      expect(retrieved.path).toBe('/test');
    });

    it('should return 404 for non-existent request', () => {
      const req = { method: 'GET', url: '/__dev/api/requests/invalid-id' };
      const res = {
        statusCode: 200,
        setHeader: vi.fn(),
        end: vi.fn(),
      };

      dashboard.handleApiRequestDetail(req, res, 'invalid-id');

      expect(res.statusCode).toBe(404);
    });
  });

  describe('handleDashboardRequest', () => {
    it('should return HTML dashboard', () => {
      const req = { method: 'GET', url: '/__dev' };
      const res = {
        statusCode: 200,
        setHeader: vi.fn(),
        end: vi.fn(),
      };

      dashboard.handleDashboardRequest(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/html; charset=utf-8');
      const html = res.end.mock.calls[0][0];
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Development Dashboard');
    });

    it('should return 403 when NODE_ENV is not development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const req = { method: 'GET', url: '/__dev' };
      const res = {
        statusCode: 200,
        setHeader: vi.fn(),
        end: vi.fn(),
      };

      dashboard.handleDashboardRequest(req, res);

      expect(res.statusCode).toBe(403);
      expect(res.end).toHaveBeenCalledWith('Forbidden');

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('handleApiRequests', () => {
    it('should return list of requests', () => {
      const snap1 = requestCapture.createSnapshot('GET', '/users', {}, {});
      const snap2 = requestCapture.createSnapshot('POST', '/users', {}, {});
      requestCapture.addSnapshot(snap1);
      requestCapture.addSnapshot(snap2);

      const req = { method: 'GET', url: '/__dev/api/requests' };
      const res = {
        statusCode: 200,
        setHeader: vi.fn(),
        end: vi.fn(),
      };

      dashboard.handleApiRequests(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
      const responseBody = res.end.mock.calls[0][0];
      const requests = JSON.parse(responseBody);

      expect(Array.isArray(requests)).toBe(true);
      expect(requests).toHaveLength(2);
    });

    it('should return 403 when NODE_ENV is not development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const req = { method: 'GET', url: '/__dev/api/requests' };
      const res = {
        statusCode: 200,
        setHeader: vi.fn(),
        end: vi.fn(),
      };

      dashboard.handleApiRequests(req, res);

      expect(res.statusCode).toBe(403);
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('handleApiModules', () => {
    it('should return list of modules', () => {
      const mod1: ModuleDependency = {
        id: 'mod-1',
        filepath: '/src/app.ts',
        imports: ['/src/config.ts'],
        importedBy: [],
        type: 'module',
        exports: ['App'],
      };
      moduleGraph.addDependency(mod1);

      const req = { method: 'GET', url: '/__dev/api/modules' };
      const res = {
        statusCode: 200,
        setHeader: vi.fn(),
        end: vi.fn(),
      };

      dashboard.handleApiModules(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
      const responseBody = res.end.mock.calls[0][0];
      const modules = JSON.parse(responseBody);

      expect(Array.isArray(modules)).toBe(true);
      expect(modules).toHaveLength(1);
      expect(modules[0].filepath).toBe('/src/app.ts');
    });
  });

  describe('handleApiMetrics', () => {
    it('should return metrics object', () => {
      const req = { method: 'GET', url: '/__dev/api/metrics' };
      const res = {
        statusCode: 200,
        setHeader: vi.fn(),
        end: vi.fn(),
      };

      dashboard.handleApiMetrics(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
      const responseBody = res.end.mock.calls[0][0];
      const metrics = JSON.parse(responseBody);

      expect(metrics).toHaveProperty('totalRequests');
      expect(metrics).toHaveProperty('successfulRequests');
      expect(metrics).toHaveProperty('failedRequests');
      expect(metrics).toHaveProperty('averageResponseTime');
      expect(metrics).toHaveProperty('slowestRequest');
      expect(metrics).toHaveProperty('fastestRequest');
      expect(metrics).toHaveProperty('totalModules');
      expect(metrics).toHaveProperty('totalCircularDependencies');
    });
  });

  describe('WebSocket handling', () => {
    it('should handle WebSocket connection', () => {
      const ws = {
        send: vi.fn(),
        on: vi.fn(),
        close: vi.fn(),
      };

      dashboard.handleWebSocket(ws);

      expect(dashboard.getActiveConnections()).toBe(1);
      expect(ws.on).toHaveBeenCalledWith('message', expect.any(Function));
      expect(ws.on).toHaveBeenCalledWith('close', expect.any(Function));
    });

    it('should handle subscribe message', () => {
      const ws = {
        send: vi.fn(),
        on: vi.fn(),
        close: vi.fn(),
      };

      let messageHandler: ((data: Buffer) => void) | null = null;
      ws.on.mockImplementation((event: string, handler: any) => {
        if (event === 'message') {
          messageHandler = handler;
        }
      });

      dashboard.handleWebSocket(ws);

      const message: WebSocketMessage = {
        type: 'subscribe',
        channels: ['request:captured', 'metrics:updated'],
      };

      if (messageHandler && typeof messageHandler === 'function') {
        messageHandler(Buffer.from(JSON.stringify(message)));
      }

      expect(ws.send).not.toHaveBeenCalled();
    });

    it('should handle ping message', () => {
      const ws = {
        send: vi.fn(),
        on: vi.fn(),
        close: vi.fn(),
      };

      let messageHandler: ((data: Buffer) => void) | null = null;
      ws.on.mockImplementation((event: string, handler: any) => {
        if (event === 'message') {
          messageHandler = handler;
        }
      });

      dashboard.handleWebSocket(ws);

      const message: WebSocketMessage = {
        type: 'ping',
      };

      if (messageHandler && typeof messageHandler === 'function') {
        messageHandler(Buffer.from(JSON.stringify(message)));
      }

      expect(ws.send).toHaveBeenCalled();
    });

    it('should close connection on security violation', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const ws = {
        send: vi.fn(),
        on: vi.fn(),
        close: vi.fn(),
      };

      dashboard.handleWebSocket(ws);

      expect(ws.close).toHaveBeenCalledWith(1008, 'Forbidden');

      process.env.NODE_ENV = originalEnv;
    });

    it('should track active connections', () => {
      expect(dashboard.getActiveConnections()).toBe(0);

      const ws1 = { send: vi.fn(), on: vi.fn(), close: vi.fn() };
      const ws2 = { send: vi.fn(), on: vi.fn(), close: vi.fn() };

      dashboard.handleWebSocket(ws1);
      expect(dashboard.getActiveConnections()).toBe(1);

      dashboard.handleWebSocket(ws2);
      expect(dashboard.getActiveConnections()).toBe(2);
    });

    it('should remove connection on close', () => {
      const ws = {
        send: vi.fn(),
        on: vi.fn(),
        close: vi.fn(),
      };

      let closeHandler: (() => void) | null = null;
      ws.on.mockImplementation((event: string, handler: any) => {
        if (event === 'close') {
          closeHandler = handler;
        }
      });

      dashboard.handleWebSocket(ws);
      expect(dashboard.getActiveConnections()).toBe(1);

      if (closeHandler) {
        closeHandler();
      }

      expect(dashboard.getActiveConnections()).toBe(0);
    });

    it('should broadcast events to subscribed clients', () => {
      const ws1 = { send: vi.fn(), on: vi.fn(), close: vi.fn() };
      const ws2 = { send: vi.fn(), on: vi.fn(), close: vi.fn() };

      let messageHandler1: ((data: Buffer) => void) | null = null;

      ws1.on.mockImplementation((event: string, handler: (data: Buffer) => void) => {
        if (event === 'message') {
          messageHandler1 = handler;
        }
      });

      ws2.on.mockImplementation((_event: string, _handler: (data: Buffer) => void) => {
        // messageHandler2 not needed for this test
      });

      dashboard.handleWebSocket(ws1);
      dashboard.handleWebSocket(ws2);

      // Subscribe ws1 to request:captured
      const subscribeMsg: WebSocketMessage = {
        type: 'subscribe',
        channels: ['request:captured'],
      };

      if (messageHandler1) {
        messageHandler1(Buffer.from(JSON.stringify(subscribeMsg)));
      }

      // Broadcast event
      dashboard.broadcastEvent({
        type: 'request:captured',
        data: { id: '123', method: 'GET' },
      });

      expect(ws1.send).toHaveBeenCalled();
      expect(ws2.send).not.toHaveBeenCalled();
    });
  });

  describe('closeAllConnections', () => {
    it('should close all active connections', () => {
      const ws1 = { send: vi.fn(), on: vi.fn(), close: vi.fn() };
      const ws2 = { send: vi.fn(), on: vi.fn(), close: vi.fn() };

      dashboard.handleWebSocket(ws1);
      dashboard.handleWebSocket(ws2);

      expect(dashboard.getActiveConnections()).toBe(2);

      dashboard.closeAllConnections();

      expect(dashboard.getActiveConnections()).toBe(0);
    });
  });
});
