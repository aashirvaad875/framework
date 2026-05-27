import type { HttpAdapter } from '../adapter/http-adapter.interface.js';
import { CONTROLLER_METADATA_KEY, ROUTE_METADATA_KEY } from '../../decorators/index.js';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface RouteDefinition {
  method: HttpMethod;
  path: string;
  fullPath: string;
  controller: string;
  handlerName: string;
  hasGuards: boolean;
  hasPipes: boolean;
}

export class RouteExplorer {
  constructor(private readonly adapter: HttpAdapter) {}

  exploreModules(modules: Function[]): RouteDefinition[] {
    const routes: RouteDefinition[] = [];

    for (const moduleClass of modules) {
      const controllerClasses = this.getControllerClassesFromModule(moduleClass);

      for (const controllerClass of controllerClasses) {
        const controllerMetadata = (Reflect as any).getMetadata?.(CONTROLLER_METADATA_KEY, controllerClass);
        const basePath = controllerMetadata?.path || '';
        const controllerName = controllerClass.name;

        // We need an instance to read routes from the prototype
        // For exploration, we'll try to read from the prototype directly
        const prototypeRoutes = (Reflect as any).getMetadata?.(ROUTE_METADATA_KEY, controllerClass.prototype) || [];

        for (const route of prototypeRoutes) {
          const fullPath = this.buildPath(this.adapter.getGlobalPrefix(), basePath, route.path);
          const hasGuards = Boolean((Reflect as any).getMetadata?.('guards', route.handler));
          const hasPipes = Boolean((Reflect as any).getMetadata?.('pipes', route.handler));

          routes.push({
            method: route.method,
            path: route.path,
            fullPath,
            controller: controllerName,
            handlerName: route.propertyKey,
            hasGuards,
            hasPipes,
          });
        }
      }
    }

    return routes;
  }

  printRouteTable(routes: RouteDefinition[]): string {
    if (routes.length === 0) {
      return 'No routes registered';
    }

    const headers = ['Method', 'Path', 'Controller', 'Handler', 'Guards', 'Pipes'];
    const rows = routes.map(route => [
      route.method,
      route.fullPath,
      route.controller,
      route.handlerName,
      route.hasGuards ? '✓' : '',
      route.hasPipes ? '✓' : '',
    ]);

    return this.formatTable(headers, rows);
  }

  private getControllerClassesFromModule(moduleClass: Function): Function[] {
    const metadata = (Reflect as any).getMetadata?.('module:metadata', moduleClass);
    return metadata?.controllers || [];
  }

  private buildPath(...parts: string[]): string {
    const path = parts.filter(p => p && p.length > 0).join('/');
    return `/${path}`.replace(/\/+/g, '/') || '/';
  }

  private formatTable(headers: string[], rows: string[][]): string {
    const columnWidths = headers.map((header, i) => {
      const maxRowWidth = Math.max(...rows.map(row => (row[i] || '').length));
      return Math.max(header.length, maxRowWidth);
    });

    const separator = columnWidths.map(width => '─'.repeat(width + 2)).join('┼');
    const headerRow = headers
      .map((h, i) => h.padEnd(columnWidths[i]))
      .join(' │ ');

    const dataRows = rows
      .map(row => row.map((cell, i) => (cell || '').padEnd(columnWidths[i])).join(' │ '))
      .join('\n');

    return `┌─${separator}─┐\n│ ${headerRow} │\n├─${separator}─┤\n│ ${dataRows} │\n└─${separator}─┘`;
  }
}
