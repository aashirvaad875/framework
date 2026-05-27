import type { Token, Provider } from './types.js';

export function tokenKey(token: Token): unknown {
  return token;
}

export class ProviderRegistry {
  private readonly registrations = new Map<unknown, Provider[]>();

  register<T>(token: Token<T>, provider: Provider<T>): void {
    const key = tokenKey(token);
    const existing = this.registrations.get(key);
    if (existing) {
      existing.push(provider);
    } else {
      this.registrations.set(key, [provider]);
    }
  }

  get<T>(token: Token<T>): Provider<T> | undefined {
    const key = tokenKey(token);
    const list = this.registrations.get(key);
    if (!list || list.length === 0) return undefined;
    return list[list.length - 1] as Provider<T>;
  }

  getAll<T>(token: Token<T>): Provider<T>[] {
    const key = tokenKey(token);
    return (this.registrations.get(key) as Provider<T>[]) ?? [];
  }

  has(token: Token): boolean {
    const key = tokenKey(token);
    const list = this.registrations.get(key);
    return list != null && list.length > 0;
  }

  clear(): void {
    this.registrations.clear();
  }
}
