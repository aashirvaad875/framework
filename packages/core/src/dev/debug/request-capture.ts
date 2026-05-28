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
      handlerTrace: { controller: '', method: '', duration: 0 },
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
