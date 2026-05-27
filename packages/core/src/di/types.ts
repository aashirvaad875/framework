export enum Scope {
  Singleton = 'SINGLETON',
  Scoped = 'SCOPED',
  Transient = 'TRANSIENT',
}

export type Token<T = any> =
  | string
  | symbol
  | (new (...args: any[]) => T)
  | import('./injection-token.js').InjectionToken<T>;

export interface ValueProvider<T> {
  kind: 'value';
  value: T;
}

export interface ClassProvider<T> {
  kind: 'class';
  useClass: new (...args: any[]) => T;
  scope: Scope;
}

export interface FactoryProvider<T> {
  kind: 'factory';
  useFactory: () => T | Promise<T>;
  scope: Scope;
}

export type Provider<T = any> = ValueProvider<T> | ClassProvider<T> | FactoryProvider<T>;

export const INJECT_METADATA_KEY = Symbol('inject:metadata');
export const INJECTABLE_METADATA_KEY = Symbol('injectable:metadata');
export const PARAMTYPES_METADATA_KEY = 'design:paramtypes';
