import type { RequestHandler, ErrorRequestHandler } from 'express';
import type { Server } from 'node:http';
import {
  HttpAdapter,
  ExpressAdapter,
  MiddlewarePipeline,
  RouteRegistry,
  RouteExplorer,
  LifecycleRunner,
} from './http/index.js';
import { Module } from './module.js';
import { Logger } from '@framework/logger';
import { Container } from './di/index.js';
import { EventBus } from './events/index.js';
import { PluginManager } from './plugins/plugin.manager.js';
import type { PluginManifest } from './plugins/types.js';
import { OptimizationManager, defaultOptimizationConfig } from './optimization/index.js';
import type { OptimizationConfig, Layer1, Layer2, Layer3 } from './optimization/index.js';
import cors from 'cors';

export interface ApplicationOptions {
  port?: number;
  host?: string;
  corsEnabled?: boolean;
  globalMiddlewares?: RequestHandler[];
  globalErrorHandler?: ErrorRequestHandler;
  optimization?: OptimizationConfig | boolean;
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
  private pluginManager: PluginManager | null = null;
  private pluginConfig: Record<string, Record<string, unknown>> = {};
  private optimizationManager?: OptimizationManager;
  private optimizationConfig?: OptimizationConfig;
  readonly container: Container;
  readonly eventBus: EventBus;

  constructor(options: ApplicationOptions = {}, adapter?: HttpAdapter) {
    this.adapter = adapter || new ExpressAdapter();
    this.pipeline = new MiddlewarePipeline();
    this.registry = new RouteRegistry();
    this.lifecycle = new LifecycleRunner();
    this.explorer = new RouteExplorer(this.adapter);
    this.container = new Container();
    this.eventBus = new EventBus();

    this.port = options.port || 3000;
    this.host = options.host || 'localhost';
    this.logger = new Logger('Application');

    // Configure optimization if provided
    if (options.optimization !== undefined) {
      if (options.optimization === true) {
        this.optimizationConfig = defaultOptimizationConfig();
      } else if (options.optimization === false) {
        this.optimizationConfig = undefined;
      } else {
        this.optimizationConfig = options.optimization;
      }
    }

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

    // Initialize optimization manager if config is set
    if (this.optimizationConfig) {
      this.optimizationManager = new OptimizationManager(this.optimizationConfig);
      await this.optimizationManager.initialize();
    }

    if (this.globalErrorHandler) {
      this.adapter.useErrorHandler(this.globalErrorHandler);
    }

    const server = await this.adapter.listen(this.port, this.host, () => {
      this.logger.info(`Server running at http://${this.host}:${this.port}`);
    });

    return server;
  }

  async stop(): Promise<void> {
    // Shutdown optimization manager first if present
    if (this.optimizationManager) {
      await this.optimizationManager.shutdown();
    }

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

  registerPlugin(manifest: PluginManifest, pluginModule: unknown): void {
    if (!this.pluginManager) {
      this.pluginManager = new PluginManager(this, this.container);
    }
    this.pluginManager.registerPlugin(manifest, pluginModule);
  }

  setPluginConfig(config: Record<string, Record<string, unknown>>): void {
    this.pluginConfig = config;
  }

  async loadPlugins(): Promise<void> {
    if (this.pluginManager) {
      await this.pluginManager.loadPlugins();
      void this.eventBus.emit('plugins:loaded');
    }
  }

  getPluginManager(): PluginManager | undefined {
    return this.pluginManager ?? undefined;
  }

  getOptimizationLayer(layer: 1): Layer1 | undefined;
  getOptimizationLayer(layer: 2): Layer2 | undefined;
  getOptimizationLayer(layer: 3): Layer3 | undefined;
  getOptimizationLayer(layer: 1 | 2 | 3): Layer1 | Layer2 | Layer3 | undefined {
    if (!this.optimizationManager) {
      return undefined;
    }

    switch (layer) {
      case 1:
        return this.optimizationManager.layer1;
      case 2:
        return this.optimizationManager.layer2;
      case 3:
        return this.optimizationManager.layer3;
      default:
        return undefined;
    }
  }

  getOptimizationManager(): OptimizationManager | undefined {
    return this.optimizationManager;
  }
}

export function createApplication(
  options?: ApplicationOptions,
  adapter?: HttpAdapter
): Application {
  return new Application(options, adapter);
}
