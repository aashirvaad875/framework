import 'reflect-metadata';
import type { ControllerMetadata, RouteMetadata, ParameterMetadata, SecurityRequirement } from './types.js';
import {
  CONTROLLER_METADATA_KEY,
  ROUTE_METADATA_KEY,
  INJECT_METADATA_KEY,
} from '../decorators/index.js';
import {
  AUTH_METADATA_KEY,
  PERMISSIONS_METADATA_KEY,
  PUBLIC_METADATA_KEY,
  ROLES_METADATA_KEY,
} from '../auth/decorators.js';

export class MetadataScanner {
  /**
   * Scan module tree and extract all controller route metadata
   */
  static scanControllers(modules: any[]): ControllerMetadata[] {
    const controllers: ControllerMetadata[] = [];

    for (const moduleInstance of modules) {
      if (!moduleInstance) continue;

      // Get all class definitions from module (both direct exports and nested)
      const classes = this.extractClassesFromModule(moduleInstance);

      for (const controllerClass of classes) {
        if (!this.isController(controllerClass)) continue;

        const controllerPath = this.getControllerPath(controllerClass);
        const routes = this.extractRoutes(controllerClass);

        if (routes.length > 0) {
          controllers.push({
            controllerClass,
            controllerPath,
            routes,
          });
        }
      }
    }

    return controllers;
  }

  /**
   * Check if a class is decorated with @Controller
   */
  private static isController(target: Function): boolean {
    return Boolean(Reflect.getMetadata(CONTROLLER_METADATA_KEY, target));
  }

  /**
   * Get the base path from @Controller decorator
   */
  private static getControllerPath(target: Function): string {
    const metadata = Reflect.getMetadata(CONTROLLER_METADATA_KEY, target) as { path?: string };
    return metadata?.path || '';
  }

  /**
   * Extract all routes from controller methods
   */
  private static extractRoutes(controllerClass: Function): RouteMetadata[] {
    const routes: RouteMetadata[] = [];
    const prototype = controllerClass.prototype;

    // Get routes metadata which is stored as an array
    const routesMetadata = Reflect.getOwnMetadata(ROUTE_METADATA_KEY, prototype) || [];

    const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const;

    for (const routeInfo of routesMetadata) {
      const { method, path, propertyKey } = routeInfo;

      // Validate HTTP method
      if (!validMethods.includes(method as any)) {
        continue;
      }

      // Get the actual method from the prototype
      const methodHandler = prototype[propertyKey];
      if (typeof methodHandler !== 'function') continue;

      const route: RouteMetadata = {
        method: method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
        path: path || '',
        handlerName: propertyKey,
        parameters: this.extractParameters(methodHandler, prototype, propertyKey),
        bodyType: this.getBodyType(methodHandler, prototype, propertyKey),
        returnType: this.getReturnType(methodHandler),
        security: this.extractSecurity(methodHandler),
      };

      routes.push(route);
    }

    return routes;
  }

  /**
   * Extract parameter metadata from method
   */
  private static extractParameters(
    method: Function,
    prototype: any,
    propertyKey: string
  ): ParameterMetadata[] {
    const parameters: ParameterMetadata[] = [];
    const paramTypes: Function[] = Reflect.getMetadata('design:paramtypes', method) || [];

    // Get params metadata stored on the prototype with propertyKey
    const paramsMetadata = Reflect.getOwnMetadata('params', prototype, propertyKey) || {};

    // Iterate through each parameter
    for (let i = 0; i < paramTypes.length; i++) {
      const paramType = paramTypes[i];
      if (!paramType) continue;

      // Check for parameter decorators (@Body, @Param, @Query, @Header)
      const parameterInfo = paramsMetadata[i];
      if (!parameterInfo) continue;

      const { source, name } = parameterInfo;

      parameters.push({
        name: name || `param${i}`,
        source: source as 'param' | 'query' | 'header' | 'body',
        type: paramType,
        required: source === 'param' || source === 'body', // param and body params are typically required
      });
    }

    return parameters;
  }

  /**
   * Extract body type from method parameters
   */
  private static getBodyType(method: Function, prototype: any, propertyKey: string): Function | undefined {
    const paramTypes: Function[] = Reflect.getMetadata('design:paramtypes', method) || [];
    const paramsMetadata = Reflect.getOwnMetadata('params', prototype, propertyKey) || {};

    for (let i = 0; i < paramTypes.length; i++) {
      const info = paramsMetadata[i];
      if (info?.source === 'body') {
        return paramTypes[i];
      }
    }

    return undefined;
  }

  /**
   * Extract return type from method
   */
  private static getReturnType(method: Function): Function | undefined {
    const returnType = Reflect.getMetadata('design:returntype', method);
    if (returnType && returnType !== Promise && returnType !== Object) {
      return returnType;
    }
    return undefined;
  }

  /**
   * Extract security requirements from @Auth and @Permissions decorators
   */
  private static extractSecurity(method: Function): SecurityRequirement | undefined {
    // Check if endpoint is public
    const isPublic = Reflect.getOwnMetadata(PUBLIC_METADATA_KEY, method);
    if (isPublic) {
      return undefined;
    }

    // Check for @Auth metadata
    const authMetadata = Reflect.getOwnMetadata(AUTH_METADATA_KEY, method);
    if (authMetadata) {
      // Check for @Permissions or @Roles scopes
      const permissions = Reflect.getOwnMetadata(PERMISSIONS_METADATA_KEY, method);
      const roles = Reflect.getOwnMetadata(ROLES_METADATA_KEY, method);

      const scopes: string[] = [];
      if (Array.isArray(permissions)) {
        scopes.push(...permissions);
      } else if (permissions?.permissions) {
        scopes.push(...permissions.permissions);
      }
      if (Array.isArray(roles)) {
        scopes.push(...roles);
      }

      return {
        scheme: 'bearerAuth',
        scopes,
      };
    }

    return undefined;
  }

  /**
   * Extract class definitions from module (simplified - gets direct exports)
   */
  private static extractClassesFromModule(moduleInstance: any): Function[] {
    const classes: Function[] = [];

    if (!moduleInstance || typeof moduleInstance !== 'object') {
      return classes;
    }

    // Get all exported values from module
    for (const key in moduleInstance) {
      if (key === 'default' || key.startsWith('_')) continue;

      const value = moduleInstance[key];
      if (typeof value === 'function' && value.prototype) {
        classes.push(value);
      }
    }

    return classes;
  }
}
