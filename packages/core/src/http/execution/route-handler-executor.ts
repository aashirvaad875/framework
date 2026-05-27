import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { RequestContext } from '../context/request-context.js';
import { DefaultExecutionContext } from '../context/execution-context.js';
import { scopeManager } from '../../di/scope-manager.js';
import { ResponseTransformer } from '../response/response-transformer.js';
import { ControllerFactory } from './controller-factory.js';
import { ParameterResolver } from './parameter-resolver.js';
import { ExecutionPipeline } from './execution-pipeline.js';

export interface RouteMetadataEntry {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  handler: Function;
  propertyKey: string;
}

export class RouteHandlerExecutor {
  static create(
    controllerClass: Function,
    handlerFn: Function,
    _metadata: RouteMetadataEntry,
  ): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
      scopeManager.runInScope(async () => {
        try {
          // 1. Create request/execution context
          const requestContext = new RequestContext(req, res);
          const executionContext = new DefaultExecutionContext(requestContext, handlerFn, controllerClass);
          req.__context = requestContext;

          // 2. Get controller instance with DI
          const instance = ControllerFactory.create(controllerClass);

          // 3. Resolve parameters
          const args = ParameterResolver.resolve(req, res, executionContext, handlerFn, controllerClass);

          // 4. Gather metadata from handler function
          const guards = (Reflect as any).getMetadata?.('guards', handlerFn) ?? [];
          const beforeInterceptors = (Reflect as any).getMetadata?.('before:interceptors', handlerFn) ?? [];
          const pipes = (Reflect as any).getMetadata?.('pipes', handlerFn) ?? [];
          const afterInterceptors = (Reflect as any).getMetadata?.('after:interceptors', handlerFn) ?? [];

          // 5. Create and execute pipeline
          const pipeline = new ExecutionPipeline(guards, beforeInterceptors, pipes, afterInterceptors);
          const result = await pipeline.execute(executionContext, handlerFn, instance, args);

          // 6. Transform response
          if (result !== undefined && !res.headersSent) {
            await ResponseTransformer.transform(result, res);
          }
        } catch (error) {
          next(error);
        }
      });
    };
  }
}
