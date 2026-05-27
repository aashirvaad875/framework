import { AsyncLocalStorage } from 'node:async_hooks';
import { LogContext } from './types.js';

export class RequestContextManager {
  private static als = new AsyncLocalStorage<LogContext>();

  static set(context: LogContext): void {
    this.als.enterWith(context);
  }

  static get(): LogContext | undefined {
    return this.als.getStore();
  }

  static async run<T>(context: LogContext, fn: () => Promise<T>): Promise<T> {
    return this.als.run(context, fn);
  }

  static update(partialContext: Partial<LogContext>): void {
    const current = this.get() || {};
    this.set({ ...current, ...partialContext });
  }

  static clear(): void {
    // AsyncLocalStorage clears automatically at end of async context
  }

  static getId(type: 'correlation' | 'trace' | 'request'): string | undefined {
    const context = this.get();
    if (type === 'correlation') return context?.correlationId;
    if (type === 'trace') return context?.traceId;
    if (type === 'request') return context?.requestId;
    return undefined;
  }
}

export const requestContext = RequestContextManager;
