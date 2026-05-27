import type { HttpAdapter } from '../adapter/http-adapter.interface.js';

interface MiddlewareEntry {
  handler: unknown;
  order: number;
}

export class MiddlewarePipeline {
  private readonly middlewares: MiddlewareEntry[] = [];

  add(handler: unknown, order = 0): this {
    this.middlewares.push({ handler, order });
    return this;
  }

  applyTo(adapter: HttpAdapter): void {
    this.middlewares.sort((a, b) => a.order - b.order);

    for (const { handler } of this.middlewares) {
      adapter.use(handler);
    }
  }
}
