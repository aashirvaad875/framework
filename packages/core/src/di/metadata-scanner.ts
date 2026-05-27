import type { Token } from './types.js';
import { INJECT_METADATA_KEY, PARAMTYPES_METADATA_KEY } from './types.js';

export function scanConstructorParams(cls: new (...args: any[]) => any): Token[] {
  const paramTypes: (Token | undefined)[] = Reflect.getMetadata(PARAMTYPES_METADATA_KEY, cls) ?? [];
  const injectOverrides: Record<number, Token> =
    Reflect.getOwnMetadata(INJECT_METADATA_KEY, cls) ?? {};

  return paramTypes.map((type, index) => {
    const override = injectOverrides[index];
    if (override !== undefined) return override;
    if (type == null) {
      throw new Error(
        `Cannot resolve parameter at index ${index} of ${cls.name}: ` +
        `design:paramtypes is missing. Did you forget to enable emitDecoratorMetadata in tsconfig?`
      );
    }
    return type;
  });
}

export function isForwardRefToken(token: Token): boolean {
  const ForwardRef = (token as any).constructor;
  return ForwardRef && ForwardRef.name === 'ForwardRef';
}
