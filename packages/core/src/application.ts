import type { RequestHandler, ErrorRequestHandler } from 'express';
import type { Server } from 'node:http';
import { HttpAdapter, ExpressAdapter, MiddlewarePipeline, RouteRegistry, RouteExplorer, LifecycleRunner } from './http/index.js';
import { Module } from './module.js';
import { Logger } from '@framework/logger';
import cors from 'cors';

export interface ApplicationOptions {
  port?: number;
  host?: string;
  corsEnabled?: boolean;
  globalMiddlewares?: RequestHandler[];
  globalErrorHandler?: ErrorRequestHandler;
}

export class Application {
  private readonly adapter: HttpAdapter;
  private readonly pipeline: MiddlewarePipeline;
  private readonly registry: RouteRegistry;
  private readonly lifecycle: LifecycleRunner;
  private readonly explorer: RouteExplorer;
  private readonly modules: Function[] = [];
  private readonly port: number;
  private readonly host: string;
  private readonly logger: Logger;
  private globalErrorHandler?: ErrorRequestHandler;

  constructor(options: ApplicationOptions = {}, adapter?: HttpAdapter) {
    this.adapter = adapter || new ExpressAdapter();
    this.pipeline = new MiddlewarePipeline();
    this.registry = new RouteRegistry();
    this.lifecycle = new LifecycleRunner();
    this.explorer = new RouteExplorer(this.adapter);

    this.port = options.port || 3000;
    this.host = options.host || 'localhost';
    this.logger = new Logger('Application');

    this.setupDefaultMiddleware(options);
  }

  private setupDefaultMiddleware(options: ApplicationOptions): void {
    // CORS middleware with highest priority
    if (options.corsEnabled !== false) {
      this.pipeline.add(cors(), -100);
    }

    // Global middlewares
    if (options.globalMiddlewares) {
      options.globalMiddlewares.forEach((mw, index) => {
        this.pipeline.add(mw, index);
      });
    }
  }

  async registerModule(moduleClass: Function): Promise<void> {
    if (this.modules.includes(moduleClass)) {
      return;
    }

    await Module.load(moduleClass);
    this.modules.push(moduleClass);

    const controllers = Module.getControllers(moduleClass);
    this.registry.register(controllers, this.adapter, this.lifecycle);

    await this.lifecycle.runOnModuleInit();
  }

  use(middleware: RequestHandler, order = 0): this {
    this.pipeline.add(middleware, order);
    return this;
  }

  useErrorHandler(handler: ErrorRequestHandler): this {
    this.globalErrorHandler = handler;
    return this;
  }

  async start(): Promise<Server> {
    await this.adapter.init();

    this.pipeline.applyTo(this.adapter);

    await this.lifecycle.runOnApplicationBootstrap();

    if (this.globalErrorHandler) {
      this.adapter.useErrorHandler(this.globalErrorHandler);
    }

    const server = await this.adapter.listen(this.port, this.host, () => {
      this.logger.info(`Server running at http://${this.host}:${this.port}`);
    });

    return server;
  }

  async stop(): Promise<void> {
    await this.lifecycle.runOnApplicationShutdown();
    await this.adapter.close();
    this.logger.info('Server stopped');
  }

  getRoutes() {
    return this.explorer.exploreModules(this.modules);
  }

  printRoutes(): void {
    const routes = this.getRoutes();
    const table = this.explorer.printRouteTable(routes);
    console.log(table);
  }

  getAdapter(): HttpAdapter {
    return this.adapter;
  }

  getExpressApp() {
    return this.adapter.getInstance();
  }
}

export function createApplication(options?: ApplicationOptions, adapter?: HttpAdapter): Application {
  return new Application(options, adapter);
}
