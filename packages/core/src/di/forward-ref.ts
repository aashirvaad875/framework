export type ForwardRefFn<T = any> = () => T;

export class ForwardRef<T = any> {
  constructor(private readonly fn: ForwardRefFn<T>) {}

  resolve(): T {
    return this.fn();
  }
}

export function forwardRef<T>(fn: ForwardRefFn<T>): ForwardRef<T> {
  return new ForwardRef(fn);
}

export function isForwardRef(value: unknown): value is ForwardRef {
  return value instanceof ForwardRef;
}
