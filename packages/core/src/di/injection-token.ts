export class InjectionToken<T = any> {
  declare _type: T;

  constructor(public readonly description: string) {}

  toString(): string {
    return `InjectionToken(${this.description})`;
  }
}

export function isInjectionToken(token: unknown): token is InjectionToken {
  return token instanceof InjectionToken;
}
