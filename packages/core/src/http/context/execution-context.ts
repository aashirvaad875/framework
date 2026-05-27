import type { Request, Response } from 'express';
import type { RequestContext } from './request-context.js';

export interface ExecutionContext {
  getRequest<T = Request>(): T;
  getResponse<T = Response>(): T;
  getContext(): RequestContext;
  getHandler(): Function;
  getClass(): Function;
}

export class DefaultExecutionContext implements ExecutionContext {
  constructor(
    private readonly requestContext: RequestContext,
    private readonly handler: Function,
    private readonly controllerClass: Function,
  ) {}

  getRequest<T = Request>(): T {
    return this.requestContext.getRequest() as T;
  }

  getResponse<T = Response>(): T {
    return this.requestContext.getResponse() as T;
  }

  getContext(): RequestContext {
    return this.requestContext;
  }

  getHandler(): Function {
    return this.handler;
  }

  getClass(): Function {
    return this.controllerClass;
  }
}
