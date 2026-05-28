import { describe, it, expect, beforeEach } from 'vitest';
import { RequestCapture } from '../../dev/debug/request-capture.js';
import type { RequestSnapshot, MiddlewareTrace, HandlerTrace } from '../../dev/types.js';

describe('RequestCapture', () => {
  let capture: RequestCapture;

  beforeEach(() => {
    capture = new RequestCapture();
  });

  describe('createSnapshot', () => {
    it('should create a snapshot with correct properties', () => {
      const method = 'GET';
      const path = '/users';
      const query = { id: '123' };
      const headers = { 'content-type': 'application/json' };

      const snapshot = capture.createSnapshot(method, path, query, headers);

      expect(snapshot.id).toBeDefined();
      expect(snapshot.id).toMatch(/^[0-9a-f-]+$/);
      expect(snapshot.method).toBe(method);
      expect(snapshot.path).toBe(path);
      expect(snapshot.query).toEqual(query);
      expect(snapshot.headers).toEqual(headers);
      expect(snapshot.status).toBe(200);
      expect(snapshot.responseTime).toBe(0);
      expect(snapshot.middlewareTraces).toEqual([]);
      expect(snapshot.handlerTrace).toEqual({ controller: '', method: '', duration: 0 });
      expect(snapshot.timestamp).toBeDefined();
    });

    it('should create snapshot with optional body', () => {
      const body = { name: 'John', age: 30 };
      const snapshot = capture.createSnapshot('POST', '/users', {}, {}, body);

      expect(snapshot.body).toEqual(body);
    });

    it('should generate unique IDs for each snapshot', () => {
      const snapshot1 = capture.createSnapshot('GET', '/test1', {}, {});
      const snapshot2 = capture.createSnapshot('GET', '/test2', {}, {});

      expect(snapshot1.id).not.toBe(snapshot2.id);
    });
  });

  describe('addSnapshot', () => {
    it('should add snapshot to buffer and map', () => {
      const snapshot = capture.createSnapshot('GET', '/users', {}, {});
      capture.addSnapshot(snapshot);

      expect(capture.getSnapshotById(snapshot.id)).toEqual(snapshot);
    });

    it('should maintain buffer order', () => {
      const snapshot1 = capture.createSnapshot('GET', '/path1', {}, {});
      const snapshot2 = capture.createSnapshot('GET', '/path2', {}, {});
      const snapshot3 = capture.createSnapshot('GET', '/path3', {}, {});

      capture.addSnapshot(snapshot1);
      capture.addSnapshot(snapshot2);
      capture.addSnapshot(snapshot3);

      const history = capture.getHistory();
      expect(history[0].path).toBe('/path1');
      expect(history[1].path).toBe('/path2');
      expect(history[2].path).toBe('/path3');
    });

    it('should remove oldest snapshot when buffer exceeds maxSize', () => {
      for (let i = 0; i < 101; i++) {
        const snapshot = capture.createSnapshot('GET', `/path${i}`, {}, {});
        capture.addSnapshot(snapshot);
      }

      const history = capture.getHistory();
      expect(history.length).toBe(100);
      expect(history[0].path).toBe('/path1');
      expect(history[99].path).toBe('/path100');
    });

    it('should keep snapshotMap in sync with buffer', () => {
      const snapshots: RequestSnapshot[] = [];
      for (let i = 0; i < 105; i++) {
        const snapshot = capture.createSnapshot('GET', `/path${i}`, {}, {});
        snapshots.push(snapshot);
        capture.addSnapshot(snapshot);
      }

      const history = capture.getHistory();
      for (const snapshot of history) {
        expect(capture.getSnapshotById(snapshot.id)).toEqual(snapshot);
      }
    });
  });

  describe('getHistory', () => {
    it('should return empty array when no snapshots added', () => {
      const history = capture.getHistory();
      expect(history).toEqual([]);
    });

    it('should return copy of buffer, not reference', () => {
      const snapshot = capture.createSnapshot('GET', '/test', {}, {});
      capture.addSnapshot(snapshot);

      const history1 = capture.getHistory();
      const history2 = capture.getHistory();

      expect(history1).toEqual(history2);
      expect(history1).not.toBe(history2);
    });

    it('should return snapshots in insertion order', () => {
      const snapshots = [
        capture.createSnapshot('GET', '/a', {}, {}),
        capture.createSnapshot('POST', '/b', {}, {}),
        capture.createSnapshot('PUT', '/c', {}, {}),
      ];

      snapshots.forEach(s => capture.addSnapshot(s));

      const history = capture.getHistory();
      expect(history.map(s => s.method)).toEqual(['GET', 'POST', 'PUT']);
    });
  });

  describe('getSnapshotById', () => {
    it('should return snapshot by ID', () => {
      const snapshot = capture.createSnapshot('GET', '/users', {}, {});
      capture.addSnapshot(snapshot);

      const retrieved = capture.getSnapshotById(snapshot.id);
      expect(retrieved).toEqual(snapshot);
    });

    it('should return undefined for non-existent ID', () => {
      const result = capture.getSnapshotById('non-existent-id');
      expect(result).toBeUndefined();
    });

    it('should return undefined after snapshot is removed from buffer', () => {
      const firstSnapshots: string[] = [];
      for (let i = 0; i < 101; i++) {
        const snapshot = capture.createSnapshot('GET', `/path${i}`, {}, {});
        if (i === 0) {
          firstSnapshots.push(snapshot.id);
        }
        capture.addSnapshot(snapshot);
      }

      // The first snapshot should be removed from the map
      const oldId = firstSnapshots[0];
      expect(capture.getSnapshotById(oldId)).toBeUndefined();
    });
  });

  describe('clear', () => {
    it('should clear buffer and map', () => {
      const snapshot1 = capture.createSnapshot('GET', '/test1', {}, {});
      const snapshot2 = capture.createSnapshot('GET', '/test2', {}, {});

      capture.addSnapshot(snapshot1);
      capture.addSnapshot(snapshot2);

      capture.clear();

      expect(capture.getHistory()).toEqual([]);
      expect(capture.getSnapshotById(snapshot1.id)).toBeUndefined();
      expect(capture.getSnapshotById(snapshot2.id)).toBeUndefined();
    });

    it('should allow adding snapshots after clear', () => {
      const snapshot1 = capture.createSnapshot('GET', '/test1', {}, {});
      capture.addSnapshot(snapshot1);
      capture.clear();

      const snapshot2 = capture.createSnapshot('GET', '/test2', {}, {});
      capture.addSnapshot(snapshot2);

      expect(capture.getHistory()).toEqual([snapshot2]);
      expect(capture.getSnapshotById(snapshot2.id)).toEqual(snapshot2);
    });
  });

  describe('addMiddlewareTrace', () => {
    it('should add middleware trace to snapshot', () => {
      const snapshot = capture.createSnapshot('GET', '/users', {}, {});
      const trace: MiddlewareTrace = {
        name: 'auth',
        duration: 10,
        index: 0,
      };

      capture.addMiddlewareTrace(snapshot, trace);

      expect(snapshot.middlewareTraces).toHaveLength(1);
      expect(snapshot.middlewareTraces[0]).toEqual(trace);
    });

    it('should add multiple middleware traces in order', () => {
      const snapshot = capture.createSnapshot('GET', '/users', {}, {});
      const trace1: MiddlewareTrace = { name: 'auth', duration: 10, index: 0 };
      const trace2: MiddlewareTrace = { name: 'cors', duration: 5, index: 1 };
      const trace3: MiddlewareTrace = { name: 'logging', duration: 3, index: 2 };

      capture.addMiddlewareTrace(snapshot, trace1);
      capture.addMiddlewareTrace(snapshot, trace2);
      capture.addMiddlewareTrace(snapshot, trace3);

      expect(snapshot.middlewareTraces).toHaveLength(3);
      expect(snapshot.middlewareTraces[0].name).toBe('auth');
      expect(snapshot.middlewareTraces[1].name).toBe('cors');
      expect(snapshot.middlewareTraces[2].name).toBe('logging');
    });
  });

  describe('updateHandlerTrace', () => {
    it('should update handler trace', () => {
      const snapshot = capture.createSnapshot('GET', '/users', {}, {});
      const trace: HandlerTrace = {
        controller: 'UserController',
        method: 'getUsers',
        duration: 25,
        resultSize: 1024,
      };

      capture.updateHandlerTrace(snapshot, trace);

      expect(snapshot.handlerTrace).toEqual(trace);
    });

    it('should replace existing handler trace', () => {
      const snapshot = capture.createSnapshot('GET', '/users', {}, {});
      const trace1: HandlerTrace = {
        controller: 'UserController',
        method: 'getUsers',
        duration: 25,
      };
      const trace2: HandlerTrace = {
        controller: 'UserController',
        method: 'getUsers',
        duration: 30,
        resultSize: 2048,
      };

      capture.updateHandlerTrace(snapshot, trace1);
      expect(snapshot.handlerTrace.duration).toBe(25);

      capture.updateHandlerTrace(snapshot, trace2);
      expect(snapshot.handlerTrace.duration).toBe(30);
      expect(snapshot.handlerTrace.resultSize).toBe(2048);
    });
  });

  describe('updateResponse', () => {
    it('should update status and responseTime', () => {
      const snapshot = capture.createSnapshot('GET', '/users', {}, {});

      capture.updateResponse(snapshot, 201, 45);

      expect(snapshot.status).toBe(201);
      expect(snapshot.responseTime).toBe(45);
    });

    it('should update to error status', () => {
      const snapshot = capture.createSnapshot('GET', '/users', {}, {});

      capture.updateResponse(snapshot, 500, 10);

      expect(snapshot.status).toBe(500);
      expect(snapshot.responseTime).toBe(10);
    });

    it('should overwrite previous response data', () => {
      const snapshot = capture.createSnapshot('GET', '/users', {}, {});

      capture.updateResponse(snapshot, 200, 10);
      expect(snapshot.status).toBe(200);
      expect(snapshot.responseTime).toBe(10);

      capture.updateResponse(snapshot, 404, 15);
      expect(snapshot.status).toBe(404);
      expect(snapshot.responseTime).toBe(15);
    });
  });

  describe('setError', () => {
    it('should set error message', () => {
      const snapshot = capture.createSnapshot('GET', '/users', {}, {});
      const errorMsg = 'Database connection failed';

      capture.setError(snapshot, errorMsg);

      expect(snapshot.errorMessage).toBe(errorMsg);
    });

    it('should overwrite previous error message', () => {
      const snapshot = capture.createSnapshot('GET', '/users', {}, {});

      capture.setError(snapshot, 'First error');
      expect(snapshot.errorMessage).toBe('First error');

      capture.setError(snapshot, 'Second error');
      expect(snapshot.errorMessage).toBe('Second error');
    });

    it('should allow setting error with special characters', () => {
      const snapshot = capture.createSnapshot('GET', '/users', {}, {});
      const errorMsg = 'Error: "Connection timeout" at line 42\n Stack trace...';

      capture.setError(snapshot, errorMsg);

      expect(snapshot.errorMessage).toBe(errorMsg);
    });
  });

  describe('integration', () => {
    it('should handle complete request lifecycle', () => {
      const snapshot = capture.createSnapshot(
        'POST',
        '/users',
        { role: 'admin' },
        { 'x-token': 'abc123' },
        { name: 'John' }
      );

      const authTrace: MiddlewareTrace = { name: 'auth', duration: 5, index: 0 };
      const corsTrace: MiddlewareTrace = { name: 'cors', duration: 2, index: 1 };
      capture.addMiddlewareTrace(snapshot, authTrace);
      capture.addMiddlewareTrace(snapshot, corsTrace);

      const handlerTrace: HandlerTrace = {
        controller: 'UserController',
        method: 'createUser',
        duration: 20,
        resultSize: 512,
      };
      capture.updateHandlerTrace(snapshot, handlerTrace);

      capture.updateResponse(snapshot, 201, 35);

      capture.addSnapshot(snapshot);

      const retrieved = capture.getSnapshotById(snapshot.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.method).toBe('POST');
      expect(retrieved?.path).toBe('/users');
      expect(retrieved?.status).toBe(201);
      expect(retrieved?.middlewareTraces).toHaveLength(2);
      expect(retrieved?.handlerTrace.controller).toBe('UserController');
    });

    it('should track multiple requests independently', () => {
      const snap1 = capture.createSnapshot('GET', '/users', {}, {});
      const snap2 = capture.createSnapshot('POST', '/users', {}, {}, { name: 'Jane' });
      const snap3 = capture.createSnapshot('DELETE', '/users/1', {}, {});

      capture.addSnapshot(snap1);
      capture.addSnapshot(snap2);
      capture.addSnapshot(snap3);

      capture.updateResponse(snap1, 200, 10);
      capture.updateResponse(snap2, 201, 20);
      capture.updateResponse(snap3, 204, 15);

      const hist = capture.getHistory();
      expect(hist).toHaveLength(3);
      expect(hist[0].status).toBe(200);
      expect(hist[1].status).toBe(201);
      expect(hist[2].status).toBe(204);
    });
  });
});
