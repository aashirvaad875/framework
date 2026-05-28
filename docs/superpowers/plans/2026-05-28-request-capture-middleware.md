# Request Capture Middleware Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a RequestCapture class that provides middleware for capturing and storing request/response lifecycle snapshots in a circular buffer for developer tooling and debugging.

**Architecture:** The RequestCapture class acts as a centralized request/response capture system. It maintains a circular buffer of RequestSnapshot objects (max 100), provides methods for adding snapshots and tracing middleware/handler execution, and exposes query methods for debugging and telemetry. The class uses both an array buffer (for ordered access and history) and a Map (for O(1) ID lookups).

**Tech Stack:** TypeScript, Vitest, Node.js crypto (randomUUID)

---

## File Structure

**Files to create:**

- `packages/core/src/dev/debug/request-capture.ts` - RequestCapture class implementation
- `packages/core/src/__tests__/dev/request-capture.test.ts` - Test suite for RequestCapture

**Files to modify:**

- `packages/core/src/dev/debug/index.ts` - Export RequestCapture (new file if doesn't exist)

---

## Task 1: Create debug Directory Structure

**Files:**

- Create: `packages/core/src/dev/debug/` (directory)
- Create: `packages/core/src/dev/debug/index.ts` (export file)

- [ ] **Step 1: Create the debug directory**

```bash
mkdir -p /Users/ashikchalise/Documents/Office/framework/packages/core/src/dev/debug
```

- [ ] **Step 2: Create debug/index.ts with initial exports**

Create file `packages/core/src/dev/debug/index.ts`:

```typescript
export { RequestCapture } from './request-capture.js';
```

---

## Task 2: Implement RequestCapture Class with Buffer Management

**Files:**

- Create: `packages/core/src/dev/debug/request-capture.ts`

- [ ] **Step 1: Write the implementation structure**

Create file `packages/core/src/dev/debug/request-capture.ts`:

```typescript
import { randomUUID } from 'node:crypto';
import type { RequestSnapshot, MiddlewareTrace, HandlerTrace } from '../types.js';

export class RequestCapture {
  private buffer: RequestSnapshot[] = [];
  private maxSize: number = 100;
  private snapshotMap: Map<string, RequestSnapshot> = new Map();

  addSnapshot(snapshot: RequestSnapshot): void {
    this.buffer.push(snapshot);
    this.snapshotMap.set(snapshot.id, snapshot);

    if (this.buffer.length > this.maxSize) {
      const removed = this.buffer.shift();
      if (removed) {
        this.snapshotMap.delete(removed.id);
      }
    }
  }

  getHistory(): RequestSnapshot[] {
    return [...this.buffer];
  }

  getSnapshotById(id: string): RequestSnapshot | undefined {
    return this.snapshotMap.get(id);
  }

  clear(): void {
    this.buffer = [];
    this.snapshotMap.clear();
  }

  createSnapshot(
    method: string,
    path: string,
    query: Record<string, unknown>,
    headers: Record<string, string>,
    body?: unknown
  ): RequestSnapshot {
    return {
      id: randomUUID(),
      timestamp: Date.now(),
      method,
      path,
      query,
      body,
      headers,
      status: 200,
      responseTime: 0,
      middlewareTraces: [],
      handlerTrace: {
        controller: '',
        method: '',
        duration: 0,
      },
    };
  }

  addMiddlewareTrace(snapshot: RequestSnapshot, trace: MiddlewareTrace): void {
    snapshot.middlewareTraces.push(trace);
  }

  updateHandlerTrace(snapshot: RequestSnapshot, trace: HandlerTrace): void {
    snapshot.handlerTrace = trace;
  }

  updateResponse(snapshot: RequestSnapshot, status: number, responseTime: number): void {
    snapshot.status = status;
    snapshot.responseTime = responseTime;
  }

  setError(snapshot: RequestSnapshot, error: string): void {
    snapshot.errorMessage = error;
  }
}
```

- [ ] **Step 2: Verify the file was created correctly**

```bash
test -f /Users/ashikchalise/Documents/Office/framework/packages/core/src/dev/debug/request-capture.ts && echo "File created successfully"
```

Expected output: `File created successfully`

---

## Task 3: Create Comprehensive Test Suite

**Files:**

- Create: `packages/core/src/__tests__/dev/request-capture.test.ts`

- [ ] **Step 1: Write the test file**

Create file `packages/core/src/__tests__/dev/request-capture.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { RequestCapture } from '../../dev/debug/request-capture.js';
import type { RequestSnapshot } from '../../dev/types.js';

describe('RequestCapture', () => {
  let capture: RequestCapture;

  beforeEach(() => {
    capture = new RequestCapture();
  });

  it('should create RequestCapture instance', () => {
    expect(capture).toBeDefined();
  });

  it('should maintain circular buffer of requests', () => {
    const history = capture.getHistory();
    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBeLessThanOrEqual(100);
  });

  it('should add request snapshot to buffer', () => {
    const snapshot: RequestSnapshot = {
      id: 'test-1',
      timestamp: Date.now(),
      method: 'GET',
      path: '/test',
      query: {},
      body: undefined,
      headers: {},
      status: 200,
      responseTime: 10,
      middlewareTraces: [],
      handlerTrace: {
        controller: 'TestController',
        method: 'test',
        duration: 5,
      },
    };
    capture.addSnapshot(snapshot);
    const history = capture.getHistory();
    expect(history).toContainEqual(snapshot);
  });

  it('should evict oldest when buffer exceeds max size', () => {
    for (let i = 0; i < 105; i++) {
      const snapshot: RequestSnapshot = {
        id: `test-${i}`,
        timestamp: Date.now() + i,
        method: 'GET',
        path: `/test-${i}`,
        query: {},
        body: undefined,
        headers: {},
        status: 200,
        responseTime: 10,
        middlewareTraces: [],
        handlerTrace: {
          controller: 'TestController',
          method: 'test',
          duration: 5,
        },
      };
      capture.addSnapshot(snapshot);
    }
    const history = capture.getHistory();
    expect(history.length).toBeLessThanOrEqual(100);
    expect(history.length).toBe(100);
  });

  it('should clear history', () => {
    capture.addSnapshot({
      id: 'test-1',
      timestamp: Date.now(),
      method: 'GET',
      path: '/test',
      query: {},
      body: undefined,
      headers: {},
      status: 200,
      responseTime: 10,
      middlewareTraces: [],
      handlerTrace: {
        controller: 'TestController',
        method: 'test',
        duration: 5,
      },
    });
    capture.clear();
    expect(capture.getHistory().length).toBe(0);
  });

  it('should get snapshot by id', () => {
    const snapshot: RequestSnapshot = {
      id: 'unique-id',
      timestamp: Date.now(),
      method: 'GET',
      path: '/test',
      query: {},
      body: undefined,
      headers: {},
      status: 200,
      responseTime: 10,
      middlewareTraces: [],
      handlerTrace: {
        controller: 'TestController',
        method: 'test',
        duration: 5,
      },
    };
    capture.addSnapshot(snapshot);
    const retrieved = capture.getSnapshotById('unique-id');
    expect(retrieved).toEqual(snapshot);
  });

  it('should return undefined for non-existent snapshot id', () => {
    const retrieved = capture.getSnapshotById('non-existent-id');
    expect(retrieved).toBeUndefined();
  });

  it('should create snapshot with helper method', () => {
    const snapshot = capture.createSnapshot(
      'POST',
      '/users',
      { page: 1 },
      { 'content-type': 'application/json' },
      { name: 'test' }
    );
    expect(snapshot.method).toBe('POST');
    expect(snapshot.path).toBe('/users');
    expect(snapshot.query).toEqual({ page: 1 });
    expect(snapshot.headers).toEqual({ 'content-type': 'application/json' });
    expect(snapshot.body).toEqual({ name: 'test' });
    expect(snapshot.status).toBe(200);
    expect(snapshot.responseTime).toBe(0);
    expect(snapshot.middlewareTraces).toEqual([]);
    expect(snapshot.id).toBeDefined();
    expect(snapshot.timestamp).toBeDefined();
  });

  it('should add middleware trace to snapshot', () => {
    const snapshot = capture.createSnapshot('GET', '/test', {}, {});
    const trace = { name: 'auth-middleware', duration: 5, index: 0 };
    capture.addMiddlewareTrace(snapshot, trace);
    expect(snapshot.middlewareTraces).toContain(trace);
    expect(snapshot.middlewareTraces.length).toBe(1);
  });

  it('should update handler trace on snapshot', () => {
    const snapshot = capture.createSnapshot('GET', '/test', {}, {});
    const trace = {
      controller: 'UserController',
      method: 'getUser',
      duration: 25,
      resultSize: 256,
    };
    capture.updateHandlerTrace(snapshot, trace);
    expect(snapshot.handlerTrace).toEqual(trace);
  });

  it('should update response status and time', () => {
    const snapshot = capture.createSnapshot('GET', '/test', {}, {});
    capture.updateResponse(snapshot, 404, 125);
    expect(snapshot.status).toBe(404);
    expect(snapshot.responseTime).toBe(125);
  });

  it('should set error message on snapshot', () => {
    const snapshot = capture.createSnapshot('GET', '/test', {}, {});
    capture.setError(snapshot, 'Internal Server Error');
    expect(snapshot.errorMessage).toBe('Internal Server Error');
  });

  it('should maintain snapshot map integrity after eviction', () => {
    // Add 105 snapshots
    for (let i = 0; i < 105; i++) {
      const snapshot: RequestSnapshot = {
        id: `test-${i}`,
        timestamp: Date.now() + i,
        method: 'GET',
        path: `/test-${i}`,
        query: {},
        body: undefined,
        headers: {},
        status: 200,
        responseTime: 10,
        middlewareTraces: [],
        handlerTrace: {
          controller: 'TestController',
          method: 'test',
          duration: 5,
        },
      };
      capture.addSnapshot(snapshot);
    }

    // Check that first 5 IDs are no longer accessible
    for (let i = 0; i < 5; i++) {
      const retrieved = capture.getSnapshotById(`test-${i}`);
      expect(retrieved).toBeUndefined();
    }

    // Check that later IDs are still accessible
    const retrieved = capture.getSnapshotById('test-104');
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe('test-104');
  });

  it('should allow multiple middleware traces', () => {
    const snapshot = capture.createSnapshot('GET', '/test', {}, {});
    const trace1 = { name: 'auth', duration: 5, index: 0 };
    const trace2 = { name: 'cors', duration: 3, index: 1 };
    const trace3 = { name: 'logging', duration: 2, index: 2 };

    capture.addMiddlewareTrace(snapshot, trace1);
    capture.addMiddlewareTrace(snapshot, trace2);
    capture.addMiddlewareTrace(snapshot, trace3);

    expect(snapshot.middlewareTraces).toHaveLength(3);
    expect(snapshot.middlewareTraces[0].name).toBe('auth');
    expect(snapshot.middlewareTraces[1].name).toBe('cors');
    expect(snapshot.middlewareTraces[2].name).toBe('logging');
  });
});
```

- [ ] **Step 2: Verify the test file was created**

```bash
test -f /Users/ashikchalise/Documents/Office/framework/packages/core/src/__tests__/dev/request-capture.test.ts && echo "Test file created successfully"
```

Expected output: `Test file created successfully`

---

## Task 4: Run and Verify Tests Pass

**Files:**

- No new files

- [ ] **Step 1: Run the specific test file**

```bash
cd /Users/ashikchalise/Documents/Office/framework && pnpm --filter @framework/core test -- src/__tests__/dev/request-capture.test.ts
```

Expected output: All tests pass (PASS - containing test count like "13 passed")

- [ ] **Step 2: Verify no type errors**

```bash
cd /Users/ashikchalise/Documents/Office/framework && pnpm --filter @framework/core type-check
```

Expected output: No TypeScript errors

---

## Task 5: Commit the Changes

**Files:**

- `packages/core/src/dev/debug/request-capture.ts`
- `packages/core/src/dev/debug/index.ts`
- `packages/core/src/__tests__/dev/request-capture.test.ts`

- [ ] **Step 1: Stage all files**

```bash
cd /Users/ashikchalise/Documents/Office/framework && git add packages/core/src/dev/debug/request-capture.ts packages/core/src/dev/debug/index.ts packages/core/src/__tests__/dev/request-capture.test.ts
```

- [ ] **Step 2: Commit with message**

```bash
cd /Users/ashikchalise/Documents/Office/framework && git commit -m "feat(dev): implement request capture middleware for developer tooling

- Add RequestCapture class with circular buffer (max 100 snapshots)
- Implement snapshot capture, middleware tracing, and handler tracing
- Add comprehensive test suite with 13 test cases
- Support request/response lifecycle capture for debugging"
```

- [ ] **Step 3: Verify commit**

```bash
cd /Users/ashikchalise/Documents/Office/framework && git log --oneline -1
```

Expected output: Commit message appears as the latest commit

---

## Spec Coverage Checklist

- [x] RequestCapture class with circular buffer (max 100) - Task 2
- [x] addSnapshot method - Task 2
- [x] getHistory method - Task 2
- [x] getSnapshotById method - Task 2
- [x] clear method - Task 2
- [x] createSnapshot helper - Task 2
- [x] addMiddlewareTrace method - Task 2
- [x] updateHandlerTrace method - Task 2
- [x] updateResponse method - Task 2
- [x] setError method - Task 2
- [x] Test file with comprehensive coverage - Task 3
- [x] Export from debug/index.ts - Task 1
- [x] Tests passing - Task 4
- [x] Commit - Task 5

All spec requirements are covered.
