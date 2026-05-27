import type { ExecutionContext } from '../context/execution-context.js';

export interface Interceptor {
  intercept(context: ExecutionContext, next: (context?: ExecutionContext) => Promise<any>): Promise<any>;
}

export type InterceptorFn = (context: ExecutionContext, next: Function) => Promise<any>;
