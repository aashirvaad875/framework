import type { HttpAdapter } from '../adapter/http-adapter.interface.js';
import type { LifecycleRunner } from '../lifecycle/lifecycle-runner.js';
import { createRouteHandler } from '../pipeline/route-pipeline.js';
import { ControllerFactory } from '../execution/controller-factory.js';
import { CONTROLLER_METADATA_KEY, ROUTE_METADATA_KEY } from '../../decorators/index.js';
import { Logger } from '@framework/logger';

export class RouteRegistry {
  private readonly logger = new Logger('RouteRegistry');

  register(controllers: Function[], adapter: HttpAdapter, runner: LifecycleRunner): void {
    for (const controllerClass of controllers) {
      const controllerMetadata = (Reflect as any).getMetadata?.(CONTROLLER_METADATA_KEY, controllerClass);
      const basePath = controllerMetadata?.path || '';

      const instance = ControllerFactory.create(controllerClass);
      runner.register(instance);

      const routes = (Reflect as any).getMetadata?.(ROUTE_METADATA_KEY, controllerClass.prototype) || [];

      for (const route of routes) {
        const fullPath = this.buildPath(adapter.getGlobalPrefix(), basePath, route.path);
        const handler = createRouteHandler(instance, route.handler, route, controllerClass);

        this.logger.debug(`Registering route: ${route.method} ${fullPath}`);

        const method = route.method.toLowerCase() as 'get' | 'post' | 'put' | 'delete' | 'patch';
        adapter[method](fullPath, handler);
      }
    }
  }

  private buildPath(...parts: string[]): string {
    const path = parts.filter(p => p && p.length > 0).join('/');
    return `/${path}`.replace(/\/+/g, '/') || '/';
  }
}
