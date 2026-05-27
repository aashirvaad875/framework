import type { RequestHandler } from 'express';
import { RouteHandlerExecutor, type RouteMetadataEntry } from '../execution/route-handler-executor.js';
import { RequestContext } from '../context/request-context.js';

declare global {
  namespace Express {
    interface Request {
      __context?: RequestContext;
    }
  }
}

export function createRouteHandler(
  _instance: unknown,
  handlerFn: Function,
  metadata: RouteMetadataEntry,
  controllerClass: Function,
): RequestHandler {
  return RouteHandlerExecutor.create(controllerClass, handlerFn, metadata);
}
