import { RequestHandler } from 'express';

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
const INJECT_METADATA_KEY = Symbol('inject:metadata');
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

export function Injectable() {
  return function (target: Function) {};
}

export function Inject(token?: string | symbol) {
  return function (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) {
    const existingMetadata = Reflect.getOwnMetadata(INJECT_METADATA_KEY, target) || {};
    existingMetadata[parameterIndex] = token || Reflect.getMetadata('design:paramtypes', target)[parameterIndex];
    Reflect.defineMetadata(INJECT_METADATA_KEY, existingMetadata, target);
  };
}

export function Module(metadata: { controllers?: Function[]; providers?: Function[]; imports?: Function[] }) {
  return function (target: Function) {
    Reflect.defineMetadata(MODULE_METADATA_KEY, metadata, target);
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
    const existingParams = Reflect.getOwnMetadata('params', target, propertyKey) || {};
    existingParams[parameterIndex] = { source: 'param', name };
    Reflect.defineMetadata('params', existingParams, target, propertyKey);
  };
}

export function Query(name: string) {
  return function (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) {
    const existingParams = Reflect.getOwnMetadata('params', target, propertyKey) || {};
    existingParams[parameterIndex] = { source: 'query', name };
    Reflect.defineMetadata('params', existingParams, target, propertyKey);
  };
}

export function Body() {
  return function (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) {
    const existingParams = Reflect.getOwnMetadata('params', target, propertyKey) || {};
    existingParams[parameterIndex] = { source: 'body' };
    Reflect.defineMetadata('params', existingParams, target, propertyKey);
  };
}

export function Req() {
  return function (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) {
    const existingParams = Reflect.getOwnMetadata('params', target, propertyKey) || {};
    existingParams[parameterIndex] = { source: 'req' };
    Reflect.defineMetadata('params', existingParams, target, propertyKey);
  };
}

export function Res() {
  return function (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) {
    const existingParams = Reflect.getOwnMetadata('params', target, propertyKey) || {};
    existingParams[parameterIndex] = { source: 'res' };
    Reflect.defineMetadata('params', existingParams, target, propertyKey);
  };
}

export { CONTROLLER_METADATA_KEY, ROUTE_METADATA_KEY, INJECT_METADATA_KEY, MODULE_METADATA_KEY };
