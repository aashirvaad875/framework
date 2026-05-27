import { container, InjectionToken } from 'tsyringe';

export type ServiceToken<T = any> = string | symbol | InjectionToken<T>;

export class ServiceContainer {
  private static instance: ServiceContainer;
  private localContainer = container;

  private constructor() {}

  static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  register<T>(token: ServiceToken<T>, implementation: T): void {
    this.localContainer.register(token, { useValue: implementation });
  }

  registerClass<T>(token: ServiceToken<T>, implementation: new (...args: any[]) => T): void {
    this.localContainer.register(token, { useClass: implementation });
  }

  registerFactory<T>(token: ServiceToken<T>, factory: () => T): void {
    this.localContainer.register(token, { useFactory: () => factory() });
  }

  resolve<T>(token: ServiceToken<T>): T {
    return this.localContainer.resolve(token);
  }

  resolveAll<T>(token: ServiceToken<T>): T[] {
    try {
      return this.localContainer.resolve<T[]>(token);
    } catch {
      return [];
    }
  }

  has(token: ServiceToken): boolean {
    try {
      this.localContainer.resolve(token);
      return true;
    } catch {
      return false;
    }
  }

  clear(): void {
    this.localContainer.clearInstances();
  }
}

export const di = ServiceContainer.getInstance();
