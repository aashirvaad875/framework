import { AsyncLocalStorage } from 'async_hooks';
import type { Token } from '../../di/types.js';

/**
 * ScopeStore represents the storage for a single scope
 */
type ScopeStore = Map<Token, unknown>;

/**
 * MemoizationCache provides request-scoped dependency injection provider caching.
 * Uses AsyncLocalStorage to maintain separate scopes for each async context.
 *
 * Features:
 * - Scope-isolated storage using AsyncLocalStorage
 * - Token-based key management for DI tokens
 * - Nested scope support with proper isolation
 * - Automatic scope creation and cleanup
 */
export class MemoizationCache {
  private asyncLocalStorage = new AsyncLocalStorage<ScopeStore>();

  /**
   * Get a value from the current scope by token.
   * Returns undefined if token is not found or no scope is active.
   */
  get(token: Token): unknown {
    const scope = this.asyncLocalStorage.getStore();
    if (!scope) {
      return undefined;
    }
    return scope.get(token);
  }

  /**
   * Set a value in the current scope.
   * Throws an error if called outside a scope.
   */
  set(token: Token, value: unknown): void {
    const scope = this.asyncLocalStorage.getStore();
    if (!scope) {
      throw new Error('Cannot set value outside of a scope. Use runInScope() first.');
    }
    scope.set(token, value);
  }

  /**
   * Check if a token exists in the current scope.
   * Returns false if no scope is active.
   */
  has(token: Token): boolean {
    const scope = this.asyncLocalStorage.getStore();
    if (!scope) {
      return false;
    }
    return scope.has(token);
  }

  /**
   * Run a callback function within a new isolated scope.
   * Each scope gets its own Map for storing values.
   * Nested scopes are properly isolated from parent scopes.
   */
  async runInScope<T>(fn: () => Promise<T>): Promise<T> {
    const scope: ScopeStore = new Map();
    return this.asyncLocalStorage.run(scope, fn);
  }

  /**
   * Get the current scope store if active.
   * Returns undefined if no scope is currently active.
   */
  getCurrentScope(): ScopeStore | undefined {
    return this.asyncLocalStorage.getStore();
  }

  /**
   * Clear all values in the current scope.
   * Throws an error if called outside a scope.
   */
  clear(): void {
    const scope = this.asyncLocalStorage.getStore();
    if (!scope) {
      throw new Error('Cannot clear outside of a scope. Use runInScope() first.');
    }
    scope.clear();
  }
}
