import { Container } from './di/container.js';
import { InjectionToken } from './di/injection-token.js';
import { INJECTABLE_METADATA_KEY, Scope } from './di/types.js';

export { InjectionToken };

export type ServiceToken<T = any> = string | symbol | InjectionToken<T> | (new (...args: any[]) => T);

export class ServiceContainer {
  private static instance: ServiceContainer;
  private readonly inner = new Container();

  private constructor() {}

  static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  register<T>(token: ServiceToken<T>, implementation: T): void {
    this.inner.registerValue(token as any, implementation);
  }

  registerClass<T>(token: ServiceToken<T>, implementation: new (...args: any[]) => T): void {
    const meta: { scope?: Scope } | undefined = Reflect.getOwnMetadata(
      INJECTABLE_METADATA_KEY,
      implementation
    );
    const scope = meta?.scope ?? Scope.Singleton;
    this.inner.registerClass(token as any, implementation, scope);
  }

  registerFactory<T>(token: ServiceToken<T>, factory: () => T): void {
    this.inner.registerFactory(token as any, factory, Scope.Singleton);
  }

  resolve<T>(token: ServiceToken<T>): T {
    return this.inner.resolve(token as any);
  }

  resolveAll<T>(token: ServiceToken<T>): T[] {
    return this.inner.resolveAll(token as any);
  }

  has(token: ServiceToken): boolean {
    return this.inner.has(token as any);
  }

  clear(): void {
    this.inner.clear();
  }
}

export const di = ServiceContainer.getInstance();
