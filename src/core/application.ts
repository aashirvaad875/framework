import express, { Express, RequestHandler, ErrorRequestHandler } from 'express';
import { Module } from './module.js';
import { di } from './container.js';
import { CONTROLLER_METADATA_KEY, ROUTE_METADATA_KEY } from './decorators/index.js';
import { Logger } from '../common/logger.js';

export interface ApplicationOptions {
  port?: number;
  host?: string;
  corsEnabled?: boolean;
  globalMiddlewares?: RequestHandler[];
  globalErrorHandler?: ErrorRequestHandler;
}

export class Application {
  private app: Express;
  private port: number;
  private host: string;
  private logger: Logger;
  private modules: Function[] = [];

  constructor(options: ApplicationOptions = {}) {
    this.app = express();
    this.port = options.port || 3000;
    this.host = options.host || 'localhost';
    this.logger = new Logger('Application');

    this.setupMiddlewares(options);
  }

  private setupMiddlewares(options: ApplicationOptions): void {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    if (options.corsEnabled !== false) {
      const cors = require('cors');
      this.app.use(cors());
    }

    if (options.globalMiddlewares) {
      options.globalMiddlewares.forEach(mw => this.app.use(mw));
    }
  }

  async registerModule(moduleClass: Function): Promise<void> {
    if (this.modules.includes(moduleClass)) {
      return;
    }

    await Module.load(moduleClass);
    this.modules.push(moduleClass);

    const controllers = Module.getControllers(moduleClass);
    this.registerControllers(controllers);
  }

  private registerControllers(controllers: Function[]): void {
    for (const controllerClass of controllers) {
      const controllerMetadata = Reflect.getMetadata(CONTROLLER_METADATA_KEY, controllerClass);
      const basePath = controllerMetadata?.path || '';

      const instance = di.resolve(controllerClass);
      const routes = Reflect.getMetadata(ROUTE_METADATA_KEY, instance) || [];

      for (const route of routes) {
        const fullPath = `${basePath}${route.path}`.replace(/\/+/g, '/') || '/';
        const handler = route.handler.bind(instance);

        this.logger.debug(`Registering route: ${route.method} ${fullPath}`);

        switch (route.method) {
          case 'GET':
            this.app.get(fullPath, handler);
            break;
          case 'POST':
            this.app.post(fullPath, handler);
            break;
          case 'PUT':
            this.app.put(fullPath, handler);
            break;
          case 'DELETE':
            this.app.delete(fullPath, handler);
            break;
          case 'PATCH':
            this.app.patch(fullPath, handler);
            break;
        }
      }
    }
  }

  useMiddleware(middleware: RequestHandler): void {
    this.app.use(middleware);
  }

  useErrorHandler(handler: ErrorRequestHandler): void {
    this.app.use(handler);
  }

  async start(): Promise<void> {
    this.app.listen(this.port, this.host, () => {
      this.logger.info(`Server running at http://${this.host}:${this.port}`);
    });
  }

  getExpressApp(): Express {
    return this.app;
  }
}

export function createApplication(options?: ApplicationOptions): Application {
  return new Application(options);
}
