import { AsyncLocalStorage } from 'node:async_hooks';

export type ScopeStore = Map<unknown, unknown>;

export class ScopeManager {
  private readonly singletonCache = new Map<unknown, unknown>();
  private readonly als = new AsyncLocalStorage<ScopeStore>();

  hasSingleton(key: unknown): boolean {
    return this.singletonCache.has(key);
  }

  getSingleton<T>(key: unknown): T {
    return this.singletonCache.get(key) as T;
  }

  setSingleton(key: unknown, instance: unknown): void {
    this.singletonCache.set(key, instance);
  }

  getCurrentScopeStore(): ScopeStore | undefined {
    return this.als.getStore();
  }

  hasScoped(key: unknown): boolean {
    return this.als.getStore()?.has(key) ?? false;
  }

  getScoped<T>(key: unknown): T | undefined {
    return this.als.getStore()?.get(key) as T | undefined;
  }

  setScoped(key: unknown, instance: unknown): void {
    const store = this.als.getStore();
    if (!store) {
      throw new Error(
        'Attempted to store a Scoped instance outside of a request context. ' +
        'Ensure ScopeManager.runInScope() wraps request handling.'
      );
    }
    store.set(key, instance);
  }

  runInScope<T>(fn: () => T): T {
    const store: ScopeStore = new Map();
    return this.als.run(store, fn);
  }

  clearSingletons(): void {
    this.singletonCache.clear();
  }
}

export const scopeManager = new ScopeManager();
