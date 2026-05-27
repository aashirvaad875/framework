import type { RequestHandler } from 'express';
import type { Interceptor } from '../http/interceptors/interceptor.interface.js';
import { INJECT_METADATA_KEY, INJECTABLE_METADATA_KEY, Scope } from '../di/types.js';

export interface ControllerMetadata {
  path: string;
  handlers: Map<string, RouteHandler>;
}

export interface RouteHandler {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  handler: RequestHandler;
  middlewares: RequestHandler[];
  pipes: PipeTransform[];
  guards: GuardFn[];
}

export interface PipeTransform {
  transform(value: any, metadata: any): any;
}

export type GuardFn = (req: any, res: any, next: any) => boolean | Promise<boolean>;

const CONTROLLER_METADATA_KEY = Symbol('controller:metadata');
const ROUTE_METADATA_KEY = Symbol('route:metadata');
const MODULE_METADATA_KEY = Symbol('module:metadata');

export function Controller(path: string = '') {
  return function (target: Function) {
    Reflect.defineMetadata(CONTROLLER_METADATA_KEY, { path }, target);
  };
}

export function Get(path: string = '') {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const routes = Reflect.getOwnMetadata(ROUTE_METADATA_KEY, target) || [];
    routes.push({
      method: 'GET',
      path,
      handler: descriptor.value,
      propertyKey,
    });
    Reflect.defineMetadata(ROUTE_METADATA_KEY, routes, target);
  };
}

export function Post(path: string = '') {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const routes = Reflect.getOwnMetadata(ROUTE_METADATA_KEY, target) || [];
    routes.push({
      method: 'POST',
      path,
      handler: descriptor.value,
      propertyKey,
    });
    Reflect.defineMetadata(ROUTE_METADATA_KEY, routes, target);
  };
}

export function Put(path: string = '') {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const routes = Reflect.getOwnMetadata(ROUTE_METADATA_KEY, target) || [];
    routes.push({
      method: 'PUT',
      path,
      handler: descriptor.value,
      propertyKey,
    });
    Reflect.defineMetadata(ROUTE_METADATA_KEY, routes, target);
  };
}

export function Delete(path: string = '') {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const routes = Reflect.getOwnMetadata(ROUTE_METADATA_KEY, target) || [];
    routes.push({
      method: 'DELETE',
      path,
      handler: descriptor.value,
      propertyKey,
    });
    Reflect.defineMetadata(ROUTE_METADATA_KEY, routes, target);
  };
}

export function Patch(path: string = '') {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const routes = Reflect.getOwnMetadata(ROUTE_METADATA_KEY, target) || [];
    routes.push({
      method: 'PATCH',
      path,
      handler: descriptor.value,
      propertyKey,
    });
    Reflect.defineMetadata(ROUTE_METADATA_KEY, routes, target);
  };
}

export function Injectable(scope: Scope = Scope.Singleton) {
  return function (target: Function) {
    Reflect.defineMetadata(INJECTABLE_METADATA_KEY, { scope }, target);
  };
}

export function Inject(token?: string | symbol | Function) {
  return function (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) {
    const existingMetadata = Reflect.getOwnMetadata(INJECT_METADATA_KEY, target) || {};
    existingMetadata[parameterIndex] = token || Reflect.getMetadata('design:paramtypes', target)[parameterIndex];
    Reflect.defineMetadata(INJECT_METADATA_KEY, existingMetadata, target);
  };
}

export function ModuleDecorator(config: {
  controllers?: Function[];
  providers?: any[];
  imports?: Function[];
  exports?: (Function | string | symbol)[];
  isGlobal?: boolean;
  lazy?: {
    strategy: 'eager' | 'route-based' | 'manual';
    routes?: string[];
  };
}): ClassDecorator {
  return function (target: Function) {
    Reflect.defineMetadata(MODULE_METADATA_KEY, {
      controllers: config.controllers || [],
      providers: config.providers || [],
      imports: config.imports || [],
      exports: config.exports || [],
      isGlobal: config.isGlobal || false,
      lazy: config.lazy,
    }, target);

    // Mark as module for easier detection
    (target as any).$isModule = true;
  };
}

export function Middleware(order: number = 0) {
  return function (target: Function) {
    Reflect.defineMetadata('middleware:order', order, target);
  };
}

export function UseGuard(...guards: GuardFn[]) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata('guards', guards, descriptor.value);
  };
}

export function UsePipe(...pipes: PipeTransform[]) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata('pipes', pipes, descriptor.value);
  };
}

export function Param(name: string) {
  return function (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) {
    const existingParams = (propertyKey !== undefined
      ? Reflect.getOwnMetadata('params', target, propertyKey as string | symbol)
      : Reflect.getOwnMetadata('params', target)) || {};
    existingParams[parameterIndex] = { source: 'param', name };
    if (propertyKey !== undefined) {
      Reflect.defineMetadata('params', existingParams, target, propertyKey as string | symbol);
    } else {
      Reflect.defineMetadata('params', existingParams, target);
    }
  };
}

export function Query(name: string) {
  return function (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) {
    const existingParams = (propertyKey !== undefined
      ? Reflect.getOwnMetadata('params', target, propertyKey as string | symbol)
      : Reflect.getOwnMetadata('params', target)) || {};
    existingParams[parameterIndex] = { source: 'query', name };
    if (propertyKey !== undefined) {
      Reflect.defineMetadata('params', existingParams, target, propertyKey as string | symbol);
    } else {
      Reflect.defineMetadata('params', existingParams, target);
    }
  };
}

export function Body() {
  return function (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) {
    const existingParams = (propertyKey !== undefined
      ? Reflect.getOwnMetadata('params', target, propertyKey as string | symbol)
      : Reflect.getOwnMetadata('params', target)) || {};
    existingParams[parameterIndex] = { source: 'body' };
    if (propertyKey !== undefined) {
      Reflect.defineMetadata('params', existingParams, target, propertyKey as string | symbol);
    } else {
      Reflect.defineMetadata('params', existingParams, target);
    }
  };
}

export function Req() {
  return function (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) {
    const existingParams = (propertyKey !== undefined
      ? Reflect.getOwnMetadata('params', target, propertyKey as string | symbol)
      : Reflect.getOwnMetadata('params', target)) || {};
    existingParams[parameterIndex] = { source: 'req' };
    if (propertyKey !== undefined) {
      Reflect.defineMetadata('params', existingParams, target, propertyKey as string | symbol);
    } else {
      Reflect.defineMetadata('params', existingParams, target);
    }
  };
}

export function Res() {
  return function (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) {
    const existingParams = (propertyKey !== undefined
      ? Reflect.getOwnMetadata('params', target, propertyKey as string | symbol)
      : Reflect.getOwnMetadata('params', target)) || {};
    existingParams[parameterIndex] = { source: 'res' };
    if (propertyKey !== undefined) {
      Reflect.defineMetadata('params', existingParams, target, propertyKey as string | symbol);
    } else {
      Reflect.defineMetadata('params', existingParams, target);
    }
  };
}

export function UseInterceptor(...interceptors: Interceptor[]) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata('before:interceptors', interceptors, descriptor.value);
  };
}

export function UseAfterInterceptor(...interceptors: Interceptor[]) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata('after:interceptors', interceptors, descriptor.value);
  };
}

export { CONTROLLER_METADATA_KEY, ROUTE_METADATA_KEY, INJECT_METADATA_KEY, MODULE_METADATA_KEY };
