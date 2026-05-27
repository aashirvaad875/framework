import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';

export class RequestContext {
  readonly requestId: string;
  readonly startedAt: Date;
  private readonly store: Map<string, unknown> = new Map();

  constructor(
    private readonly request: Request,
    private readonly response: Response,
  ) {
    this.requestId = randomUUID();
    this.startedAt = new Date();
  }

  getRequest(): Request {
    return this.request;
  }

  getResponse(): Response {
    return this.response;
  }

  getParam(name: string): unknown {
    return this.request.params[name];
  }

  getQuery<T = unknown>(name: string): T | undefined {
    return this.request.query[name] as T | undefined;
  }

  getBody<T = unknown>(): T {
    return this.request.body as T;
  }

  getHeader(name: string): string | undefined {
    return this.request.get(name);
  }

  set<T = unknown>(key: string, value: T): this {
    this.store.set(key, value);
    return this;
  }

  get<T = unknown>(key: string): T | undefined {
    return this.store.get(key) as T | undefined;
  }
}
