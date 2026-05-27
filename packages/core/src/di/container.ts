import { Scope, type Token, type Provider } from './types.js';
import { ProviderRegistry } from './provider-registry.js';
import { DependencyResolver } from './dependency-resolver.js';
import { scopeManager } from './scope-manager.js';

export class Container {
  private readonly registry = new ProviderRegistry();
  private readonly resolver = new DependencyResolver(this.registry);

  registerValue<T>(token: Token<T>, value: T): void {
    this.registry.register(token, { kind: 'value', value });
  }

  registerClass<T>(
    token: Token<T>,
    cls: new (...args: any[]) => T,
    scope: Scope = Scope.Singleton
  ): void {
    this.registry.register(token, { kind: 'class', useClass: cls, scope });
  }

  registerFactory<T>(
    token: Token<T>,
    factory: () => T | Promise<T>,
    scope: Scope = Scope.Singleton
  ): void {
    this.registry.register(token, { kind: 'factory', useFactory: factory, scope });
  }

  resolve<T>(token: Token<T>): T {
    return this.resolver.resolve(token);
  }

  async resolveAsync<T>(token: Token<T>): Promise<T> {
    return this.resolver.resolveAsync(token);
  }

  resolveAll<T>(token: Token<T>): T[] {
    return this.resolver.resolveAll(token);
  }

  has(token: Token): boolean {
    return this.registry.has(token);
  }

  runInScope<T>(fn: () => T): T {
    return scopeManager.runInScope(fn);
  }

  clear(): void {
    this.registry.clear();
    scopeManager.clearSingletons();
  }
}

export const container = new Container();
