import { Scope, INJECTABLE_METADATA_KEY, type Token, type Provider, type ClassProvider } from './types.js';
import type { ProviderRegistry } from './provider-registry.js';
import { tokenKey } from './provider-registry.js';
import { scopeManager } from './scope-manager.js';
import { scanConstructorParams } from './metadata-scanner.js';
import { isForwardRef } from './forward-ref.js';

export class DependencyResolver {
  constructor(private readonly registry: ProviderRegistry) {}

  resolve<T>(token: Token<T>): T {
    return this.resolveInternal(token, new Set<unknown>());
  }

  async resolveAsync<T>(token: Token<T>): Promise<T> {
    return this.resolveInternalAsync(token, new Set<unknown>());
  }

  resolveAll<T>(token: Token<T>): T[] {
    return this.registry.getAll(token).map((p) => this.instantiateProvider(p, token, new Set()));
  }

  private resolveInternal<T>(token: Token<T>, stack: Set<unknown>): T {
    const actualToken = isForwardRef(token) ? (token as any).resolve() : token;
    const key = tokenKey(actualToken);

    if (!this.registry.has(actualToken)) {
      this.tryAutoRegister(actualToken);
    }

    if (!this.registry.has(actualToken)) {
      throw new Error(`No provider found for token: ${this.describeToken(actualToken)}`);
    }

    const provider = this.registry.get<T>(actualToken)!;

    const cached = this.checkCache<T>(key, provider);
    if (cached !== undefined) return cached;

    if (stack.has(key)) {
      const cycle = [...stack, key].map((k) => this.describeKey(k)).join(' → ');
      throw new Error(`Circular dependency detected: ${cycle}`);
    }

    stack.add(key);
    try {
      const instance = this.instantiateProvider(provider, actualToken, stack);
      this.cacheInstance(key, provider, instance);
      return instance;
    } finally {
      stack.delete(key);
    }
  }

  private async resolveInternalAsync<T>(token: Token<T>, stack: Set<unknown>): Promise<T> {
    const actualToken = isForwardRef(token) ? (token as any).resolve() : token;
    const key = tokenKey(actualToken);

    if (!this.registry.has(actualToken)) {
      this.tryAutoRegister(actualToken);
    }

    if (!this.registry.has(actualToken)) {
      throw new Error(`No provider found for token: ${this.describeToken(actualToken)}`);
    }

    const provider = this.registry.get<T>(actualToken)!;
    const cached = this.checkCache<T>(key, provider);
    if (cached !== undefined) return cached;

    if (stack.has(key)) {
      const cycle = [...stack, key].map((k) => this.describeKey(k)).join(' → ');
      throw new Error(`Circular dependency detected: ${cycle}`);
    }

    stack.add(key);
    try {
      const instance = await this.instantiateProviderAsync(provider, actualToken, stack);
      this.cacheInstance(key, provider, instance);
      return instance;
    } finally {
      stack.delete(key);
    }
  }

  private instantiateProvider<T>(
    provider: Provider<T>,
    token: Token<T>,
    stack: Set<unknown>
  ): T {
    const key = tokenKey(token);

    switch (provider.kind) {
      case 'value':
        return provider.value;

      case 'class': {
        const instance = this.instantiateClass(provider, stack);
        return instance;
      }

      case 'factory': {
        const result = provider.useFactory();
        if (result instanceof Promise) {
          throw new Error(
            `Factory for ${this.describeToken(token)} returned a Promise. ` +
            `Use resolveAsync() instead of resolve() for async providers.`
          );
        }
        return result as T;
      }
    }
  }

  private async instantiateProviderAsync<T>(
    provider: Provider<T>,
    token: Token<T>,
    stack: Set<unknown>
  ): Promise<T> {
    const key = tokenKey(token);

    switch (provider.kind) {
      case 'value':
        return provider.value;

      case 'class': {
        const instance = await this.instantiateClassAsync(provider, stack);
        return instance;
      }

      case 'factory': {
        const result = await provider.useFactory();
        return result;
      }
    }
  }

  private instantiateClass<T>(provider: ClassProvider<T>, stack: Set<unknown>): T {
    const cls = provider.useClass;
    const paramTokens = scanConstructorParams(cls);

    const args = paramTokens.map((paramToken) => {
      const resolvedToken = isForwardRef(paramToken) ? (paramToken as any).resolve() : paramToken;
      return this.resolveInternal(resolvedToken, stack);
    });

    return new cls(...args);
  }

  private async instantiateClassAsync<T>(
    provider: ClassProvider<T>,
    stack: Set<unknown>
  ): Promise<T> {
    const cls = provider.useClass;
    const paramTokens = scanConstructorParams(cls);

    const args = await Promise.all(
      paramTokens.map((paramToken) => {
        const resolvedToken = isForwardRef(paramToken) ? (paramToken as any).resolve() : paramToken;
        return this.resolveInternalAsync(resolvedToken, stack);
      })
    );

    return new cls(...args);
  }

  private checkCache<T>(key: unknown, provider: Provider<T>): T | undefined {
    if (provider.kind === 'value') return undefined;

    if (provider.kind === 'class' || provider.kind === 'factory') {
      if (provider.scope === Scope.Singleton && scopeManager.hasSingleton(key)) {
        return scopeManager.getSingleton<T>(key);
      }
      if (provider.scope === Scope.Scoped && scopeManager.hasScoped(key)) {
        return scopeManager.getScoped<T>(key);
      }
    }
    return undefined;
  }

  private cacheInstance(key: unknown, provider: Provider<unknown>, instance: unknown): void {
    if (provider.kind === 'value') return;

    if (provider.scope === Scope.Singleton) {
      scopeManager.setSingleton(key, instance);
    } else if (provider.scope === Scope.Scoped) {
      if (scopeManager.getCurrentScopeStore() !== undefined) {
        scopeManager.setScoped(key, instance);
      }
    }
  }

  private tryAutoRegister(token: Token): void {
    if (typeof token !== 'function') return;

    const meta: { scope?: Scope } | undefined = Reflect.getOwnMetadata(
      INJECTABLE_METADATA_KEY,
      token
    );

    if (meta === undefined) return;

    const scope = meta.scope ?? Scope.Singleton;

    this.registry.register(token, {
      kind: 'class',
      useClass: token as new (...args: any[]) => any,
      scope,
    });
  }

  private describeToken(token: Token): string {
    if (typeof token === 'function') return token.name || 'Function';
    if (typeof token === 'string' || typeof token === 'symbol') return String(token);
    return token.toString();
  }

  private describeKey(key: unknown): string {
    if (typeof key === 'function') return (key as Function).name || 'Function';
    if (typeof key === 'string' || typeof key === 'symbol') return String(key);
    return String(key);
  }
}
